import { ALL_PIECES, ALL_RED_PIECES, ALL_BLACK_PIECES, pieceTypeToTrigram, getPiecesByType } from '../data/pieces';

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
      expect(piece.wuxing).toMatch(/^(金|木|水|火|土)$/);
      expect(piece.yinYang).toMatch(/^(陰|陽)$/);
      expect(piece.trigram).toBeGreaterThanOrEqual(0);
      expect(piece.trigram).toBeLessThanOrEqual(7);
      expect(piece.keywords.length).toBeGreaterThan(0);
    });
  });

  test('piece types should have correct counts', () => {
    expect(getPiecesByType('king')).toHaveLength(2);     // 帥 + 將
    expect(getPiecesByType('advisor')).toHaveLength(4);   // 2 仕 + 2 士
    expect(getPiecesByType('elephant')).toHaveLength(4);  // 2 相 + 2 象
    expect(getPiecesByType('chariot')).toHaveLength(4);   // 4 車
    expect(getPiecesByType('horse')).toHaveLength(4);     // 4 馬
    expect(getPiecesByType('cannon')).toHaveLength(4);    // 2 炮 + 2 砲
    expect(getPiecesByType('pawn')).toHaveLength(10);     // 5 兵 + 5 卒
  });

  test('pieceTypeToTrigram should return valid trigrams', () => {
    const types = ['king', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'pawn'] as const;
    types.forEach(type => {
      const trigram = pieceTypeToTrigram(type);
      expect(trigram).toBeGreaterThanOrEqual(0);
      expect(trigram).toBeLessThanOrEqual(7);
    });
  });
});
