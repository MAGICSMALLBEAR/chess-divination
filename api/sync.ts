// Upstash Redis backed cloud-sync endpoint. Connect Redis in Vercel Marketplace.
import { byteLength, createRateLimiter } from '../src/services/rateLimit';

// 雲端那份存的是兩台裝置的聯集（CLOUD_HISTORY_LIMIT = 1000 筆，
// 單筆實測約 440–610 bytes），512KB 會讓滿載的使用者一同步就撞 413。
// 1MB 容得下聯集，也仍在 Upstash REST 單次請求的限制之內。
const MAX_BODY_BYTES = 1024 * 1024;

// 配對碼本身就是憑證，但**任何**格式正確的 48 位十六進位字串都能寫入一組新的
// key——不需要猜中既有配對碼，隨機產一個就能存 512KB。沒有限流時，單一來源
// 可無上限地灌 Redis。一次 syncWithCloud() 是 GET + PUT 兩次請求，
// 20 次／分鐘等於每分鐘 10 輪同步，遠高於正常使用。
const limited = createRateLimiter({ max: 20, windowMs: 60_000 });
const TOO_MANY = () => Response.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } });

async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function syncKey(request: Request): string | null {
  const key = request.headers.get('x-sync-key')?.trim().toLowerCase() || '';
  return /^[a-f0-9]{48}$/.test(key) ? key : null;
}
// 讀或寫由 value 是否給定決定；不另外傳 command，避免出現與實際行為不符的參數。
//
// 回傳分三種：env 變數缺漏（'not-configured'，我們自己判定的）與
// 呼叫 Upstash 失敗（'upstream-error'，對方回的任意狀態碼或連線本身出錯）
// 必須分開——兩者若都直接轉發成同一個狀態碼，使用者已經接上資料庫、
// 只是接錯（URL/Token 打錯、選錯區域）時，會被導回「請去設定環境變數」
// 這句已經不成立的說明，跟 S62 修過的那種誤導文案是同一種病。
type KvResult =
  | { kind: 'not-configured' }
  | { kind: 'ok'; response: Response }
  | { kind: 'upstream-error'; status: number };
async function kv(key: string, value?: unknown): Promise<KvResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return { kind: 'not-configured' };
  const endpoint = value === undefined ? `${url}/get/${key}` : `${url}/set/${key}`;
  try {
    const response = await fetch(endpoint, { method: value === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value) });
    if (!response.ok) return { kind: 'upstream-error', status: response.status };
    return { kind: 'ok', response };
  } catch (e) {
    console.error('雲端同步連線失敗:', e);
    return { kind: 'upstream-error', status: 0 };
  }
}
// 統一轉成固定的 502，不透傳 Upstash 原始狀態碼——後者可能剛好撞上我們
// 自己判定「未設定」用的 501，讓兩種完全不同的失敗在客戶端看起來一樣。
function upstreamError(status: number): Response {
  console.error(`雲端同步上游錯誤：Upstash 回傳 ${status}`);
  return Response.json({ error: 'SYNC_UPSTREAM_ERROR' }, { status: 502 });
}
export async function GET(request: Request): Promise<Response> {
  if (limited(request)) return TOO_MANY();
  const rawKey = syncKey(request); if (!rawKey) return Response.json({ error: 'INVALID_SYNC_KEY' }, { status: 401 });
  const result = await kv(`sync:${await hash(rawKey)}`);
  if (result.kind === 'not-configured') return Response.json({ error: 'SYNC_NOT_CONFIGURED' }, { status: 501 });
  if (result.kind === 'upstream-error') return upstreamError(result.status);
  const body = await result.response.json();
  if (!body?.result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  // Upstash 的 /get 回傳 {result: "<原樣存入的字串>"}，result 是字串而非物件。
  // 直接 Response.json(body.result) 會把 JSON 再包一層字串，客戶端 r.json()
  // 拿到的是 string，isCloudPayload() 必然為 false——上傳看似成功，下載永遠回 null。
  let parsed: unknown;
  try {
    parsed = typeof body.result === 'string' ? JSON.parse(body.result) : body.result;
  } catch {
    return Response.json({ error: 'CORRUPT_PAYLOAD' }, { status: 502 });
  }
  return Response.json(parsed);
}
export async function PUT(request: Request): Promise<Response> {
  if (limited(request)) return TOO_MANY();
  const rawKey = syncKey(request); if (!rawKey) return Response.json({ error: 'INVALID_SYNC_KEY' }, { status: 401 });
  const raw = await request.text();
  if (byteLength(raw) > MAX_BODY_BYTES) {
    return Response.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let data: unknown; try { data = JSON.parse(raw); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!data || typeof data !== 'object') return Response.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  const result = await kv(`sync:${await hash(rawKey)}`, data);
  if (result.kind === 'not-configured') return Response.json({ error: 'SYNC_NOT_CONFIGURED' }, { status: 501 });
  if (result.kind === 'upstream-error') return upstreamError(result.status);
  return Response.json({ ok: true });
}
