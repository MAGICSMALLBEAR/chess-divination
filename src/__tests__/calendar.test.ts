// 今日曆法（calendar.ts）
//
// 農曆用平台的中國曆，這裡用幾個確知的日子對答案（春節、中秋、閏月），並驗證平台不支援時
// 整個不顯示而不是亂給；節氣與月建驗證「首頁說的」與「卦盤用的」是同一個答案。

import {
  lunarDate, lunarDayName, lunarMonthName, lunarYearGanZhi, solarTermOn, todayAlmanac,
  moonElongation, moonIllumination, moonOn, moonLitPercent,
} from '../services/calendar';
import { monthBranchContext, SOLAR_TERM_NAMES, EARTHLY_BRANCHES, seasonOf, SEASON_ELEMENT } from '../services/date';
import { sexagenaryDay } from '../services/sexagenary';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12, 0, 0);

describe('農曆（平台中國曆）', () => {
  test.each([
    [d(2026, 2, 17), { year: 2026, month: 1, day: 1, isLeap: false }],   // 2026 春節
    [d(2026, 2, 16), { year: 2025, month: 12, day: 29, isLeap: false }], // 除夕（乙巳年臘月沒有三十）
    [d(2025, 1, 29), { year: 2025, month: 1, day: 1, isLeap: false }],   // 2025 春節
    [d(2026, 9, 25), { year: 2026, month: 8, day: 15, isLeap: false }],  // 2026 中秋
    [d(2023, 3, 22), { year: 2023, month: 2, day: 1, isLeap: true }],    // 閏二月初一
    [d(2025, 7, 25), { year: 2025, month: 6, day: 1, isLeap: true }],    // 閏六月初一
  ])('%s', (date, expected) => {
    expect(lunarDate(date)).toEqual(expected);
  });

  /** 平台不支援中國曆時會靜靜退回公曆——照樣解析就是把國曆當農曆 */
  test('平台曆法不是 chinese：回傳 null，不拿公曆數字充數', () => {
    const gregorian = {
      resolvedOptions: () => ({ calendar: 'gregory' }) as Intl.ResolvedDateTimeFormatOptions,
      formatToParts: () => [{ type: 'month', value: '9' }, { type: 'day', value: '25' }] as Intl.DateTimeFormatPart[],
    };
    expect(lunarDate(d(2026, 9, 25), gregorian)).toBeNull();
  });

  test('格式認不得或拋錯：回傳 null', () => {
    const weird = {
      resolvedOptions: () => ({ calendar: 'chinese' }) as Intl.ResolvedDateTimeFormatOptions,
      formatToParts: () => [{ type: 'month', value: 'M08' }, { type: 'day', value: '15' }] as Intl.DateTimeFormatPart[],
    };
    expect(lunarDate(d(2026, 9, 25), weird)).toBeNull();
    const throwing = {
      resolvedOptions: () => { throw new Error('no Intl'); },
      formatToParts: () => [],
    };
    expect(lunarDate(d(2026, 9, 25), throwing as never)).toBeNull();
  });

  test('日與月的中文寫法', () => {
    expect([1, 10, 11, 15, 19, 20, 21, 29, 30].map(lunarDayName))
      .toEqual(['初一', '初十', '十一', '十五', '十九', '二十', '廿一', '廿九', '三十']);
    expect(lunarMonthName(1, false)).toBe('正月');
    expect(lunarMonthName(8, false)).toBe('八月');
    expect(lunarMonthName(12, false)).toBe('十二月');
    expect(lunarMonthName(6, true)).toBe('閏六月');
  });

  test('農曆年干支：1984 甲子、2025 乙巳、2026 丙午', () => {
    expect(lunarYearGanZhi(1984)).toBe('甲子');
    expect(lunarYearGanZhi(2025)).toBe('乙巳');
    expect(lunarYearGanZhi(2026)).toBe('丙午');
  });
});

