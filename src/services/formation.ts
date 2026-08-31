// 兩軍對壘陣 — 起卦引擎與兩軍對比解讀
//
// 牌陣結構：紅黑雙方各在己方半場布三子。每方三子以「棋子顏色」成爻——
// 紅為陽、黑為陰，由河邊向外依序為初、二、三爻，合成一方之卦；
// 紅方為上卦、黑方為下卦。動爻取雙方子力差（紅減黑）入梅花公式。
//
// 這是刻意與抽棋不同的起卦路徑：抽棋由「棋種＋顏色」對應的卦氣起卦，
// 這裡直接以紅黑（陰陽）成爻——象棋最核心的紅黑對立在這個牌陣裡
// 就是卦爻本身，楚河漢界因此不只是裝飾。
//
// 解讀層另附一段兩軍強弱對比（子力統計與強弱判斷）。與 position.ts
// 同一理由，這份文字是中文限定的命理資料，存進 positionSummary，
// 不在三語翻譯範圍內。

import type { ChessPiece, PieceType } from '@/data/pieces';
import {
  YANG, YIN, type LineValue,
  trigramFromLines, hexagramIndex, hexagramNameOf, poemIdFromTrigrams,
} from './hexagram';
import { hourBranchNumber } from './date';
import type { HexagramResult } from './divination';

/** 落子於半場的棋子。結構上與 useBoardDivination 的 PlacedPiece 相容。 */
export interface FormationPiece {
  piece: ChessPiece;
  col: number;
  row: number;
}

/** 每方落子數 */
export const FORMATION_PER_SIDE = 3;

/**
 * 紅方半場（棋盤下方，row 5–9）與黑方半場（上方，row 0–4）。
 * 依傳統象棋「紅在下、黑在上」；楚河漢界在 row 4 與 row 5 之間。
 */
export const FORMATION_RED_ROWS: readonly [number, number] = [5, 9];
export const FORMATION_BLACK_ROWS: readonly [number, number] = [0, 4];

/**
 * 棋子子力。取象棋通行的子力估值：車最重，砲略高於馬，仕相同值，
 * 兵最輕；帥／將為君主重器，與車同值。只做強弱對比之用，
 * 不是正規棋力引擎——已寫明，不是隱藏的評分系統。
 */
export const PIECE_FORCE: Record<PieceType, number> = {
  king: 9, chariot: 9, cannon: 5, horse: 4, elephant: 2, advisor: 2, pawn: 1,
};

/** 判斷格位屬於哪一方半場。row 越界時丟例外——半場分界必須是完整的。 */
export function formationSideOf(row: number): 'red' | 'black' {
  if (row >= FORMATION_RED_ROWS[0] && row <= FORMATION_RED_ROWS[1]) return 'red';
  if (row >= FORMATION_BLACK_ROWS[0] && row <= FORMATION_BLACK_ROWS[1]) return 'black';
  throw new Error(`格位不在任何半場內：row ${row}`);
}

/** 各半場已落子數。供棋盤限制落子與解讀層的成陣檢查共用。 */
export function formationCounts(pieces: FormationPiece[]): { red: number; black: number } {
  return {
    red: pieces.filter(pp => pp.row >= FORMATION_RED_ROWS[0] && pp.row <= FORMATION_RED_ROWS[1]).length,
    black: pieces.filter(pp => pp.row >= FORMATION_BLACK_ROWS[0] && pp.row <= FORMATION_BLACK_ROWS[1]).length,
  };
}

/**
 * 半場三子 → 三爻（自下而上）。
 *
 * 爻序由河邊向外數：最靠近楚河漢界的一排是初爻（前沿），最遠的是上爻
 * （後方）。同一排多子時依 col 由左至右。這個次序讓「布在哪裡」直接
 * 決定爻位——同三顆棋、不同陣形，成不同的卦。
 *
 * 棋子顏色成爻：紅為陽、黑為陰。任一半場的三子必須恰好三顆，
 * 否則不是完整的兩軍對壘陣，丟例外而非靜默成卦。
 */
