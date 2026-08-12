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
 * 嚴格的月建以節氣交接為界（立春才入寅月，非國曆 2/1），
 * 精確判定需要每年的節氣時刻表。此處以國曆月份近似，
 * 誤差最多在月初數日之內——對「旺相休囚死」這種五級粗判影響有限，
 * 而換取的是零外部資料、可離線、可測試。
 * 若日後要精確化，只需改寫本函式，下游的旺衰邏輯不必動。
 */
export function monthBranchNumber(date: Date = new Date()): number {
  // getMonth() 0=一月。國曆一月建丑(2)、二月建寅(3)…十二月建子(1)
  return ((date.getMonth() + 1) % 12) + 1;
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
