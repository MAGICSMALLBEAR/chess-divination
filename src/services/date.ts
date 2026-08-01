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
