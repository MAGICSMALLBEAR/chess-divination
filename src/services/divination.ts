// 占卜核心服務
// 抽棋演算法 + 起卦 + 籤詩選擇 + 每日運勢

import type { ChessPiece } from '@/data/pieces';
import { ALL_PIECES } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { getPoemById } from '@/data/poems';
import {
  TRIGRAM_NAMES, TRIGRAM_GLYPHS, TRIGRAM_ELEMENTS,
  hexagramIndex, hexagramNameOf, poemIdFromTrigrams,
} from './hexagram';
import { todayString, hourBranchNumber } from './date';

/**
 * 起卦引擎版本。修改起卦邏輯時必須遞增，歷史記錄依此標記所用卦法。
 *
 * v1 — 卦序對應錯誤（先天序誤作文王序），64 卦中 62 卦的籤詩與卦象不符。
 * v2 — 修正卦序；卦改由棋種＋顏色決定，八卦全覆蓋。
 * v3 — 納入時辰，每次起卦皆有動爻，並推演變卦、互卦與體用生剋。
 */
export const DIVINATION_ENGINE_VERSION = 3;

// ====== 確定性 PRNG (Mulberry32) ======

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// ====== 抽棋演算法 ======

/**
 * 抽取指定數量的棋子。
 *
 * 每一次抽取都是從完整的 32 顆棋子中獨立取出（抽出後放回再搖），
 * 因此可能抽到兩顆相同的棋。這是刻意的設計，理由有二：
 *
 * 1. 起卦的每一次取數本就相互獨立，放回才是正確的模型。
 * 2. 若不放回，「上下同卦」的八個重卦中，乾為天（需兩顆紅帥）與
 *    坤為地（需兩顆黑將）將永遠抽不到——而乾為天正是籤詩之首。
 *
 * 抽到雙帥即成「乾為天」純陽之象，抽到雙將即成「坤為地」純陰之象，
 * 在解讀上是有意義的結果，而非重複的瑕疵。
 */
export function drawPieces(count: 1 | 2 | 3, seed?: number): ChessPiece[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const drawn: ChessPiece[] = [];

  for (let i = 0; i < count; i++) {
    drawn.push(ALL_PIECES[Math.floor(rand() * ALL_PIECES.length)]);
  }

  return drawn;
}

// ====== 棋子 → 卦象 ======

export interface HexagramResult {
  /** 上卦（先天序 0–7） */
  upper: number;
  /** 下卦（先天序 0–7） */
  lower: number;
  /** 先天序索引 0–63 */
  index: number;
  /** 卦名，如「水雷屯」 */
  name: string;
  /** 對應籤詩 id（文王卦序 1–64） */
  poemId: number;
  /** 動爻 1–6（自下而上） */
  movingLine: number;
  /** 起卦所用的時辰數 1–12 */
  hourBranch: number;
}

export interface HexagramOptions {
  /**
   * 時辰數 1–12。預設取當下時辰。
   * 傳入固定值可得到可重現的結果（每日運勢即以此保持整日一致）。
   */
  hourBranch?: number;
  /**
   * 額外參與動爻計算的數。
   * 棋盤模式傳入各棋子的格位數總和，使「擺在哪裡」真正影響卦象。
   */
  extra?: number;
}

/**
 * 由抽到的棋子起卦。
 *
 * 抽 1 顆：上下同卦，成八重卦之一。
 * 抽 2 顆：第一顆為上卦、第二顆為下卦，8×8 = 64 卦全覆蓋。
 * 抽 3 顆：前兩顆定上下卦，第三顆另計入動爻。
 *
 * 動爻依梅花易數：(上卦數 + 下卦數 + 其餘數 + 時辰數) mod 6，得 0 則為上爻。
 * 時辰是必要參數——同樣的棋在不同時辰起卦，變化的關鍵所在本就不同。
 */
export function computeHexagram(
  pieces: ChessPiece[],
  options: HexagramOptions = {},
): HexagramResult {
  if (pieces.length === 0) {
    throw new Error('起卦至少需要一顆棋子');
  }

  const upper = pieces[0].trigram;
  const lower = pieces.length === 1 ? pieces[0].trigram : pieces[1].trigram;

  const hourBranch = options.hourBranch ?? hourBranchNumber();
  const thirdPiece = pieces.length >= 3 ? pieces[2].trigram : 0;
  const sum = upper + lower + thirdPiece + (options.extra ?? 0) + hourBranch;
  const remainder = sum % 6;

  return {
    upper,
    lower,
    index: hexagramIndex(upper, lower),
    name: hexagramNameOf(upper, lower),
    poemId: poemIdFromTrigrams(upper, lower),
    movingLine: remainder === 0 ? 6 : remainder,
    hourBranch,
  };
}

/** 先天序索引 0–63（保留給既有呼叫端與測試） */
export function computeHexagramIndex(pieces: ChessPiece[]): number {
  return computeHexagram(pieces).index;
}

