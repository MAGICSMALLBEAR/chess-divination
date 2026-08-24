// 端點層的請求頻率限制，由 api/ 下的 serverless function 共用。
//
// 誠實的邊界：Vercel 每個 serverless 實例各有自己的記憶體、實例又會水平擴充，
// 所以這是「每實例盡力而為」而非全域精確限流。用途是擋掉單一來源的重複點擊與
// 失控迴圈（AI 端點每次呼叫都要付模型費、同步端點每次都寫 Redis），不是防禦
// 分散式攻擊——那需要把計數放進外部儲存，是另一個量級的工程。
//
// 原本 api/interpret.ts 內嵌的版本有個長期缺陷：計數表每遇到一個新來源就新增
// 一筆且永不刪除。暖實例服務過的來源愈多、常駐記憶體愈大，而過期的紀錄早已
// 沒有意義。這裡在表過大時清掉視窗外的項目，讓佔用有上界。

/** 取請求來源識別。Vercel 會設 x-forwarded-for，第一段才是原始客戶端。 */
export function clientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimiter {
  /** true 表示這次請求超出限制，呼叫端應回 429 */
  (request: Request): boolean;
  /** 測試用：模組層狀態會跨測試累積，每個測試前清空才不會互相影響 */
  reset(): void;
  /** 測試用：目前追蹤的來源數，用來驗證清理確實發生 */
  size(): number;
}

export function createRateLimiter(options: {
  max: number;
  windowMs: number;
  /** 超過此來源數就觸發清理；預設值遠高於單一實例的正常併發量 */
  maxClients?: number;
}): RateLimiter {
  const { max, windowMs, maxClients = 10_000 } = options;
  const hits = new Map<string, number[]>();

  /**
   * 先清掉整個視窗內都沒有動靜的來源——那些紀錄已不影響任何判斷。
   * 若清完仍超量（大量來源在同一視窗內湧入），再由最舊的開始丟；
   * 被丟的來源下次呼叫等同重新計數，這是刻意的取捨：寧可少擋幾次，
   * 也不讓記憶體無上界成長。Map 保有插入順序，迭代即由舊到新。
   */
  function sweep(now: number): void {
    for (const [id, times] of hits) {
      const last = times[times.length - 1];
      if (last === undefined || now - last >= windowMs) hits.delete(id);
    }
    if (hits.size <= maxClients) return;
    for (const id of hits.keys()) {
      if (hits.size <= maxClients) break;
      hits.delete(id);
    }
  }

  const limiter = ((request: Request): boolean => {
    const now = Date.now();
    if (hits.size > maxClients) sweep(now);

    const id = clientId(request);
    const recent = (hits.get(id) || []).filter(time => now - time < windowMs);

    if (recent.length >= max) {
      // 超限期間不再累加，否則持續重試會把視窗無限往後推成永久封鎖
      hits.set(id, recent);
      return true;
    }
    hits.set(id, [...recent, now]);
    return false;
  }) as RateLimiter;

  limiter.reset = () => hits.clear();
  limiter.size = () => hits.size;
  return limiter;
}

/**
 * 請求內容的實際位元組數。
 *
 * 不用 `raw.length`：那是 UTF-16 code unit 數，而這個 App 傳的是中文籤詩，
 * 一個漢字佔 3 個 UTF-8 位元組——用字數判斷會讓上限實際放寬到約三倍。
 */
export function byteLength(raw: string): number {
  return new TextEncoder().encode(raw).length;
}