export function formationLines(pieces: FormationPiece[], side: 'red' | 'black'): LineValue[] {
  const rows = side === 'red' ? FORMATION_RED_ROWS : FORMATION_BLACK_ROWS;
  // 離河邊的排距：row 5（紅方前沿）與 row 4（黑方前沿）為 1，向外遞增
  const distance = (row: number) => (side === 'red' ? row - 4 : 5 - row);

  const sidePieces = pieces.filter(pp => pp.row >= rows[0] && pp.row <= rows[1]);
  if (sidePieces.length !== FORMATION_PER_SIDE) {
    throw new Error(
      `兩軍對壘陣需要${side === 'red' ? '紅' : '黑'}方半場恰好 ${FORMATION_PER_SIDE} 子，目前 ${sidePieces.length} 子`,
    );
  }

  return [...sidePieces]
    .sort((a, b) => distance(a.row) - distance(b.row) || a.col - b.col)
    .map(pp => (pp.piece.color === 'red' ? YANG : YIN));
}

/** 某一方的子力總和 */
export function formationForce(pieces: FormationPiece[], side: 'red' | 'black'): number {
  return pieces
    .filter(pp => {
      const rows = side === 'red' ? FORMATION_RED_ROWS : FORMATION_BLACK_ROWS;
      return pp.row >= rows[0] && pp.row <= rows[1];
    })
    .reduce((sum, pp) => sum + PIECE_FORCE[pp.piece.type], 0);
}

/**
 * 由兩軍對壘陣起卦。
 *
 * 上卦＝紅方陣、下卦＝黑方陣；動爻依梅花公式
 * （上卦數 + 下卦數 + 其餘數 + 時辰數）mod 6，得 0 為上爻。
 * 「其餘數」是雙方子力差（紅減黑）——方向本身就是訊息：紅強為正、
 * 黑強為負，兩者動爻不同，故不取絕對值。時辰沿用既有引擎的必要參數
 * （同一陣在不同時辰起卦，變化的關鍵所在本就不同，見 divination.ts）。
 */
export function computeFormationHexagram(
  pieces: FormationPiece[],
  options: { hourBranch?: number } = {},
): HexagramResult {
  const upper = trigramFromLines(formationLines(pieces, 'red'));
  const lower = trigramFromLines(formationLines(pieces, 'black'));

  const hourBranch = options.hourBranch ?? hourBranchNumber();
  const forceDiff = formationForce(pieces, 'red') - formationForce(pieces, 'black');
  const sum = (upper + 1) + (lower + 1) + forceDiff + hourBranch;
  const remainder = ((sum % 6) + 6) % 6;

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

/**
 * 兩軍強弱對比——解讀層新增的一段，接在棋位解讀之前。
 * 中文限定：與 position.ts 同一理由，生成的命理文字存進 positionSummary，
 * 本就是中文資料，不在三語翻譯範圍內。
 */
export function formationForceReading(pieces: FormationPiece[]): string {
  const describe = (side: 'red' | 'black') => {
    const sidePieces = pieces
      .filter(pp => {
        const rows = side === 'red' ? FORMATION_RED_ROWS : FORMATION_BLACK_ROWS;
        return pp.row >= rows[0] && pp.row <= rows[1];
      })
      .sort((a, b) => PIECE_FORCE[b.piece.type] - PIECE_FORCE[a.piece.type]);
    const total = sidePieces.reduce((sum, pp) => sum + PIECE_FORCE[pp.piece.type], 0);
    const detail = sidePieces.map(pp => `${pp.piece.displayChar}${PIECE_FORCE[pp.piece.type]}`).join('＋');
    return `${side === 'red' ? '紅方陣' : '黑方陣'}：${detail}＝${total}`;
  };

  const redForce = formationForce(pieces, 'red');
  const blackForce = formationForce(pieces, 'black');
  const verdict = redForce > blackForce
    ? '紅方子力較盛，主動之勢在我——對立之事，勢強者主攻，但強兵亦忌輕進。'
    : redForce < blackForce
      ? '黑方子力較盛，對方來勢較強——先固守己方，待其勢衰再圖進取。'
      : '雙方勢均力敵，勝負繫於一念——不宜正面硬碰，慎擇時機方見分曉。';

  return `兩軍對壘：\n${describe('red')}\n${describe('black')}\n${verdict}`;
}