describe('節氣', () => {
  test('今天（2026-09-25）在秋分之後，下一個是寒露', () => {
    const info = solarTermOn(d(2026, 9, 25))!;
    expect(info.current).toBe('秋分');
    expect(info.currentDate.getDate()).toBe(23);
    expect(info.next).toBe('寒露');
    expect(info.daysToNext).toBe(13);
  });

  test('交節當天：current 就是這一節，距下一節的天數從這天算', () => {
    const info = solarTermOn(d(2026, 2, 4))!;
    expect(info.current).toBe('立春');
  });

  test('跨年：一月初（小寒前）往前找去年的冬至；冬至後往後找明年的小寒', () => {
    expect(solarTermOn(d(2026, 1, 2))!.current).toBe('冬至');
    expect(solarTermOn(d(2026, 1, 2))!.next).toBe('小寒');
    const late = solarTermOn(d(2026, 12, 30))!;
    expect(late.current).toBe('冬至');
    expect(late.next).toBe('小寒');
    expect(late.nextDate.getFullYear()).toBe(2027);
  });

  test('近似式範圍外的年份不顯示', () => {
    expect(solarTermOn(d(1850, 6, 1))).toBeNull();
    expect(solarTermOn(d(2150, 6, 1))).toBeNull();
  });

  /** 一整年每一天：current 都在今天或之前、next 都在今天之後，兩者相鄰 */
  test('2026 全年逐日：節氣前後關係一致', () => {
    for (let day = d(2026, 1, 1); day.getFullYear() === 2026; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
      const info = solarTermOn(day)!;
      expect(info.currentDate.getTime()).toBeLessThanOrEqual(new Date(2026, day.getMonth(), day.getDate()).getTime());
      expect(info.daysToNext).toBeGreaterThan(0);
      const ci = SOLAR_TERM_NAMES.indexOf(info.current as (typeof SOLAR_TERM_NAMES)[number]);
      expect(info.next).toBe(SOLAR_TERM_NAMES[(ci + 1) % 24]);
    }
  });
});

describe('今日曆法：與卦盤用同一份答案', () => {
  /** 首頁說「酉月、金當令」，揭曉頁的旺衰也必須用酉月——兩邊各算一份就可能各說各話 */
  test('月建、季節、當令五行、日柱都直接來自卦盤用的那幾個函式', () => {
    for (const date of [d(2026, 9, 25), d(2026, 2, 3), d(2026, 2, 4), d(2026, 12, 31), d(2025, 7, 25)]) {
      const a = todayAlmanac(date);
      const ctx = monthBranchContext(date);
      expect(a.monthBranch).toBe(EARTHLY_BRANCHES[ctx.branch - 1]);
      expect(a.monthTerm).toBe(ctx.term);
      expect(a.season).toBe(seasonOf(ctx.branch));
      expect(a.seasonElement).toBe(SEASON_ELEMENT[a.season]);
      expect(a.dayPillar).toBe(sexagenaryDay(date).name);
    }
  });

  test('2026-09-25：秋分後、酉月、秋、金當令', () => {
    const a = todayAlmanac(d(2026, 9, 25));
    expect(a).toMatchObject({ monthBranch: '酉', monthTerm: '白露', season: '秋', seasonElement: '金' });
    expect(a.lunar).toMatchObject({ month: 8, day: 15 });
  });

  /** 月建只在「節」換、節氣列表每一節都要換——兩者由 date.ts 同一張表推得 */
  test('每個換月建的節名都在二十四節氣表的偶數位', () => {
    for (let m = 1; m <= 12; m++) {
      const term = monthBranchContext(d(2026, m, 15)).term;
      expect(SOLAR_TERM_NAMES.indexOf(term as (typeof SOLAR_TERM_NAMES)[number]) % 2).toBe(0);
    }
  });
});

