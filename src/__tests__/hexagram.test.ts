import {
  XIANTIAN_TO_KINGWEN,
  parseHexagramName,
  hexagramIndex,
  poemIdFromTrigrams,
  hexagramNameOf,
  TRIGRAM_OPPOSITE,
  TRIGRAM_ELEMENTS,
  TRIGRAM_YINYANG,
} from '../services/hexagram';
import { getPoemById, ALL_POEMS } from '../data/poems';
import { ALL_PIECES } from '../data/pieces';
import { computeHexagram, selectPoem } from '../services/divination';

describe('先天序 → 文王序 對照表', () => {
  test('should cover all 64 hexagram indices', () => {
    const keys = Object.keys(XIANTIAN_TO_KINGWEN).map(Number);
    expect(keys).toHaveLength(64);
    for (let i = 0; i < 64; i++) {
      expect(XIANTIAN_TO_KINGWEN[i]).toBeDefined();
    }
  });

  test('should map onto poem ids 1-64 without duplicates', () => {
    const values = Object.values(XIANTIAN_TO_KINGWEN);
    expect(new Set(values).size).toBe(64);
    values.forEach(id => {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(64);
    });
  });

  test('every poem hexagram name must be parseable', () => {
    ALL_POEMS.forEach(poem => {
      expect(parseHexagramName(poem.hexagramName)).not.toBeNull();
    });
  });

  /**
   * 核心迴歸：舊版直接用 `poemId = 先天序index + 1`，
   * 使 64 卦中有 62 卦拿到與卦象不符的籤詩。
   */
  test('the poem returned for any upper/lower pair must match that hexagram', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        const poem = getPoemById(poemIdFromTrigrams(upper, lower));
        expect(parseHexagramName(poem.hexagramName)).toEqual([upper, lower]);
      }
    }
  });

  test('known cases that the old engine got wrong', () => {
    // 坤上坤下 → 坤為地(#2)，舊版誤給火水未濟(#64)
    expect(poemIdFromTrigrams(7, 7)).toBe(2);
    expect(hexagramNameOf(7, 7)).toBe('坤為地');

    // 乾上兌下 → 天澤履(#10)，舊版誤給坤為地(#2)
    expect(poemIdFromTrigrams(0, 1)).toBe(10);
    expect(hexagramNameOf(0, 1)).toBe('天澤履');

    // 乾上離下 → 天火同人(#13)，舊版誤給水雷屯(#3)
    expect(poemIdFromTrigrams(0, 2)).toBe(13);

    // 乾上乾下 → 乾為天(#1)，這是舊版少數碰巧對上的
    expect(poemIdFromTrigrams(0, 0)).toBe(1);
  });

  test('hexagramIndex should be upper*8 + lower', () => {
    expect(hexagramIndex(0, 0)).toBe(0);
    expect(hexagramIndex(7, 7)).toBe(63);
    expect(hexagramIndex(5, 3)).toBe(43);
  });

  test('trigram constant tables should be consistent', () => {
    expect(TRIGRAM_ELEMENTS).toHaveLength(8);
    expect(TRIGRAM_YINYANG).toHaveLength(8);
    // 錯卦互為對方
    for (let t = 0; t < 8; t++) {
      expect(TRIGRAM_OPPOSITE[TRIGRAM_OPPOSITE[t]]).toBe(t);
      expect(TRIGRAM_OPPOSITE[t]).not.toBe(t);
    }
    // 錯卦的陰陽必然相反
    for (let t = 0; t < 8; t++) {
      expect(TRIGRAM_YINYANG[t]).not.toBe(TRIGRAM_YINYANG[TRIGRAM_OPPOSITE[t]]);
    }
  });
});

describe('起卦覆蓋率', () => {
  /**
   * 迴歸：舊版僅以棋種決定卦（7 種棋對 8 卦，兌卦無棋），
   * 抽兩顆只能組出 49 種卦，15 首籤詩永遠抽不到。
   */
  test('exhaustive two-piece draws must reach all 64 poems', () => {
    const reached = new Set<number>();
    for (const first of ALL_PIECES) {
      for (const second of ALL_PIECES) {
        reached.add(computeHexagram([first, second]).poemId);
      }
    }
    expect(reached.size).toBe(64);
  });

  test('single-piece draws must reach all 8 pure hexagrams', () => {
    const reached = new Set<number>();
    ALL_PIECES.forEach(piece => {
      const hex = computeHexagram([piece]);
      expect(hex.upper).toBe(hex.lower);
      reached.add(hex.poemId);
    });
    expect(reached.size).toBe(8);
  });

  test('red and black of the same piece type must yield different hexagrams', () => {
    const red = ALL_PIECES.filter(p => p.color === 'red');
    red.forEach(redPiece => {
      const blackPiece = ALL_PIECES.find(
        p => p.color === 'black' && p.type === redPiece.type,
      )!;
      expect(computeHexagram([redPiece]).poemId).not.toBe(
        computeHexagram([blackPiece]).poemId,
      );
    });
  });

  test('selectPoem must agree with computeHexagram', () => {
    for (const first of ALL_PIECES) {
      for (const second of ALL_PIECES) {
        const pieces = [first, second];
        expect(selectPoem(pieces).id).toBe(computeHexagram(pieces).poemId);
      }
    }
  });

  test('three-piece draws should produce a moving line between 1 and 6', () => {
    const seen = new Set<number>();
    for (const a of ALL_PIECES) {
      for (const b of ALL_PIECES) {
        const hex = computeHexagram([a, b, ALL_PIECES[0]]);
        expect(hex.movingLine).toBeGreaterThanOrEqual(1);
        expect(hex.movingLine).toBeLessThanOrEqual(6);
        seen.add(hex.movingLine!);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