/**
 * 根據抽到的棋子選擇籤詩。
 *
 * 注意：卦的索引是「先天（伏羲）序」，而籤詩是依「文王卦序」編號，
 * 兩者必須經 poemIdFromTrigrams 轉換，不可直接相加。
 */
export function selectPoem(pieces: ChessPiece[]): Poem {
  return getPoemById(computeHexagram(pieces).poemId);
}

// ====== 每日運勢 ======

/** 五行對應色 */
const ELEMENT_COLORS: Record<string, string> = {
  金: '白', 木: '青', 水: '黑', 火: '紅', 土: '黃',
};

/** 五行對應的八方位（生我之方為吉方） */
const ELEMENT_DIRECTIONS: Record<string, string[]> = {
  木: ['東', '東南'],
  火: ['南'],
  土: ['西南', '東北'],
  金: ['西', '西北'],
  水: ['北'],
};

/** 生我者（印）：key 為我之五行，value 為生我之五行 */
const GENERATED_BY: Record<string, string> = {
  金: '土', 木: '水', 水: '金', 火: '木', 土: '火',
};

/** 河圖數 */
const ELEMENT_NUMBERS: Record<string, number[]> = {
  水: [1, 6], 火: [2, 7], 木: [3, 8], 金: [4, 9], 土: [5, 10],
};

export interface DailyFortuneResult {
  date: string;
  luckyPiece: string;
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: number;
  fortuneLevel: string;
  fortuneText: string;
  /** 當日之卦所對應的籤詩 id */
  poemId: number;
  /** 當日主氣五行 */
  luckyElement: string;
}

/**
 * 產生當日運勢。
 *
 * 以「當地日期」為種子起一卦，運勢等級與內容直接取自該卦的籤詩，
 * 幸運方位／顏色／數字則由該卦的卦氣五行推導，彼此互相自洽。
 *
 * 舊版的問題：
 * 1. 用 toISOString() 取 UTC 日期，台灣當地 00:00–08:00 會顯示前一天的運勢。
 * 2. 五個欄位各自獨立隨機，可能出現「幸運棋子屬水、幸運方位屬火、幸運色屬火」
 *    這種自相矛盾的組合。
 */
export function generateDailyFortune(): DailyFortuneResult {
  const dateStr = todayString();
  const seed = hashString(dateStr);
  const rand = mulberry32(seed);

  // 時辰固定由日期推得，使當日運勢整天一致，不會隨時辰變動
  const pieces = drawPieces(2, seed);
  const hexagram = computeHexagram(pieces, { hourBranch: (Math.abs(seed) % 12) + 1 });
  const poem = getPoemById(hexagram.poemId);

  // 當日主氣取上卦（體）之五行
  const element = TRIGRAM_ELEMENTS[hexagram.upper];

  // 吉方＝生我之方
  const supportElement = GENERATED_BY[element];
  const directions = ELEMENT_DIRECTIONS[supportElement] || ['中'];
  const luckyDirection = directions[Math.floor(rand() * directions.length)];

  // 助運色＝與主氣比和
  const luckyColor = ELEMENT_COLORS[element] || '金';

  // 幸運數取該五行的河圖數
  const numbers = ELEMENT_NUMBERS[element] || [5, 10];
  const luckyNumber = numbers[Math.floor(rand() * numbers.length)];

  return {
    date: dateStr,
    luckyPiece: pieces[0].type,
    luckyColor,
    luckyDirection,
    luckyNumber,
    fortuneLevel: poem.level,
    fortuneText: `${hexagram.name}．${poem.title}——${poem.jieYue.general}`,
    poemId: poem.id,
    luckyElement: element,
  };
}

// ====== 解讀輔助 ======

/** 根據抽到的棋子生成摘要 */
export function generateDrawSummary(pieces: ChessPiece[]): string {
  if (pieces.length === 0) return '';

  const pieceNames = pieces.map(p => p.displayChar).join('、');
  const { upper, lower, name } = computeHexagram(pieces);

  let summary =
    `抽得${pieceNames}，上${TRIGRAM_NAMES[upper]}${TRIGRAM_GLYPHS[upper]}、` +
    `下${TRIGRAM_NAMES[lower]}${TRIGRAM_GLYPHS[lower]}，成「${name}」。`;

  if (pieces.length === 1) {
    const p = pieces[0];
    summary += `${p.color === 'red' ? '紅' : '黑'}方${p.chineseName}獨現，卦氣屬${p.guaElement}，${p.yinYang}卦當令。`;
  } else {
    const reds = pieces.filter(p => p.color === 'red').length;
    const blacks = pieces.length - reds;
    if (blacks === 0) summary += '全紅純陽，主動在我，事由己出。';
    else if (reds === 0) summary += '全黑純陰，靜守為宜，事由外來。';
    else summary += '紅黑相雜，內外交參，宜審時度勢。';
  }

  return summary;
}
