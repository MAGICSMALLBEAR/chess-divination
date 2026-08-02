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
