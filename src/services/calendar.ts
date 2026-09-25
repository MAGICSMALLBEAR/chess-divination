// 今日曆法 — 農曆日期、二十四節氣、月建與當令五行、日柱
//
// 只呈現曆法事實，**不做擇日、不列宜忌**：黃曆宜忌的流派差異大、取法不明確，
// 與當初因用神取法不明確而收斂掉「尋人」同一個理由。這裡每一項都是算得出來、
// 各家一致的東西，而且月建與日柱正是本 App 六爻旺衰、旬空、六神實際在用的那兩個值。
//
// 真相來源：
//   - 節氣與月建：date.ts 的同一條近似式（solarTermCalendarDate／monthBranchContext），
//     不另算一份——首頁說的節氣與卦盤用的月建必須是同一個答案。
//   - 日柱：sexagenary.ts。
//   - 農曆：平台的 Intl 中國曆（`-u-ca-chinese`）。自己寫 200 年的農曆資料表容易抄錯又難驗證；
//     平台曆法由 ICU 維護。**平台不支援時回傳 null、畫面整列不顯示**，不退回近似值——
//     錯一天的農曆日期比沒有更糟。
import {
  SOLAR_TERM_NAMES, solarTermCalendarDate, monthBranchContext, seasonOf, SEASON_ELEMENT,
  EARTHLY_BRANCHES, type Season,
} from './date';
import { sexagenaryDay, HEAVENLY_STEMS } from './sexagenary';

// ====== 農曆 ======

export interface LunarDate {
  /** 農曆年的公曆年份（正月初一所在的那一年） */
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  isLeap: boolean;
}

/**
 * 以平台的中國曆取農曆日期。解析的是**語言中立的數字格式**（en 的 numeric：`8/15`，閏月是 `6bis`），
 * 再自己依語言排版——各語言的長格式寫法不一，解析它們很脆弱。
 *
 * 任何一步不成立（沒有 Intl、不支援 chinese 曆、格式認不得）都回傳 null。
 * `formatter` 可注入，供測試模擬「平台不支援」。
 */
export function lunarDate(
  date: Date,
  formatter?: Pick<Intl.DateTimeFormat, 'formatToParts' | 'resolvedOptions'>,
): LunarDate | null {
  try {
    const f = formatter ?? new Intl.DateTimeFormat('en-u-ca-chinese', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    });
    // 不支援的平台會靜靜退回公曆，照樣吐出數字——不先確認曆法就解析，會把國曆當成農曆
    if (f.resolvedOptions().calendar !== 'chinese') return null;
    const parts = f.formatToParts(date);
    const monthRaw = parts.find(p => p.type === 'month')?.value ?? '';
    const dayRaw = parts.find(p => p.type === 'day')?.value ?? '';
    const yearRaw = parts.find(p => (p.type as string) === 'relatedYear' || p.type === 'year')?.value ?? '';
    const m = /^(\d{1,2})(bis)?$/.exec(monthRaw);
    const day = Number(dayRaw);
    const year = Number(yearRaw);
    if (!m || !Number.isInteger(day) || day < 1 || day > 30) return null;
    const month = Number(m[1]);
    if (month < 1 || month > 12) return null;
    return { year: Number.isInteger(year) && year > 0 ? year : date.getFullYear(), month, day, isLeap: !!m[2] };
  } catch {
    return null;
  }
}

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] as const;
const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const;

/** 農曆日的中文寫法：初一…初十、十一…十九、二十、廿一…廿九、三十 */
export function lunarDayName(day: number): string {
  if (day <= 10) return `初${DIGITS[day]}`;
  if (day < 20) return `十${DIGITS[day - 10]}`;
  if (day === 20) return '二十';
  if (day < 30) return `廿${DIGITS[day - 20]}`;
  return '三十';
}

/** 農曆月的中文寫法：正月、二月…十二月，閏月加「閏」 */
export function lunarMonthName(month: number, isLeap: boolean): string {
  return `${isLeap ? '閏' : ''}${LUNAR_MONTHS[month - 1]}月`;
}

/** 農曆年的干支（以正月初一換年）。甲子年的公曆年份為 4 的倍數加 0 起算：1984 甲子 */
export function lunarYearGanZhi(year: number): string {
  const i = ((year - 4) % 60 + 60) % 60;
  return `${HEAVENLY_STEMS[i % 10]}${EARTHLY_BRANCHES[i % 12]}`;
}

// ====== 節氣 ======

export interface SolarTermInfo {
  /** 目前所在的節氣（最近一個已交的） */
  current: string;
  currentDate: Date;
  next: string;
  nextDate: Date;
  /** 距下一個節氣還有幾天（以當地日曆日計，交節當天為 0） */
  daysToNext: number;
}

function dayDiff(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * 今天落在哪一個節氣、下一個是什麼。跨年時往前一年的冬至、往後一年的小寒找。
 * 範圍外的年份（1900–2100 以外，近似式不保證）回傳 null——不顯示，比顯示錯的節氣好。
 */
export function solarTermOn(date: Date): SolarTermInfo | null {
  const year = date.getFullYear();
  if (year < 1901 || year > 2099) return null;
  const today = new Date(year, date.getMonth(), date.getDate());
  const terms: { name: string; date: Date }[] = [];
  for (const y of [year - 1, year, year + 1]) {
    SOLAR_TERM_NAMES.forEach((name, i) => terms.push({ name, date: solarTermCalendarDate(y, i) }));
  }
  let idx = -1;
  for (let i = 0; i < terms.length; i++) if (terms[i].date <= today) idx = i;
  if (idx < 0 || idx + 1 >= terms.length) return null;
  const current = terms[idx];
  const next = terms[idx + 1];
  return {
    current: current.name, currentDate: current.date,
    next: next.name, nextDate: next.date,
    daysToNext: dayDiff(today, next.date),
  };
}

// ====== 今日曆法 ======

export interface TodayAlmanac {
  lunar: LunarDate | null;
  term: SolarTermInfo | null;
  /** 月建地支（如「酉」）與它從哪一節開始 */
  monthBranch: string;
  monthTerm: string;
  season: Season;
  /** 當令五行：六爻旺衰「旺」的那一行 */
  seasonElement: string;
  /** 日柱（如「甲子」）：旬空與六神由它推 */
  dayPillar: string;
}

export function todayAlmanac(date: Date = new Date()): TodayAlmanac {
  const month = monthBranchContext(date);
  const season = seasonOf(month.branch);
  return {
    lunar: lunarDate(date),
    term: solarTermOn(date),
    monthBranch: EARTHLY_BRANCHES[month.branch - 1],
    monthTerm: month.term,
    season,
    seasonElement: SEASON_ELEMENT[season],
    dayPillar: sexagenaryDay(date).name,
  };
}
