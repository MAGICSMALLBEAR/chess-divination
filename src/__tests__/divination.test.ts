import { drawPieces, computeHexagramIndex, selectPoem, generateDailyFortune, mulberry32 } from '../services/divination';
import { ALL_PIECES } from '../data/pieces';

describe('Divination Logic', () => {
  test('drawPieces should return correct count', () => {
    [1, 2, 3].forEach(count => {
      const pieces = drawPieces(count as 1 | 2 | 3);
      expect(pieces).toHaveLength(count);
    });
  });

  test('drawPieces should return valid pieces', () => {
    const pieces = drawPieces(2);
    pieces.forEach(piece => {
      expect(ALL_PIECES.some(p => p.id === piece.id)).toBe(true);
    });
  });

  test('drawPieces with seed should be deterministic', () => {
    const a = drawPieces(2, 42);
    const b = drawPieces(2, 42);
    expect(a.map(p => p.id)).toEqual(b.map(p => p.id));
  });

  test('computeHexagramIndex 1 piece should be self-hexagram', () => {
    ALL_PIECES.forEach(piece => {
      const idx = computeHexagramIndex([piece]);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(63);
      // Self-hexagram: 0, 9, 18, 27, 36, 45, 54, 63
      expect(idx % 9).toBe(0);
    });
  });

  test('computeHexagramIndex 2 pieces should cover 0-63', () => {
    const results = new Set<number>();
    // Test a few combinations
    for (let i = 0; i < 50; i++) {
      const pieces = drawPieces(2, i * 100);
      results.add(computeHexagramIndex(pieces));
    }
    expect(results.size).toBeGreaterThan(5); // Should have variety
  });

  test('selectPoem should return a valid poem', () => {
    const pieces = drawPieces(2);
    const poem = selectPoem(pieces);
    expect(poem.id).toBeGreaterThanOrEqual(1);
    expect(poem.id).toBeLessThanOrEqual(64);
    expect(poem.content).toBeTruthy();
  });

  test('daily fortune should have all fields', () => {
    const fortune = generateDailyFortune();
    expect(fortune.date).toBeTruthy();
    expect(fortune.luckyPiece).toBeTruthy();
    expect(fortune.luckyColor).toBeTruthy();
    expect(fortune.luckyDirection).toBeTruthy();
    expect(fortune.luckyNumber).toBeGreaterThanOrEqual(1);
    expect(fortune.luckyNumber).toBeLessThanOrEqual(99);
    expect(fortune.fortuneLevel).toBeTruthy();
    expect(fortune.fortuneText).toBeTruthy();
  });

  test('daily fortune should be deterministic for same date', () => {
    const a = generateDailyFortune();
    const b = generateDailyFortune();
    expect(a).toEqual(b); // Same day → same fortune
  });
});

describe('Mulberry32 PRNG', () => {
  test('should produce deterministic sequence', () => {
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test('different seeds should produce different sequences', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const values1 = Array.from({ length: 5 }, () => rng1());
    const values2 = Array.from({ length: 5 }, () => rng2());
    expect(values1).not.toEqual(values2);
  });
});
