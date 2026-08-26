// 干支日與六神：以本地日曆日期換算，避免 UTC 午夜造成日柱提前或延後。

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const SIX_SPIRITS = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'] as const;

const BRANCH_OPPOSITES: Readonly<Record<string, string>> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

export interface SexagenaryDay {
  index: number;
  stem: string;
  branch: string;
  name: string;
}

export interface XunKong {
  xun: string;
  voidBranches: readonly string[];
}

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** 格里曆日期（不含時分）換算儒略日序 JDN。 */
export function julianDayNumber(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 本地日期的日干支。JDN 2458511 為甲子日，故以 (JDN + 49) mod 60 對應零基甲子序。
 * 本專案採民用日曆 00:00 換日；若日後支援晚子時換日，應在呼叫前先正規化日期。
 *
 * **為什麼用裝置本地日期，而不是固定台北時間**（審查曾提出應改為 UTC+8）：
 * 起卦的三個時間量——日柱、時辰（`hourBranchNumber`）、月建
 * （`monthBranchContext`）——全部取自同一個裝置本地時鐘，這是刻意的。
 * 傳統起卦本就以問卜者當下所在的時間為準，而不是某個固定地點的時間。
 *
 * 若只把日柱改成台北時間，時辰與月建仍是本地的，兩者會互相打架：
 * 使用者在倫敦晚上八點起卦會得到「戌時」配上台北隔天的日柱（當地已是
 * 凌晨四點），旬空、六神、暗動全部跟著錯位——那比「日柱差一天」更糟，
 * 因為卦盤自身不再自洽。裝置時區設錯的情況下三者一起錯，至少仍是一張
 * 內部一致的盤。
 *
 * 這條界線由 `sexagenary.test.ts` 的「同一個時鐘」守門測試釘住。
 */
export function sexagenaryDay(date: Date = new Date()): SexagenaryDay {
  const index = positiveMod(julianDayNumber(date) + 49, 60);
  const stem = HEAVENLY_STEMS[index % 10];
  const branch = EARTHLY_BRANCHES[index % 12];
  return { index, stem, branch, name: `${stem}${branch}` };
}

/** 六神由日干在初爻起排，依序向上輪轉。 */
export function sixSpiritsForDate(date: Date = new Date()): readonly string[] {
  const { stem } = sexagenaryDay(date);
  const start = stem === '甲' || stem === '乙' ? 0
    : stem === '丙' || stem === '丁' ? 1
      : stem === '戊' ? 2
        : stem === '己' ? 3
          : stem === '庚' || stem === '辛' ? 4 : 5;
  return Array.from({ length: 6 }, (_, index) => SIX_SPIRITS[(start + index) % 6]);
}

/** 依日干支所屬的十日一旬，取得旬空（空亡）兩支。 */
export function xunKongForDate(date: Date = new Date()): XunKong {
  const { index } = sexagenaryDay(date);
  const xunIndex = Math.floor(index / 10);
  const table: readonly XunKong[] = [
    { xun: '甲子旬', voidBranches: ['戌', '亥'] },
    { xun: '甲戌旬', voidBranches: ['申', '酉'] },
    { xun: '甲申旬', voidBranches: ['午', '未'] },
    { xun: '甲午旬', voidBranches: ['辰', '巳'] },
    { xun: '甲辰旬', voidBranches: ['寅', '卯'] },
    { xun: '甲寅旬', voidBranches: ['子', '丑'] },
  ];
  return table[xunIndex];
}

/** 地支六沖：子午、丑未、寅申、卯酉、辰戌、巳亥。 */
export function branchesClash(a: string, b: string): boolean {
  return BRANCH_OPPOSITES[a] === b;
}
