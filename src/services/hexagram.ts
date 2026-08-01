// 卦象服務 — 八卦常數與「先天序 → 文王序」對照
//
// 為什麼需要這個檔案：
// 由棋子算出的卦，其索引是「先天（伏羲）二進位序」= 上卦 × 8 + 下卦（0–63）。
// 但 poems.ts 的 64 首籤詩是依「文王卦序」排列（#1 乾為天、#2 坤為地、#3 水雷屯…）。
// 舊版程式直接用 `poemId = index + 1`，等於把兩套互不相干的編號當成同一套，
// 導致 64 卦中有 62 卦拿到錯誤的籤詩（例如坤上坤下顯示成「火水未濟」）。
//
// 對照表不手工維護，而是從 poems.ts 既有的 `hexagramName` 自動推導：
// 卦名格式為「上卦象 + 下卦象 + 卦名」（水雷屯 = 上坎下震），八純卦寫作「乾為天」。

import { ALL_POEMS, getPoemById } from '@/data/poems';

// ====== 八卦常數（先天序：0乾 1兌 2離 3震 4巽 5坎 6艮 7坤）======

export const TRIGRAM_NAMES = ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤'] as const;
export const TRIGRAM_SYMBOLS = ['天', '澤', '火', '雷', '風', '水', '山', '地'] as const;
export const TRIGRAM_GLYPHS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'] as const;

/** 卦氣五行：乾兌屬金、離屬火、震巽屬木、坎屬水、艮坤屬土 */
export const TRIGRAM_ELEMENTS = ['金', '金', '火', '木', '木', '水', '土', '土'] as const;

/**
 * 卦之陰陽。依《繫辭下》「陽卦多陰，陰卦多陽」：
 * 震☳坎☵艮☶ 各一陽二陰為陽卦，加純陽之乾☰；
 * 巽☴離☲兌☱ 各一陰二陽為陰卦，加純陰之坤☷。
 */
export const TRIGRAM_YINYANG = ['陽', '陰', '陰', '陽', '陰', '陽', '陽', '陰'] as const;

/**
 * 錯卦（六爻全變）配對：乾↔坤、兌↔艮、離↔坎、震↔巽。
 * 索引即為該卦的錯卦編號。
 */
export const TRIGRAM_OPPOSITE = [7, 6, 5, 4, 3, 2, 1, 0] as const;

const SYMBOL_TO_TRIGRAM: Record<string, number> = {
  天: 0, 澤: 1, 火: 2, 雷: 3, 風: 4, 水: 5, 山: 6, 地: 7,
};

const NAME_TO_TRIGRAM: Record<string, number> = {
  乾: 0, 兌: 1, 離: 2, 震: 3, 巽: 4, 坎: 5, 艮: 6, 坤: 7,
};

// ====== 索引與卦名 ======

/** 上卦、下卦 → 先天序索引 0–63 */
export function hexagramIndex(upper: number, lower: number): number {
  return upper * 8 + lower;
}

/** 先天序索引 → [上卦, 下卦] */
export function trigramsFromIndex(index: number): [number, number] {
  return [Math.floor(index / 8), index % 8];
}

/**
 * 解析籤詩的卦名 → [上卦, 下卦]
 * 「乾為天」→ [0, 0]；「水雷屯」→ [5, 3]（上坎下震）
 */
export function parseHexagramName(name: string): [number, number] | null {
  if (name.includes('為')) {
    const t = NAME_TO_TRIGRAM[name[0]];
    return t === undefined ? null : [t, t];
  }
  const upper = SYMBOL_TO_TRIGRAM[name[0]];
  const lower = SYMBOL_TO_TRIGRAM[name[1]];
  if (upper === undefined || lower === undefined) return null;
  return [upper, lower];
}

// ====== 先天序 → 文王序（籤詩 id）對照 ======

function buildMapping(): Record<number, number> {
  const map: Record<number, number> = {};

  for (const poem of ALL_POEMS) {
    const parsed = parseHexagramName(poem.hexagramName);
    if (!parsed) {
      throw new Error(`卦名無法解析：「${poem.hexagramName}」（籤 #${poem.id}）`);
    }
    const index = hexagramIndex(parsed[0], parsed[1]);
    if (map[index] !== undefined) {
      throw new Error(
        `卦象重複：籤 #${poem.id}「${poem.hexagramName}」與籤 #${map[index]} 同為索引 ${index}`,
      );
    }
    map[index] = poem.id;
  }

  const missing = Array.from({ length: 64 }, (_, i) => i).filter(i => map[i] === undefined);
  if (missing.length > 0) {
    throw new Error(`卦象對照表不完整，缺少索引：${missing.join(', ')}`);
  }

  return map;
}

/** 先天序索引（0–63） → 文王卦序籤詩 id（1–64） */
export const XIANTIAN_TO_KINGWEN: Readonly<Record<number, number>> = buildMapping();

/** 上卦、下卦 → 對應的籤詩 id（文王卦序） */
export function poemIdFromTrigrams(upper: number, lower: number): number {
  return XIANTIAN_TO_KINGWEN[hexagramIndex(upper, lower)];
}

/** 上卦、下卦 → 完整卦名（如「水雷屯」、「乾為天」） */
export function hexagramNameOf(upper: number, lower: number): string {
  return getPoemById(poemIdFromTrigrams(upper, lower)).hexagramName;
}
