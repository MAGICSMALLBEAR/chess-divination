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

/** 使用者可選的等待天數。固定選項而非自訂：自訂要處理 0 天與負數，使用者要的只是早一點或晚一點 */
export const VERIFY_REMINDER_CHOICES = [7, 14, 30] as const;

/** 設定值 0 = 關閉提醒（存進設定的是數字，而不是另開一個布林） */
export const VERIFY_REMINDER_OFF = 0;

export interface VerifyReminderPolicy {
  /** 關閉時不發通知、首頁也不顯示待回填提示（統計頁的筆數不受影響，見 verifyReminderPolicy） */
  enabled: boolean;
  /** 滿幾天算「該回填」。通知、首頁提示與統計頁筆數都用這個數字 */
  days: number;
}

/**
 * 把設定裡存的值解析成提醒政策。
 *
 * 通知排程、首頁提示、統計頁筆數三個地方都問同一個問題——「滿幾天算該回填」，
 * 所以答案只在這裡算一次；各自讀設定各自判斷，就是 S58 抓過的那一種：
 * 常數自稱真相來源、實際發提醒的地方卻自己寫一份。
 *
 * 不認得的值（備份或雲端帶進來的舊資料、手改的檔案）一律退回預設而非關閉：
 * 靜靜把提醒關掉，比用預設天數多提醒一次更難被發現。
 *
 * 關閉時 days 仍給預設值：統計頁那一行是使用者主動點開才看得到的資訊，
 * 不是打擾，關掉「提醒」不該讓它跟著出錯或消失。
 */
export function verifyReminderPolicy(setting: unknown): VerifyReminderPolicy {
  if (setting === VERIFY_REMINDER_OFF) return { enabled: false, days: VERIFY_REMINDER_DAYS };
  const known = (VERIFY_REMINDER_CHOICES as readonly unknown[]).includes(setting);
  return { enabled: true, days: known ? (setting as number) : VERIFY_REMINDER_DAYS };
}

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

/**
 * 一組分項統計要有幾筆已回填，才值得拿來下結論。
 *
 * 這個數字原本只存在於 `bestCategory()` 的預設參數裡——**同一個 App 因此
 * 一邊說「少於 5 筆不算數」（個人洞察算不出來就不顯示），一邊把一筆 100%
 * 的分組排在二十筆 85% 的上面**（分項列表只依應驗率排序）。判準是對的，
 * 只是沒有套到所有用得上它的地方。
 *
 * 五筆不是統計學上的門檻，是這個 App 的保守下限：低於它，一次回填就能
 * 把比率推移 20 個百分點以上，那個數字講的是巧合而不是傾向。
 */
export const MIN_INSIGHT_SAMPLES = 5;

