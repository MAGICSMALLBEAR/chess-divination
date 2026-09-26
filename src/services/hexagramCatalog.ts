// 卦典 — 六十四卦逐卦列出卦形、上下卦、六條爻辭與互／錯／綜三個關係卦
//
// 這裡不存任何新資料，每一欄都取自既有的真相來源：
//   卦名與文王卦序 — poems.ts 的 hexagramName（籤詩就是依文王卦序編號）
//   上下卦與六爻   — parseHexagramName／hexagramLines（hexagram.ts）
//   卦辭與大象     — data/zhouyiTexts.ts（由 scripts/build-zhouyi-texts.mjs 自維基文庫產生並查核）
//   爻辭           — yaoReading.ts 已逐條校對的 384 條（揭曉頁讀的同一份）
//   互／錯／綜     — hexagram.ts 的 nuclear／opposite／reversedTrigrams
// 另存一份卦資料，遲早會與揭曉頁對不上。

import { ALL_POEMS } from '@/data/poems';
import {
  hexagramLines, parseHexagramName, poemIdFromTrigrams, hexagramNameOf,
  nuclearTrigrams, oppositeTrigrams, reversedTrigrams,
  type LineValue,
} from './hexagram';
import { getYaoTexts } from './yaoReading';
import { ZHOUYI_TEXTS } from '@/data/zhouyiTexts';

/** 指向另一卦：文王卦序（即籤詩 id）與卦名 */
export interface HexagramRef {
  poemId: number;
  name: string;
}

export interface HexagramEntry {
  /** 文王卦序，1–64，與籤詩 id 相同 */
  poemId: number;
  /** 完整卦名，如「水雷屯」「乾為天」。資料值，三語皆印漢字 */
  name: string;
  upper: number;
  lower: number;
  /** 索引 0 為初爻 */
  lines: LineValue[];
  /** 卦辭，整句照原文、含卦名（「屯：元亨…」「履虎尾，不咥人，亨。」） */
  judgment: string;
  /** 大象傳 */
  image: string;
  /** 六條爻辭，索引 0 為初爻；未校對時為 null */
  yaoTexts: readonly string[] | null;
  nuclear: HexagramRef;
  opposite: HexagramRef;
  reversed: HexagramRef;
}

function refOf({ upper, lower }: { upper: number; lower: number }): HexagramRef {
  return { poemId: poemIdFromTrigrams(upper, lower), name: hexagramNameOf(upper, lower) };
}

function buildEntry(poemId: number, name: string): HexagramEntry {
  const parsed = parseHexagramName(name);
  // hexagram.ts 建對照表時已對全部 64 首驗過卦名可解析，走到這裡代表資料壞了
  if (!parsed) throw new Error(`卦名無法解析：「${name}」（#${poemId}）`);
  const [upper, lower] = parsed;
  const lines = hexagramLines(upper, lower);
  const text = ZHOUYI_TEXTS[poemId];
  if (!text) throw new Error(`缺卦辭與大象：#${poemId}`);
  return {
    poemId, name, upper, lower, lines,
    judgment: text.judgment,
    image: text.image,
    yaoTexts: getYaoTexts(poemId),
    nuclear: refOf(nuclearTrigrams(lines)),
    opposite: refOf(oppositeTrigrams(upper, lower)),
    reversed: refOf(reversedTrigrams(upper, lower)),
  };
}

/** 六十四卦，依文王卦序（乾、坤、屯、蒙…）——讀《易》的人熟悉的順序 */
export const HEXAGRAM_CATALOG: readonly HexagramEntry[] = [...ALL_POEMS]
  .sort((a, b) => a.id - b.id)
  .map(p => buildEntry(p.id, p.hexagramName));

export function hexagramEntry(poemId: number): HexagramEntry | undefined {
  return HEXAGRAM_CATALOG.find(e => e.poemId === poemId);
}

/**
 * 卦是否命中搜尋字串：比對卦名、卦辭、大象與六條爻辭。
 *
 * 沒有 lang 參數：卦名與經文三語都印漢字原文（經文不翻譯，理由見
 * DEVELOPMENT_PLAN「刻意不做」），卡片上看得到的字只有這一份。
 * 使用者記得的常是某一句（「潛龍勿用」「自強不息」），而不是它在哪一卦。
 */
export function hexagramMatchesSearch(entry: HexagramEntry, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return [entry.name, entry.judgment, entry.image, ...(entry.yaoTexts ?? [])]
    .some(text => text.includes(q));
}