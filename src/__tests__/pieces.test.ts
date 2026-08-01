import {
  ALL_PIECES, ALL_RED_PIECES, ALL_BLACK_PIECES,
  pieceTrigram, getPiecesByType,
  type PieceType,
} from '../data/pieces';
import { TRIGRAM_ELEMENTS, TRIGRAM_OPPOSITE, TRIGRAM_YINYANG } from '../services/hexagram';

const ALL_TYPES: PieceType[] = ['king', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'pawn'];

describe('Chess Pieces', () => {
  test('should have exactly 32 pieces', () => {
    expect(ALL_PIECES).toHaveLength(32);
  });

  test('should have 16 red and 16 black pieces', () => {
    expect(ALL_RED_PIECES).toHaveLength(16);
    expect(ALL_BLACK_PIECES).toHaveLength(16);
  });

  test('each piece should have required fields', () => {
    ALL_PIECES.forEach(piece => {
      expect(piece.id).toBeTruthy();
      expect(piece.type).toBeTruthy();
      expect(piece.color).toMatch(/^(red|black)$/);
      expect(piece.displayChar).toBeTruthy();
      expect(piece.guaElement).toMatch(/^(金|木|水|火|土)$/);
      expect(piece.imageryElement).toMatch(/^(金|木|水|火|土)$/);
      expect(piece.yinYang).toMatch(/^(陰|陽)$/);
      expect(piece.trigram).toBeGreaterThanOrEqual(0);
      expect(piece.trigram).toBeLessThanOrEqual(7);
      expect(piece.keywords.length).toBeGreaterThan(0);
    });
  });

  test('piece ids should be unique', () => {
    const ids = new Set(ALL_PIECES.map(p => p.id));
    expect(ids.size).toBe(32);
  });

  test('piece types should have correct counts', () => {
    expect(getPiecesByType('king')).toHaveLength(2);      // 帥 + 將
    expect(getPiecesByType('advisor')).toHaveLength(4);   // 2 仕 + 2 士
    expect(getPiecesByType('elephant')).toHaveLength(4);  // 2 相 + 2 象
    expect(getPiecesByType('chariot')).toHaveLength(4);   // 4 車
    expect(getPiecesByType('horse')).toHaveLength(4);     // 4 馬
    expect(getPiecesByType('cannon')).toHaveLength(4);    // 2 炮 + 2 砲
    expect(getPiecesByType('pawn')).toHaveLength(10);     // 5 兵 + 5 卒
  });

  test('pieceTrigram should return valid trigrams for every type and color', () => {
    ALL_TYPES.forEach(type => {
      (['red', 'black'] as const).forEach(color => {
        const trigram = pieceTrigram(type, color);
        expect(trigram).toBeGreaterThanOrEqual(0);
        expect(trigram).toBeLessThanOrEqual(7);
      });
    });
  });

  // ====== Phase 1 迴歸：舊版兌卦永遠無棋可對應 ======

  test('all 8 trigrams must be reachable from the 32 pieces', () => {
    const reachable = new Set(ALL_PIECES.map(p => p.trigram));
    expect(reachable.size).toBe(8);
    for (let t = 0; t < 8; t++) {
      expect(reachable.has(t)).toBe(true);
    }
  });

  test('red and black of the same piece type must be opposite trigrams (錯卦)', () => {
    ALL_TYPES.forEach(type => {
      const red = pieceTrigram(type, 'red');
      const black = pieceTrigram(type, 'black');
      expect(TRIGRAM_OPPOSITE[red]).toBe(black);
    });
  });

  test('king anchors 紅陽黑陰: 帥為乾（純陽）、將為坤（純陰）', () => {
    expect(pieceTrigram('king', 'red')).toBe(0);   // 乾
    expect(pieceTrigram('king', 'black')).toBe(7); // 坤
  });

  test('guaElement and yinYang must be derived from the trigram', () => {
    ALL_PIECES.forEach(piece => {
      expect(piece.guaElement).toBe(TRIGRAM_ELEMENTS[piece.trigram]);
      expect(piece.yinYang).toBe(TRIGRAM_YINYANG[piece.trigram]);
    });
  });
});
