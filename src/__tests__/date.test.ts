import {
  toLocalDateString, todayString, yesterdayString,
  monthBranchNumber, monthBranchName, seasonOf, SEASON_ELEMENT,
  EARTHLY_BRANCHES,
} from '../services/date';

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

// ── 月建與季節（六爻旺衰的輸入） ──

describe('月建', () => {
  /** 以「國曆 n 月」建立一個日期，日與時固定在月中避免邊界干擾 */
  const inMonth = (m: number) => new Date(2026, m - 1, 15, 12, 0, 0);

  test('正月建寅、二月建卯，依序推至十二月建丑', () => {
    // 地支序 1子 2丑 3寅 4卯 5辰 6巳 7午 8未 9申 10酉 11戌 12亥
    const expected: Record<number, number> = {
      1: 2,   // 一月 → 丑
      2: 3,   // 二月 → 寅
      3: 4,   // 三月 → 卯
      6: 7,   // 六月 → 午
      11: 12, // 十一月 → 亥
      12: 1,  // 十二月 → 子
    };
    for (const [month, branch] of Object.entries(expected)) {
      expect(monthBranchNumber(inMonth(Number(month)))).toBe(branch);
    }
  });

  test('十二個月剛好對到十二個相異地支', () => {
    const branches = Array.from({ length: 12 }, (_, i) => monthBranchNumber(inMonth(i + 1)));
    expect(new Set(branches).size).toBe(12);
    expect([...branches].sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  });

  test('月建數皆落在 1–12 之內', () => {
    for (let m = 1; m <= 12; m++) {
      const n = monthBranchNumber(inMonth(m));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(12);
    }
  });

  test('monthBranchName 回傳對應地支加「月」', () => {
    expect(monthBranchName(3)).toBe('寅月');
    expect(monthBranchName(1)).toBe('子月');
    expect(monthBranchName(12)).toBe('亥月');
    for (let n = 1; n <= 12; n++) {
      expect(monthBranchName(n)).toBe(`${EARTHLY_BRANCHES[n - 1]}月`);
    }
  });
});

describe('季節與當令五行', () => {
  test('寅卯春、巳午夏、申酉秋、亥子冬', () => {
    expect(seasonOf(3)).toBe('春');  // 寅
    expect(seasonOf(4)).toBe('春');  // 卯
    expect(seasonOf(6)).toBe('夏');  // 巳
    expect(seasonOf(7)).toBe('夏');  // 午
    expect(seasonOf(9)).toBe('秋');  // 申
    expect(seasonOf(10)).toBe('秋'); // 酉
    expect(seasonOf(12)).toBe('冬'); // 亥
    expect(seasonOf(1)).toBe('冬');  // 子
  });

  /**
   * 辰未戌丑為四季之末，土寄旺於此。
   * 若這四個月被歸進前後的季節，土就永遠沒有當令的時候，
   * 屬土的艮坤兩卦將永遠判不到「旺」。
   */
  test('辰未戌丑四個月為土旺', () => {
    for (const branch of [5, 8, 11, 2]) {
      expect(seasonOf(branch)).toBe('土旺');
    }
  });

  test('十二地支月皆有季節歸屬，且五季各自出現', () => {
    const seasons = Array.from({ length: 12 }, (_, i) => seasonOf(i + 1));
    expect(seasons.every(s => s !== undefined)).toBe(true);
    expect(new Set(seasons)).toEqual(new Set(['春', '夏', '秋', '冬', '土旺']));
  });

  test('當令五行：春木、夏火、秋金、冬水、土旺土', () => {
    expect(SEASON_ELEMENT['春']).toBe('木');
    expect(SEASON_ELEMENT['夏']).toBe('火');
    expect(SEASON_ELEMENT['秋']).toBe('金');
    expect(SEASON_ELEMENT['冬']).toBe('水');
    expect(SEASON_ELEMENT['土旺']).toBe('土');
  });

  test('五行皆有當令的季節，無一遺漏', () => {
    const elements = new Set(Object.values(SEASON_ELEMENT));
    expect(elements).toEqual(new Set(['木', '火', '金', '水', '土']));
  });
});
