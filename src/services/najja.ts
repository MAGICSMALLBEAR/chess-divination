// 納甲、六親、世應（京房八宮法的結構層）
//
// 本模組只負責把已起出的六爻轉成傳統盤面資料；不在沒有日干支、月破、
// 空亡、六神等條件時，逕自輸出「完整文王六爻斷語」。

import { lineName, type LineValue } from './hexagram';
import { monthBranchContext } from './date';
import { EARTHLY_BRANCHES, branchesClash, sexagenaryDay, sixSpiritsForDate, xunKongForDate } from './sexagenary';

export type SixRelative = '兄弟' | '子孫' | '妻財' | '官鬼' | '父母';

export interface NaJiaLine {
  position: number;
  name: string;
  stemBranch: string;
  branch: string;
  element: string;
  relative: SixRelative;
  spirit: string;
  isVoid: boolean;
  isMonthBroken: boolean;
  isDayClashed: boolean;
  isWorld: boolean;
  isResponding: boolean;
}

export interface NaJiaReading {
  palace: string;
  palaceElement: string;
  generation: '本宮' | '一世' | '二世' | '三世' | '四世' | '五世' | '遊魂' | '歸魂';
  worldLine: number;
  respondingLine: number;
  dayStemBranch: string;
  xun: string;
  voidBranches: readonly string[];
  monthBranch: string;
  dayBranch: string;
  lines: NaJiaLine[];
}

export type TransformedLineRelation =
  | '比和' | '變爻生本爻' | '變爻剋本爻' | '本爻生變爻' | '本爻剋變爻';

const TRIGRAM_NAJIA: Readonly<Record<number, readonly string[]>> = {
  0: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'], // 乾
  1: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'], // 兌
  2: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'], // 離
  3: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'], // 震
  4: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'], // 巽
  5: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'], // 坎
  6: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'], // 艮
  7: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'], // 坤
};

const BRANCH_ELEMENT: Readonly<Record<string, string>> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};

const GENERATES: Readonly<Record<string, string>> = {
  金: '水', 水: '木', 木: '火', 火: '土', 土: '金',
};

const OVERCOMES: Readonly<Record<string, string>> = {
  金: '木', 木: '土', 土: '水', 水: '火', 火: '金',
};

type PalaceInfo = Pick<NaJiaReading, 'palace' | 'palaceElement' | 'generation' | 'worldLine'>;

/** 文王序卦號 → 八宮、世次、世爻；每個卦恰屬一宮。 */
const PALACE_BY_POEM_ID: Readonly<Record<number, PalaceInfo>> = {};

function registerPalace(
  palace: string,
  palaceElement: string,
  ids: readonly number[],
) {
  const generations: NaJiaReading['generation'][] = ['本宮', '一世', '二世', '三世', '四世', '五世', '遊魂', '歸魂'];
  const worldLines = [6, 1, 2, 3, 4, 5, 4, 3];
  ids.forEach((id, i) => {
    (PALACE_BY_POEM_ID as Record<number, PalaceInfo>)[id] = {
      palace, palaceElement, generation: generations[i], worldLine: worldLines[i],
    };
  });
}

// 八宮次序：本宮、一至五世、遊魂、歸魂。
registerPalace('乾', '金', [1, 44, 33, 12, 20, 23, 35, 14]);
registerPalace('兌', '金', [58, 47, 45, 31, 39, 15, 62, 54]);
registerPalace('離', '火', [30, 56, 50, 64, 4, 59, 6, 13]);
registerPalace('震', '木', [51, 16, 40, 32, 46, 48, 28, 17]);
registerPalace('巽', '木', [57, 9, 37, 42, 25, 21, 27, 18]);
registerPalace('坎', '水', [29, 60, 3, 63, 49, 55, 36, 7]);
registerPalace('艮', '土', [52, 22, 26, 41, 38, 10, 61, 53]);
registerPalace('坤', '土', [2, 24, 19, 11, 34, 43, 5, 8]);

function sixRelative(palaceElement: string, lineElement: string): SixRelative {
  if (palaceElement === lineElement) return '兄弟';
  if (GENERATES[palaceElement] === lineElement) return '子孫';
  if (OVERCOMES[palaceElement] === lineElement) return '妻財';
  if (OVERCOMES[lineElement] === palaceElement) return '官鬼';
  return '父母';
}

/** 動爻與變卦同位爻的五行方向，只描述生剋關係，不直接換算吉凶。 */
export function transformedLineRelation(
  primaryElement: string,
  changedElement: string,
): TransformedLineRelation {
  if (primaryElement === changedElement) return '比和';
  if (GENERATES[changedElement] === primaryElement) return '變爻生本爻';
  if (OVERCOMES[changedElement] === primaryElement) return '變爻剋本爻';
  if (GENERATES[primaryElement] === changedElement) return '本爻生變爻';
  return '本爻剋變爻';
}

function respondingLineFor(worldLine: number): number {
  return ((worldLine + 2) % 6) + 1;
}

/** 由本卦的上下卦、文王序號與六爻陰陽，建立納甲六親世應盤。 */
export function buildNaJiaReading(
  upper: number,
  lower: number,
  poemId: number,
  lines: LineValue[],
  at: Date = new Date(),
): NaJiaReading | null {
  const palace = PALACE_BY_POEM_ID[poemId];
  const lowerNaJia = TRIGRAM_NAJIA[lower];
  const upperNaJia = TRIGRAM_NAJIA[upper];
  if (!palace || !lowerNaJia || !upperNaJia || lines.length !== 6) return null;

  const stemBranches = [...lowerNaJia.slice(0, 3), ...upperNaJia.slice(3, 6)];
  const respondingLine = respondingLineFor(palace.worldLine);
  const spirits = sixSpiritsForDate(at);
  const xunKong = xunKongForDate(at);
  const day = sexagenaryDay(at);
  const monthBranch = EARTHLY_BRANCHES[monthBranchContext(at).branch - 1];
  return {
    ...palace,
    respondingLine,
    dayStemBranch: day.name,
    xun: xunKong.xun,
    voidBranches: xunKong.voidBranches,
    monthBranch,
    dayBranch: day.branch,
    lines: stemBranches.map((stemBranch, index) => {
      const branch = stemBranch.at(-1) ?? '';
      const element = BRANCH_ELEMENT[branch];
      return {
        position: index + 1,
        name: lineName(lines, index + 1),
        stemBranch,
        branch,
        element,
        relative: sixRelative(palace.palaceElement, element),
        spirit: spirits[index],
        isVoid: xunKong.voidBranches.includes(branch),
        isMonthBroken: branchesClash(branch, monthBranch),
        isDayClashed: branchesClash(branch, day.branch),
        isWorld: index + 1 === palace.worldLine,
        isResponding: index + 1 === respondingLine,
      };
    }),
  };
}
