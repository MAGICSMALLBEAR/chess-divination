// 占驗簿 — 事後回填實際結果，並據以統計個人應驗率
//
// 為什麼需要這個服務：
// App 至今記了最多 500 次占卜，卻完全不知道哪一次準過。
// 傳統易占的基本功就是「占驗簿」——占完記下所斷，事後回填實際結果，
// 累積數十則之後才看得出自己在哪一類問題上判得準、哪一類老是失手。
// 少了這一步，占卜就只是每次重新開始，沒有任何回饋可言。
//
// 統計刻意只算「已回填」的記錄。未驗的不計入分母：
// 把沒驗過的當成「不準」會讓應驗率隨占卜次數單調下降，
// 那個數字反映的是回填勤勞度，不是準確度。

import type {
  DivinationRecord, DivinationOutcome, OutcomeStatus,
} from './storage';
import { trigramsFromIndex } from './hexagram';
import { buildLiuYaoReading } from './liuyao';
import { SPREADS, type SpreadId } from './spreads';
import { questionCategoryDomain } from './questionCategories';

// ====== 常數 ======

export const OUTCOME_STATUSES: readonly OutcomeStatus[] = [
  'accurate', 'partial', 'inaccurate',
] as const;

export const OUTCOME_LABELS: Readonly<Record<OutcomeStatus, string>> = {
  accurate: '應驗',
  partial: '部分應驗',
  inaccurate: '未應驗',
};

/**
 * 各狀態的計分權重，用於加權應驗率。
 * 「部分應驗」給半分而非滿分或零分——占卜的斷語多為方向性的，
 * 全有全無的計法會把大多數真實結果硬塞進兩個極端。
 */
const OUTCOME_WEIGHT: Readonly<Record<OutcomeStatus, number>> = {
  accurate: 1,
  partial: 0.5,
  inaccurate: 0,
};

/**
 * 建議回填的等待天數。
 * 太早問結果還沒出來，太晚使用者已經忘了自己問過什麼。
 */
export const VERIFY_REMINDER_DAYS = 14;

// ====== 型別 ======

export interface AccuracyStats {
  /** 已回填的筆數（統計的分母） */
  verified: number;
  /** 尚未回填的筆數 */
  unverified: number;
  accurate: number;
  partial: number;
  inaccurate: number;
  /**
   * 加權應驗率 0–100。部分應驗計半分。
   * 沒有任何已回填記錄時為 null，而非 0——
   * 「還沒有資料」和「驗過但全不準」不該顯示成同一個數字。
   */
  rate: number | null;
}

/** 依某個維度分組的應驗統計 */
export interface AccuracyBreakdown {
  key: string;
  label: string;
  stats: AccuracyStats;
}

// ====== 基本判定 ======

export function isVerified(record: DivinationRecord): boolean {
  return record.outcome !== undefined;
}

/** 占卜至今經過的天數（無條件捨去） */
export function daysSince(timestamp: number, now: number = Date.now()): number {
  return Math.floor((now - timestamp) / 86_400_000);
}

/**
 * 適合提醒使用者回填的記錄：尚未回填、且已過建議等待天數。
 * 由近而遠排序——剛滿期的事使用者記得最清楚，回填品質最高。
 */
