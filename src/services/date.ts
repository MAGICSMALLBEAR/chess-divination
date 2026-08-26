// 本地日期工具
//
// 重要：本檔案存在的原因是 `new Date().toISOString().slice(0, 10)` 取得的是
// **UTC 日期**，不是使用者所在時區的日期。台灣為 UTC+8，因此：
//   - 每日運勢在當地 00:00–08:00 之間會顯示「前一天」的籤
//   - 連續使用天數會在錯誤的時間點換日，導致 streak 被誤判中斷
// 所有「日曆天」相關的判斷一律使用本檔案的函式，不要直接用 toISOString()。

/** 將 Date 轉為當地時區的 YYYY-MM-DD */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 當地今天的 YYYY-MM-DD */
export function todayString(): string {
  return toLocalDateString();
}

/**
 * 當地昨天的 YYYY-MM-DD
 * 使用 setDate 而非 Date.now() - 86400000，後者在有日光節約時間的時區會算錯。
 */
export function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

// ====== 時辰（地支） ======

/**
 * 當地日曆「本週」的起點（週一 00:00）。
 *
 * 統計頁的「本週／本月」原本是 `now - timestamp < 7 天` 的滾動視窗，
 * 與標籤講的不是同一件事：週一早上看「本週」，滾動視窗會把上週三、
 * 週四的占卜一起算進來，數字跟使用者心裡的「這週」對不起來。
 *
 * 以週一為界（ISO 8601）而非週日：中文語境的「本週」通常自週一起算，
 * 週報與行事曆也多是這個分界。
 */
export function startOfLocalWeek(date: Date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay() 週日為 0，換算成「距離本週一過了幾天」
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** 當地日曆「本月」的起點（一號 00:00） */
export function startOfLocalMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export const EARTHLY_BRANCHES = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const;

/**
 * 當下的時辰數（1–12，子時為 1）。
 *
 * 一個時辰兩小時，且子時橫跨半夜：23:00–00:59 為子時。
 * 梅花易數以「年月日時」起卦，時辰數是動爻的必要參數之一。
 */
export function hourBranchNumber(date: Date = new Date()): number {
  return Math.floor(((date.getHours() + 1) % 24) / 2) + 1;
}

/** 時辰名，如「午時」 */
export function hourBranchName(branchNumber: number): string {
  return `${EARTHLY_BRANCHES[branchNumber - 1]}時`;
}

// ====== 月建與季節（供六爻旺衰判斷） ======

/**
 * 月建的地支。正月建寅、二月建卯……十一月建子、十二月建丑。
 *
 * 月建以十二個「節」（立春、驚蟄……小寒）交接為界，而不是國曆每月一日。
 * 本檔以常用的二十四節氣年差近似式計算 1900–2100 年的交節日期，
 * 不需網路或第三方 API。它用於「日」級的月建判斷；若未來需要精確到
 * 交節當下的時分，才需換成天文曆或受信任的節氣資料表。
 */
const SOLAR_TERM_MINUTES = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758,
] as const;

const TROPICAL_YEAR_MS = 31556925974.7;
const SOLAR_TERM_BASE_UTC_MS = Date.UTC(1900, 0, 6, 2, 5);

interface MonthBoundary {
  term: string;
  termIndex: number;
  branch: number;
}

// 只有「節」交接會換月建；雨水、春分等中氣不換月建。
const MONTH_BOUNDARIES: readonly MonthBoundary[] = [
  { term: '小寒', termIndex: 0, branch: 2 },
  { term: '立春', termIndex: 2, branch: 3 },
  { term: '驚蟄', termIndex: 4, branch: 4 },
  { term: '清明', termIndex: 6, branch: 5 },
  { term: '立夏', termIndex: 8, branch: 6 },
  { term: '芒種', termIndex: 10, branch: 7 },
  { term: '小暑', termIndex: 12, branch: 8 },
  { term: '立秋', termIndex: 14, branch: 9 },
  { term: '白露', termIndex: 16, branch: 10 },
  { term: '寒露', termIndex: 18, branch: 11 },
  { term: '立冬', termIndex: 20, branch: 12 },
  { term: '大雪', termIndex: 22, branch: 1 },
];

/** 可供畫面說明目前月建從哪一節開始。 */
export interface MonthBranchContext {
  branch: number;
  term: string;
  /** 年份不在離線演算法可判範圍時會為 true。 */
  isFallback: boolean;
}

function solarTermCalendarDate(year: number, termIndex: number): Date {
  const estimate = new Date(
    SOLAR_TERM_BASE_UTC_MS
      + TROPICAL_YEAR_MS * (year - 1900)
      + SOLAR_TERM_MINUTES[termIndex] * 60_000,
  );
  // 演算法的日界以 UTC 日曆欄位表示，將它轉成本地日曆日期，避免時區改變月建。
  return new Date(year, estimate.getUTCMonth(), estimate.getUTCDate());
}

/** 取得以節氣切換後的月建與交節名。 */
export function monthBranchContext(date: Date = new Date()): MonthBranchContext {
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return {
      branch: ((date.getMonth() + 1) % 12) + 1,
      term: '國曆月近似',
      isFallback: true,
    };
  }

  const calendarDate = new Date(year, date.getMonth(), date.getDate());
  let current: MonthBoundary = MONTH_BOUNDARIES[MONTH_BOUNDARIES.length - 1];
  for (const boundary of MONTH_BOUNDARIES) {
    if (calendarDate >= solarTermCalendarDate(year, boundary.termIndex)) current = boundary;
    else break;
  }
  return { branch: current.branch, term: current.term, isFallback: false };
}

export function monthBranchNumber(date: Date = new Date()): number {
  return monthBranchContext(date).branch;
}

/** 月建名，如「寅月」 */
export function monthBranchName(branchNumber: number): string {
  return `${EARTHLY_BRANCHES[branchNumber - 1]}月`;
}

/** 四季與四季末的土旺月（辰未戌丑）*/
export type Season = '春' | '夏' | '秋' | '冬' | '土旺';

/**
 * 由月建判季節。
 *
 * 寅卯為春、巳午為夏、申酉為秋、亥子為冬，
 * 辰未戌丑（四季之末各十八日）為「土旺」，五行以土當令。
 * 這是五行旺衰的傳統分法——土不獨占一季，而是寄旺於四季之末。
 */
export function seasonOf(monthBranch: number): Season {
  switch (monthBranch) {
    case 3: case 4: return '春';   // 寅 卯
    case 6: case 7: return '夏';   // 巳 午
    case 9: case 10: return '秋';  // 申 酉
    case 12: case 1: return '冬';  // 亥 子
    default: return '土旺';         // 辰(5) 未(8) 戌(11) 丑(2)
  }
}

/** 當令五行：春木、夏火、秋金、冬水、四季末土 */
export const SEASON_ELEMENT: Readonly<Record<Season, string>> = {
  春: '木', 夏: '火', 秋: '金', 冬: '水', 土旺: '土',
};