describe('月相', () => {
  // 已公布的月相瞬間（UTC）：與時區無關，直接比角距
  test.each([
    ['2024-01-11T11:57:00Z', 0],   // 朔
    ['2024-01-18T03:52:00Z', 90],  // 上弦
    ['2024-01-25T17:54:00Z', 180], // 望
    ['2024-02-02T23:18:00Z', 270], // 下弦
    ['2024-04-08T18:21:00Z', 0],   // 朔（日全食）
    ['2024-09-18T02:34:00Z', 180], // 望（月偏食）
  ])('%s 的角距約為 %s°（誤差 1° 內 ≈ 兩小時內）', (iso, target) => {
    const e = moonElongation(new Date(iso));
    const diff = Math.abs(((e - target + 540) % 360) - 180);
    expect(diff).toBeLessThan(1);
  });

  test('亮面比例：朔約 0、望約 1、上弦約一半', () => {
    expect(moonIllumination(new Date('2024-01-11T11:57:00Z'))).toBeLessThan(0.01);
    expect(moonIllumination(new Date('2024-01-25T17:54:00Z'))).toBeGreaterThan(0.99);
    expect(moonIllumination(new Date('2024-01-18T03:52:00Z'))).toBeCloseTo(0.5, 1);
  });

  test('亮面百分比：只有望能印 100%、只有朔能印 0%（避免「盈凸月 · 100%」）', () => {
    expect(moonLitPercent({ phase: 'waxingGibbous', illumination: 0.996 })).toBe(99);
    expect(moonLitPercent({ phase: 'full', illumination: 0.996 })).toBe(100);
    expect(moonLitPercent({ phase: 'waningCrescent', illumination: 0.002 })).toBe(1);
    expect(moonLitPercent({ phase: 'new', illumination: 0.002 })).toBe(0);
    expect(moonLitPercent({ phase: 'firstQuarter', illumination: 0.5 })).toBe(50);
  });

  test('主月相恰好一天：連續 90 天裡，朔、上弦、望、下弦各自不會連兩天出現', () => {
    let prev = '';
    const counts: Record<string, number> = {};
    for (let i = 0; i < 90; i++) {
      const { phase } = moonOn(d(2025, 1, 1 + i));
      counts[phase] = (counts[phase] ?? 0) + 1;
      if (['new', 'firstQuarter', 'full', 'lastQuarter'].includes(phase)) expect(phase).not.toBe(prev);
      prev = phase;
    }
    // 三個朔望月：每個主月相 3 次左右（90 天可能碰到第 4 次）
    for (const p of ['new', 'firstQuarter', 'full', 'lastQuarter']) {
      expect(counts[p]).toBeGreaterThanOrEqual(3);
      expect(counts[p]).toBeLessThanOrEqual(4);
    }
  });

  test('月相順序只會往前走：新月 → 眉月 → 上弦 → 盈凸 → 望 → 虧凸 → 下弦 → 殘月', () => {
    const ORDER = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'];
    let prev = ORDER.indexOf(moonOn(d(2025, 3, 1)).phase);
    for (let i = 1; i < 120; i++) {
      const cur = ORDER.indexOf(moonOn(d(2025, 3, 1 + i)).phase);
      expect([prev, (prev + 1) % 8]).toContain(cur);
      prev = cur;
    }
  });

  // 與另一個獨立來源對照：農曆以朔日為初一。平台中國曆由 ICU 維護，與本檔的天文算式互不相干
  test('與平台農曆互相核對：初一亮面極小，十五、十六亮面極大', () => {
    const probe = lunarDate(d(2025, 1, 1));
    if (!probe) return; // 平台不支援中國曆時無從對照（單元測試環境的 Node 有完整 ICU）
    let checked = 0;
    for (let i = 0; i < 365; i++) {
      const date = d(2025, 1, 1 + i);
      const lunar = lunarDate(date)!;
      const lit = moonOn(date).illumination;
      if (lunar.day === 1) { expect(lit).toBeLessThan(0.06); checked++; }
      if (lunar.day === 15 || lunar.day === 16) { expect(lit).toBeGreaterThan(0.9); checked++; }
    }
    expect(checked).toBeGreaterThanOrEqual(30);
  });
});
