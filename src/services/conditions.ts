// 文王卦的結構性條件：進退神、反吟伏吟、暗動、三合局
//
// 為什麼這一層是可以做的：
// 這三項的判定前提，卦本身與日月就已經給足——
// 進退神只看動爻與變爻的地支，暗動看靜爻與日辰之沖，
// 三合局看六爻地支能否湊成一局。都不需要「確切占時」這類本 App
// 取不到的輸入，故不屬於刻意不做的那一類。
//
// 爻的反吟伏吟不做，理由與前提無關：**本模型下不可能成立**。
// 一卦只有一個動爻，翻一爻只會換掉上下卦其中一個三爻卦，而單位元
// 相異的兩個三爻卦，同位爻的納甲地支既不會相同（伏吟）也不會相沖
// （反吟）——乾變震那種伏吟需要整個三爻卦替換，兩爻以上同動才做得到。
// conditions.test.ts 有一條窮舉六十四卦 × 六爻的測試守著這個前提：
// 哪天改成多爻動，那條測試會紅，屆時再補反吟伏吟才有意義。
//
// 仍然不做的（前提真的不足，不是懶）：
// 應期（何時應驗）要推到日、月、甚至流年，起卦只到日柱就下結論
// 等於編一個日期；問卜者與所問對象的親屬關係亦然，App 沒有問。

import type { NaJiaLine, NaJiaReading } from './najja';
import { strengthState } from './liuyao';
import { branchesClash } from './sexagenary';

export type AdvanceRetreat = '進神' | '退神';

/**
 * 進神與退神：動爻化出**同五行**的地支，順行為進、逆行為退。
 * 土支自成一圈（丑→辰→未→戌→丑）。
 */
const ADVANCE_CHAIN: readonly (readonly string[])[] = [
  ['寅', '卯'],
  ['巳', '午'],
  ['申', '酉'],
  ['亥', '子'],
  ['丑', '辰', '未', '戌'],
];

export function advanceOrRetreat(from: string, to: string): AdvanceRetreat | null {
  for (const chain of ADVANCE_CHAIN) {
    const a = chain.indexOf(from);
    const b = chain.indexOf(to);
    if (a < 0 || b < 0 || a === b) continue;
    // 土為四支循環，相鄰即算；其餘兩支鏈直接比先後
    if (chain.length === 4) {
      if ((a + 1) % 4 === b) return '進神';
      if ((b + 1) % 4 === a) return '退神';
      // 丑↔未、辰↔戌 是相沖，不是進退
      continue;
    }
    return b > a ? '進神' : '退神';
  }
  return null;
}

/** 三合局：申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金。 */
export const TRIADS: readonly { name: string; element: string; branches: readonly string[] }[] = [
  { name: '申子辰', element: '水', branches: ['申', '子', '辰'] },
  { name: '亥卯未', element: '木', branches: ['亥', '卯', '未'] },
  { name: '寅午戌', element: '火', branches: ['寅', '午', '戌'] },
  { name: '巳酉丑', element: '金', branches: ['巳', '酉', '丑'] },
];

export interface TriadFormation {
  name: string;
  element: string;
  /** 卦中參與成局的爻位 */
  positions: number[];
  /** 由日辰補足的那一支；三支俱在卦中時為 null */
  fromDay: string | null;
}

export interface TriadParams {
  lines: readonly NaJiaLine[];
  /** 動爻爻位 1–6。無動爻則不成局 */
  movingLine?: number;
  dayBranch: string;
}

/**
 * 取卦中成立的三合局。
 *
 * 「無動不成局」是這裡唯一的硬條件：三支靜靜躺在卦中而無一發動，
 * 傳統不論成局。允許日辰補足其中一支（日辰引動），但發動的那一支
 * 仍必須在卦中——否則等於憑日辰一支就宣告成局。
 */
export function detectTriads({ lines, movingLine, dayBranch }: TriadParams): TriadFormation[] {
  if (movingLine === undefined) return [];
  const mover = lines[movingLine - 1];
  if (!mover) return [];

  const found: TriadFormation[] = [];
  for (const triad of TRIADS) {
    if (!triad.branches.includes(mover.branch)) continue;

    const positions: number[] = [];
    const missing: string[] = [];
    for (const branch of triad.branches) {
      const line = lines.find(l => l.branch === branch);
      if (line) positions.push(line.position);
      else missing.push(branch);
    }

    if (missing.length === 0) {
      found.push({ ...triad, positions: positions.sort((a, b) => a - b), fromDay: null });
    } else if (missing.length === 1 && missing[0] === dayBranch) {
      found.push({ ...triad, positions: positions.sort((a, b) => a - b), fromDay: dayBranch });
    }
  }
  return found;
}

export interface DarkMovingParams {
  reading: NaJiaReading;
  /** 動爻爻位 1–6；動爻不算暗動 */
  movingLine?: number;
  /** 當令五行，用於判旺相 */
  seasonElement: string;
}

/**
 * 暗動：靜爻旺相而逢日辰相沖。
 *
 * 與日破的分野就在旺衰——旺相被沖是「暗中發動」，休囚死被沖才是破。
 * 兩者同樣是日辰沖靜爻，若不分旺衰就會把有力的爻當成壞掉的爻。
 */
export function darkMovingLines({ reading, movingLine, seasonElement }: DarkMovingParams): NaJiaLine[] {
  return reading.lines.filter(line => {
    if (line.position === movingLine) return false;
    if (!branchesClash(line.branch, reading.dayBranch)) return false;
    const state = strengthState(line.element, seasonElement);
    return state === '旺' || state === '相';
  });
}
