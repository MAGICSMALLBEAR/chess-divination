// 抽棋的隨機性（drawTally.ts）
//
// 重點：預期分佈對回棋盤組成（ALL_PIECES）、卡方右尾機率對得上教科書臨界值、
// 樣本不足不給結論、連續抽棋的計數不互相蓋掉、壞掉的儲存值不讓統計頁拋錯。

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve(); }),
  },
}));

import {
  DRAW_TALLY_KEY, expectedShares, piecesPerTrigram, minDrawsForTest, randomnessReport,
  chiSquareSurvival, normalizeDrawTally, getDrawTally, recordDraw, formatP,
  MIN_EXPECTED_PER_CELL, SIGNIFICANCE_PCT,
} from '../services/drawTally';
import { ALL_PIECES } from '../data/pieces';

beforeEach(() => mockStore.clear());

describe('預期分佈：對回棋盤組成', () => {
  test('每卦的棋子數等於 ALL_PIECES 裡真的對應那一卦的棋子數，比例加起來是 1', () => {
    const counts = piecesPerTrigram();
    counts.forEach((n, trigram) => expect(n).toBe(ALL_PIECES.filter(p => p.trigram === trigram).length));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(ALL_PIECES.length);
    expect(expectedShares().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  test('檢定門檻：最少的那一卦預期次數要到 5——乾坤各 1/32，所以是 160 顆', () => {
    expect(minDrawsForTest()).toBe(160);
    expect(minDrawsForTest() * Math.min(...expectedShares())).toBeGreaterThanOrEqual(MIN_EXPECTED_PER_CELL);
    expect((minDrawsForTest() - 1) * Math.min(...expectedShares())).toBeLessThan(MIN_EXPECTED_PER_CELL);
  });
});

describe('卡方分佈右尾機率', () => {
  test.each([
    // [x, df, p]：教科書臨界值表
    [3.841, 1, 0.05],
    [6.635, 1, 0.01],
    [5.991, 2, 0.05],
    [14.067, 7, 0.05],
    [18.475, 7, 0.01],
    [2.167, 7, 0.95],
  ])('χ²=%s、df=%s → p≈%s', (x, df, p) => {
    expect(chiSquareSurvival(x, df)).toBeCloseTo(p, 3);
  });

  test('x = 0 時 p = 1；極大時趨近 0 但不為負', () => {
    expect(chiSquareSurvival(0, 7)).toBe(1);
    const tiny = chiSquareSurvival(500, 7);
    expect(tiny).toBeGreaterThanOrEqual(0);
    expect(tiny).toBeLessThan(1e-50);
  });
});

describe('報告', () => {
  /** 恰好照預期比例的計數 */
  const exact = (n: number) => piecesPerTrigram().map(c => c * n / ALL_PIECES.length);

  test('沒抽過：總數 0，比例全為 0，不給檢定', () => {
    const r = randomnessReport({ counts: Array(8).fill(0) });
    expect(r.total).toBe(0);
    expect(r.enoughSamples).toBe(false);
    expect(r.pValue).toBeUndefined();
    expect(r.rows.every(row => row.observedShare === 0)).toBe(true);
  });

  test('未滿門檻：列出比例，但不給 p 值（避免把小樣本的起伏讀成結論）', () => {
    const r = randomnessReport({ counts: exact(32) });
    expect(r.total).toBe(32);
    expect(r.enoughSamples).toBe(false);
    expect(r.pValue).toBeUndefined();
    expect(r.deviates).toBeUndefined();
    r.rows.forEach(row => expect(row.observedShare).toBeCloseTo(row.expectedShare, 12));
  });

  test('滿門檻且完全照預期：χ² = 0、p = 1、不算偏離', () => {
    const r = randomnessReport({ counts: exact(160) });
    expect(r.enoughSamples).toBe(true);
    expect(r.chiSquare).toBeCloseTo(0, 12);
    expect(r.pValue).toBeCloseTo(1, 6);
    expect(r.deviates).toBe(false);
  });

  test('八卦等量（忽略棋盤組成）的 160 顆：顯著偏離——量的是「照棋盤」而不是「照均勻」', () => {
    const r = randomnessReport({ counts: Array(8).fill(20) });
    expect(r.enoughSamples).toBe(true);
    expect(r.deviates).toBe(true);
    expect(r.pValue!).toBeLessThan(SIGNIFICANCE_PCT / 100);
  });

  test('p 值格式：太小時不印 0.00', () => {
    expect(formatP(0.4213)).toBe('= 0.42');
    expect(formatP(0.004)).toBe('< 0.01');
  });
});

describe('儲存', () => {
  test('壞值一律當作從零開始，不拋錯', () => {
    const zero = { counts: Array(8).fill(0) };
    expect(normalizeDrawTally(null)).toEqual(zero);
    expect(normalizeDrawTally({ counts: [1, 2, 3] })).toEqual(zero);
    expect(normalizeDrawTally({ counts: [1, 2, 3, 4, 5, 6, 7, -1] })).toEqual(zero);
    expect(normalizeDrawTally({ counts: [1, 2, 3, 4, 5, 6, 7, 1.5] })).toEqual(zero);
    expect(normalizeDrawTally({ counts: [1, 2, 3, 4, 5, 6, 7, 8] })).toEqual({ counts: [1, 2, 3, 4, 5, 6, 7, 8] });
  });

  test('儲存內容不是 JSON 時，讀回來是零', async () => {
    mockStore.set(DRAW_TALLY_KEY, '{壞掉');
    expect((await getDrawTally()).counts).toEqual(Array(8).fill(0));
  });

  test('每顆棋各算一次；連續兩次抽棋（抽了馬上重抽）不互相蓋掉', async () => {
    await Promise.all([recordDraw([0, 6]), recordDraw([6, 7, 1])]);
    expect((await getDrawTally()).counts).toEqual([1, 1, 0, 0, 0, 0, 2, 1]);
  });

  test('超出範圍的卦序不計入', async () => {
    await recordDraw([8, -1, 2.5, 3]);
    expect((await getDrawTally()).counts).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
  });
});
