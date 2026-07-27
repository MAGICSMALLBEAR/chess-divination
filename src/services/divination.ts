// 占卜核心服務
// 抽棋演算法 + 籤詩選擇 + 每日運勢

import type { ChessPiece, PieceType, PieceColor } from '@/data/pieces';
import { ALL_PIECES, ALL_RED_PIECES, ALL_BLACK_PIECES, pieceTypeToTrigram } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { ALL_POEMS, getPoemById } from '@/data/poems';

// ====== 確定性 PRNG (Mulberry32) ======
// 參照神明占卜 seededRandom.ts

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

/** 隨機抽取指定數量的棋子 */
export function drawPieces(count: 1 | 2 | 3, seed?: number): ChessPiece[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const pool = [...ALL_PIECES];
  const drawn: ChessPiece[] = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length);
    drawn.push(pool.splice(idx, 1)[0]);
  }

  return drawn;
}

/** 隨機抽取指定數量，確保至少紅黑各一（2-3顆時） */
export function drawPiecesMixed(count: 1 | 2 | 3, seed?: number): ChessPiece[] {
  if (count === 1) return drawPieces(1, seed);

  const rand = seed !== undefined ? mulberry32(seed) : Math.random;

  // 先從紅方抽一半，黑方抽一半
  const redPool = [...ALL_RED_PIECES];
  const blackPool = [...ALL_BLACK_PIECES];

  if (count === 2) {
    const ri = Math.floor(rand() * redPool.length);
    const bi = Math.floor(rand() * blackPool.length);
    return [redPool[ri], blackPool[bi]];
  }

  // count === 3: 2 from one side, 1 from other
  const primarySide = rand() > 0.5 ? 'red' : 'black';
  const primaryPool = primarySide === 'red' ? redPool : blackPool;
  const secondaryPool = primarySide === 'red' ? blackPool : redPool;

  const p1 = Math.floor(rand() * primaryPool.length);
  const p2 = Math.floor(rand() * (primaryPool.length - 1));
  const s1 = Math.floor(rand() * secondaryPool.length);

  const drawn: ChessPiece[] = [primaryPool[p1]];
  // second draw from primary, skipping the first index
  const adjustedP2 = p2 >= p1 ? p2 + 1 : p2;
  drawn.push(primaryPool[adjustedP2]);
  drawn.push(secondaryPool[s1]);

  return drawn;
}

// ====== 棋子 → 籤詩對應 ======

/**
 * 計算 64 卦索引 (0-63)
 *
 * 抽 1 顆：上下卦相同（8 個重卦）
 * 抽 2 顆：piece1=上卦, piece2=下卦 → 8×8=64 種組合
 * 抽 3 顆：piece1+piece2 合卦為上, piece3 為下
 */
export function computeHexagramIndex(pieces: ChessPiece[]): number {
  const count = pieces.length;

  if (count === 1) {
    // 重卦：上下相同
    const t = pieces[0].trigram; // 0-7
    return t * 8 + t;            // 0, 9, 18, 27, 36, 45, 54, 63
  }

  if (count === 2) {
    const upper = pieces[0].trigram;
    const lower = pieces[1].trigram;
    return upper * 8 + lower;     // 0-63
  }

  // count === 3
  // 前兩顆合卦：取 type trigram XOR 混成
  const upperMixed = (pieces[0].trigram + pieces[1].trigram) % 8;
  const lower = pieces[2].trigram;
  return upperMixed * 8 + lower;
}

/**
 * 根據抽到的棋子選擇籤詩
 * 使用 deterministic hash 確保相同輸入 → 相同輸出
 */
export function selectPoem(pieces: ChessPiece[]): Poem {
  const hexIndex = computeHexagramIndex(pieces);
  // hexIndex 0-63 直接對應 poem id 1-64
  const poemId = (hexIndex % 64) + 1;
  return getPoemById(poemId);
}

/**
 * 以 hash-based 方式選擇籤詩（備用方案）
 * 確保相同抽棋結果永遠得到相同籤詩
 */
export function selectPoemByHash(pieces: ChessPiece[]): Poem {
  const seedString = pieces
    .map(p => `${p.type}-${p.color}`)
    .join('|');
  const hash = hashString(seedString);
  const poemId = (Math.abs(hash) % 64) + 1;
  return getPoemById(poemId);
}

/**
 * 獲取重卦籤詩（抽 1 顆時使用）
 * 8 個重卦分別對應 8 首籤詩
 */
const SELF_HEXAGRAM_POEMS: Record<number, number> = {
  0: 1,   // 乾為天 → poem #1
  7: 2,   // 坤為地 → poem #2
  3: 51,  // 震為雷 → poem #51
  4: 57,  // 巽為風 → poem #57
  2: 30,  // 離為火 → poem #30
  5: 29,  // 坎為水 → poem #29
  6: 52,  // 艮為山 → poem #52
  1: 58,  // 兌為澤 → poem #58
};

export function selectSelfHexagramPoem(piece: ChessPiece): Poem {
  const poemId = SELF_HEXAGRAM_POEMS[piece.trigram] || 1;
  return getPoemById(poemId);
}

// ====== 每日運勢 ======

export function generateDailyFortune() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const seed = hashString(dateStr);
  const rand = mulberry32(seed);

  const pieceTypes: PieceType[] = ['king', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'pawn'];
  const colors: PieceColor[] = ['red', 'black'];
  const directions = ['東', '南', '西', '北', '東南', '西南', '東北', '西北'];
  const levels = ['大吉', '上吉', '中吉', '中平'];
  const colors_lucky = ['紅', '金', '黑', '白', '青', '黃'];

  const fortuneTexts = [
    '今日棋勢如虹，宜積極進取，把握良機。',
    '穩紮穩打，步步為營，收穫在望。',
    '變局將至，保持靈活，隨機應變。',
    '以靜制動，守成待時，不宜躁進。',
    '貴人暗助，內在智慧引領方向。',
    '突破瓶頸，出奇制勝的好時機。',
    '堅持不懈，積累之功終將顯現。',
    '明察秋毫，洞察先機，化險為夷。',
  ];

  return {
    date: dateStr,
    luckyPiece: pieceTypes[Math.floor(rand() * pieceTypes.length)],
    luckyColor: colors_lucky[Math.floor(rand() * colors_lucky.length)],
    luckyDirection: directions[Math.floor(rand() * directions.length)],
    luckyNumber: Math.floor(rand() * 99) + 1,
    fortuneLevel: levels[Math.floor(rand() * levels.length)],
    fortuneText: fortuneTexts[Math.floor(rand() * fortuneTexts.length)],
  };
}

// ====== 解讀輔助 ======

/** 根據抽到的棋子生成摘要 */
export function generateDrawSummary(pieces: ChessPiece[]): string {
  const pieceNames = pieces.map(p => p.displayChar).join('、');
  const colors = pieces.map(p => p.color === 'red' ? '紅' : '黑').join('');

  let summary = `抽得${pieceNames}`;

  if (pieces.length === 1) {
    const p = pieces[0];
    summary += `（${p.color === 'red' ? '紅' : '黑'}方${p.chineseName}），五行屬${p.wuxing}，${p.yinYang}性。`;
  } else {
    summary += `，${colors === '紅紅' ? '雙紅純陽' : colors === '黑黑' ? '雙黑純陰' : '紅黑調和'}之象。`;
  }

  return summary;
}