/** 依某個維度分組的應驗統計 */
export interface AccuracyBreakdown {
  key: string;
  label: string;
  stats: AccuracyStats;
  /**
   * 樣本是否足以下結論（`stats.verified >= MIN_INSIGHT_SAMPLES`）。
   *
   * 由服務層算好而不是讓畫面自己比：畫面自己比就等於把同一條規則再抄一份，
   * 日後改門檻會有一邊沒跟上——這正是 S60 那個「十二份重複、零個真相來源」
   * 的病。
   */
  enoughSamples: boolean;
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
    .map(([key, rs]) => {
      const stats = computeAccuracy(rs);
      return {
        key, label: labelOf(key), stats,
        enoughSamples: stats.verified >= MIN_INSIGHT_SAMPLES,
      };
    })
    // 只列出有回填資料的組
    .filter(b => b.stats.verified > 0)
    // 樣本足夠的先排，其次才是樣本不足的；各自再以應驗率高者在前、
    // 同率則樣本多者在前。
    //
    // 為什麼排序要認門檻：排序本身就是一種宣稱。只依應驗率排，
    // 一筆全中的分組會坐在第一列，而畫面上「第一列」的意思就是
    // 「你在這方面最準」——那句話不該由一次巧合說出口。
    .sort((a, b) =>
      Number(b.enoughSamples) - Number(a.enoughSamples)
      || (b.stats.rate ?? 0) - (a.stats.rate ?? 0)
      || b.stats.verified - a.stats.verified,
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
 *
 * 匯出給「同一件事」的並列比較（related.ts）共用：那裡同樣要在備份還原可能帶進
 * 越界或損毀卦象資料的前提下重算卦例，範圍檢查只該有一份。timestamp 也要有限——
 * 無效日期會讓月建與旬空的查表拿到 undefined（reveal.tsx 同一個理由）。
 */
export function readingForRecord(record: DivinationRecord) {
  if (
    (record.engineVersion ?? 1) < 2 ||
    record.hexagramIndex === undefined || record.movingLine === undefined ||
    record.hexagramIndex < 0 || record.hexagramIndex > 63 ||
    record.movingLine < 1 || record.movingLine > 6 ||
    !Number.isFinite(record.timestamp)
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
  minSamples: number = MIN_INSIGHT_SAMPLES,
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

// ====== 應驗率趨勢 ======

export interface AccuracyTrendPoint {
  /** 走到第 n 筆已回填的占卜（依占卜時間排列，從 1 起算） */
  n: number;
  /** 以第 n 筆為終點、往前 window 筆的加權應驗率 0–100 */
  rate: number;
}

export interface AccuracyTrend {
  /** 每個點涵蓋幾筆。沿用 MIN_INSIGHT_SAMPLES——「幾筆才算數」只該有一個答案 */
  window: number;
  /** 已回填、且狀態值合法的筆數 */
  verified: number;
  /** 解鎖趨勢所需的已回填筆數：兩個視窗量，否則第一個點與最後一個點是同一批樣本 */
  needed: number;
  /** 還差幾筆，已解鎖為 0 */
  remaining: number;
  /** 不足 needed 筆時為空陣列，畫面改顯示「還差幾筆」而不是一條只有雜訊的線 */
  points: AccuracyTrendPoint[];
}

/**
 * 「我用越久，準確率是變好還是變差」——分項應驗率答不了這題，
 * 它們都是固定維度的分組，沒有時間軸。
 *
 * 排序依**占卜時間**而不是回填時間：問的是「這個人判得越來越準嗎」，
 * 而回填常常是隔了一陣子一口氣補完，依回填時間排會把同一天補的十筆
 * 排成一團，與占卜的先後無關。
 *
 * X 軸用「第 N 筆」而不是日曆時間：App 上線才一個多月，按日曆分段會太稀疏，
 * 而且使用者關心的是「驗證的次數多了以後」，不是「過了幾週」。
 *
 * 滑動視窗每次前進一筆，每點的計算直接重用 computeAccuracy——
 * 部分應驗計半分等規則因此與統計頁其他地方完全一致，沒有第二套算法。
 *
 * 誠實邊界：視窗只有 5 筆時，一筆的差別就是 10–20 個百分點，起伏大半是雜訊。
 * 這個函式只給資料，不下「變準了」「變差了」的結論；畫面上要如實附上這句提醒。
 */
export function accuracyTrend(
  records: DivinationRecord[],
  window: number = MIN_INSIGHT_SAMPLES,
): AccuracyTrend {
  const verified = records
    .filter(r => r.outcome !== undefined && r.outcome.status in OUTCOME_WEIGHT)
    // 同一毫秒的兩筆以 id 定序，讓結果不隨輸入順序而變
    .sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const needed = window * 2;
  const points: AccuracyTrendPoint[] = [];
  if (verified.length >= needed) {
    for (let end = window; end <= verified.length; end++) {
      const rate = computeAccuracy(verified.slice(end - window, end)).rate;
      // 視窗內全是已回填，rate 不會是 null；留著判斷是給型別看的
      if (rate !== null) points.push({ n: end, rate });
    }
  }

  return {
    window,
    verified: verified.length,
    needed,
    remaining: Math.max(0, needed - verified.length),
    points,
  };
}