export function pendingVerification(
  records: DivinationRecord[],
  now: number = Date.now(),
  minDays: number = VERIFY_REMINDER_DAYS,
): DivinationRecord[] {
  return records
    .filter(r => !isVerified(r) && daysSince(r.timestamp, now) >= minDays)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// ====== 統計 ======

export function computeAccuracy(records: DivinationRecord[]): AccuracyStats {
  const counts: Record<OutcomeStatus, number> = {
    accurate: 0, partial: 0, inaccurate: 0,
  };
  let verified = 0;
  let unverified = 0;
  let score = 0;

  for (const r of records) {
    const status = r.outcome?.status;
    // 防禦儲存中的舊資料或手動匯入的檔案帶了不認得的狀態值
    if (status === undefined || !(status in counts)) {
      unverified++;
      continue;
    }
    counts[status]++;
    verified++;
    score += OUTCOME_WEIGHT[status];
  }

  return {
    verified,
    unverified,
    ...counts,
    rate: verified === 0 ? null : Math.round((score / verified) * 100),
  };
}

/**
 * 依任意維度分組統計應驗率。
 *
 * `groupBy` 回傳 null 代表該筆不屬於任何組（例如舊記錄沒有體用資料），
 * 直接略過而非歸入「其他」——湊出來的那一組不具解讀價值。
 */
export function breakdownBy(
  records: DivinationRecord[],
  groupBy: (r: DivinationRecord) => string | null,
  labelOf: (key: string) => string = k => k,
): AccuracyBreakdown[] {
  const groups = new Map<string, DivinationRecord[]>();

  for (const r of records) {
    const key = groupBy(r);
    if (key === null) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  return [...groups.entries()]
    .map(([key, rs]) => ({ key, label: labelOf(key), stats: computeAccuracy(rs) }))
    // 只列出有回填資料的組，並以應驗率高者在前；同率則以樣本多者在前
    .filter(b => b.stats.verified > 0)
    .sort((a, b) =>
      (b.stats.rate ?? 0) - (a.stats.rate ?? 0) || b.stats.verified - a.stats.verified,
    );
}

/** 依籤詩吉凶等級分組 */
export function accuracyByLevel(records: DivinationRecord[]): AccuracyBreakdown[] {
  return breakdownBy(records, r => r.poemLevel || null);
}

const CATEGORY_LABELS: Record<string, string> = {
  marriage: '感情', wealth: '財運', career: '事業', health: '健康',
  study: '學業', travel: '出行', general: '綜合',
};

/**
 * 依所問類別分組。子領域先映回主類別再分組。
 *
 * 「求職」與「升遷」若各自成列，同一件事會被切成好幾組薄樣本，
 * 而且會與子領域上線前記的「事業」分立兩列——同一個人生面向散在
 * 兩處，「哪類問事最準」就再也湊不到 `bestCategory` 要求的樣本數。
 * 自訂類別的 key 不在映射表內，原樣自成一組。
 *
 * `labelOf` 可由呼叫端注入以取得譯文——本模組是純統計，
 * 不引入 i18n：它被大量測試直接呼叫，讓結果隨全域語言狀態而變
 * 會使測試相依於執行順序。預設值維持 zh-TW，故舊呼叫端行為不變。
 */
export function accuracyByCategory(
  records: DivinationRecord[],
  labelOf: (key: string) => string = k => CATEGORY_LABELS[k] ?? k,
): AccuracyBreakdown[] {
  return breakdownBy(
    records,
    r => (r.questionCategory ? questionCategoryDomain(r.questionCategory) : null),
    labelOf,
  );
}

/** 依占卜模式分組。`labelOf` 同上，可注入譯文 */
const MODE_LABELS: Record<string, string> = {
  draw: '抽棋', board: '棋盤', lingqi: '靈棋',
};

/**
 * 依占卜模式分組。
 *
 * 預設標籤原本是 `k === 'draw' ? '抽棋' : '棋盤'`——那個式子會把任何新模式
 * 默默標成「棋盤」，靈棋加進來時就是這樣。改成對照表，認不得的鍵回傳原鍵，
 * 標成一個看得出不對的值，而不是冒充另一個模式。
 *
 * `labelOf` 可由呼叫端注入以取得譯文，理由同 accuracyByCategory：
 * 本模組是純統計，不引入 i18n。
 */
export function accuracyByMode(
  records: DivinationRecord[],
  labelOf: (key: string) => string = k => MODE_LABELS[k] ?? k,
): AccuracyBreakdown[] {
  return breakdownBy(records, r => r.mode || null, labelOf);
}

/**
 * 依固定牌陣分組。自由佈局與舊記錄不放進此表：它們沒有可比較的角色結構，
 * 混入會把「哪一個牌陣適合自己」稀釋成無意義的總平均。
 */
export function accuracyBySpread(
  records: DivinationRecord[],
  labelOf: (key: SpreadId) => string = key => SPREADS[key].name,
): AccuracyBreakdown[] {
  return breakdownBy(
    records,
    record => record.spreadId && record.spreadId !== 'free' ? record.spreadId : null,
    key => labelOf(key as SpreadId),
  );
}

/**
 * 還原歷史記錄的六爻讀法。v1 或缺少卦象資料的舊記錄直接略過，
 * 不能拿錯卦序的資料來檢驗新引擎。
 */
function readingForRecord(record: DivinationRecord) {
  if (
    (record.engineVersion ?? 1) < 2 ||
    record.hexagramIndex === undefined || record.movingLine === undefined ||
    record.hexagramIndex < 0 || record.hexagramIndex > 63 ||
    record.movingLine < 1 || record.movingLine > 6
  ) return null;

  const [upper, lower] = trigramsFromIndex(record.hexagramIndex);
  return buildLiuYaoReading(upper, lower, record.movingLine, new Date(record.timestamp));
}

/** 依體用生剋分組，檢驗「用生體／用剋體」等判斷在個人記錄中的表現。 */
export function accuracyByBodyUse(records: DivinationRecord[]): AccuracyBreakdown[] {
  return breakdownBy(records, record => readingForRecord(record)?.bodyUse.relation ?? null);
}

/** 依動爻位置分組，找出哪一個變化階段的判讀最穩定。 */
export function accuracyByMovingLine(
  records: DivinationRecord[],
  labelOf: (key: string) => string = key => `第${key}爻`,
): AccuracyBreakdown[] {
  return breakdownBy(
    records,
    record => {
      const line = readingForRecord(record)?.movingLine;
      return line ? String(line) : null;
    },
    labelOf,
  );
}

/** 依起卦時的季令分組，檢驗旺相休囚死所依據的時令條件。 */
export function accuracyBySeason(
  records: DivinationRecord[],
  labelOf: (key: string) => string = key => key,
): AccuracyBreakdown[] {
  return breakdownBy(records, record => readingForRecord(record)?.strength.season ?? null, labelOf);
}

/**
 * 從已回填的記錄中，找出應驗率最高且樣本足夠的一組，作為個人洞察。
 * 樣本不足時回 null——三筆全中就宣告「你問感情特別準」是拿雜訊當訊號。
 */
export function bestCategory(
  records: DivinationRecord[],
  minSamples: number = 5,
  labelOf?: (key: string) => string,
): AccuracyBreakdown | null {
  const eligible = accuracyByCategory(records, labelOf).filter(b => b.stats.verified >= minSamples);
  return eligible[0] ?? null;
}

/**
 * 回填後距離占卜當時的天數中位數，反映使用者多久才回頭驗證。
 *
 * 負值一律夾到 0：verifiedAt 早於 timestamp 只可能來自時鐘變動、
 * 跨時區搬機或手改過的備份，不是真的「在占卜前就驗證了」。
 * 不夾的話統計頁會顯示「-3 天」——一個沒有意義而且看起來像壞掉的數字。
 */
export function medianVerifyDelay(records: DivinationRecord[]): number | null {
  const delays = records
    .filter((r): r is DivinationRecord & { outcome: DivinationOutcome } => isVerified(r))
    .map(r => Math.max(0, daysSince(r.timestamp, r.outcome.verifiedAt)))
    .sort((a, b) => a - b);

  if (delays.length === 0) return null;
  const mid = Math.floor(delays.length / 2);
  return delays.length % 2 === 0 ? Math.round((delays[mid - 1] + delays[mid]) / 2) : delays[mid];
}
