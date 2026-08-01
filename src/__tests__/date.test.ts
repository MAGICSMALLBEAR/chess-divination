import { toLocalDateString, todayString, yesterdayString } from '../services/date';

describe('本地日期', () => {
  test('should format a date with local calendar components', () => {
    expect(toLocalDateString(new Date(2026, 2, 15, 12, 0, 0))).toBe('2026-03-15');
    expect(toLocalDateString(new Date(2026, 11, 1, 12, 0, 0))).toBe('2026-12-01');
  });

  /**
   * 迴歸：舊版用 toISOString() 取 UTC 日期。
   * 於 UTC+n 時區，當地凌晨會被算成前一天（台灣 00:00–08:00 顯示前一日運勢）；
   * 於 UTC-n 時區，當地深夜會被算成隔天。以下兩個邊界各自涵蓋一種情況。
   */
  test('should not fall back to the UTC calendar date', () => {
    // 當地凌晨——在 UTC+n 會被 toISOString 算成前一天
    expect(toLocalDateString(new Date(2026, 2, 15, 0, 30, 0))).toBe('2026-03-15');
    // 當地深夜——在 UTC-n 會被 toISOString 算成隔天
    expect(toLocalDateString(new Date(2026, 2, 15, 23, 30, 0))).toBe('2026-03-15');
  });

  test('todayString should match toLocalDateString(now)', () => {
    expect(todayString()).toBe(toLocalDateString(new Date()));
  });

  test('yesterdayString should be exactly one calendar day before today', () => {
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    expect(yesterdayString()).toBe(toLocalDateString(expected));
    expect(yesterdayString()).not.toBe(todayString());
  });
});
