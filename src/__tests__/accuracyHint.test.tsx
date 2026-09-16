// AccuracyHint：個人化應驗率提示
//
// 迴歸重點：MIN_INSIGHT_SAMPLES 的門檻要在這裡也生效（S64 教訓——
// 「有真相來源」不等於「有人在用」，每個讀 enoughSamples 的地方都要
// 各自驗過，不能只信 verification.ts 自己的測試）；子領域要先映回主類別
// 才能比對到；樣本足夠時文案要帶對三個數字。

const mockGetHistory = jest.fn();
jest.mock('@/services/storage', () => ({
  __esModule: true,
  getHistory: () => mockGetHistory(),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AccuracyHint from '../components/AccuracyHint';
import type { DivinationRecord, OutcomeStatus } from '../services/storage';

let seq = 0;
function record(category: string, status?: OutcomeStatus): DivinationRecord {
  seq++;
  return {
    id: `r${seq}`,
    poemId: 1, poemTitle: '', poemContent: '', poemLevel: '中吉',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
    mode: 'draw',
    questionCategory: category,
    timestamp: Date.now(),
    isFavorited: false,
    outcome: status ? { status, verifiedAt: Date.now() } : undefined,
  };
}

function renderHint(category?: string) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<AccuracyHint category={category} />);
  });
  return tree;
}

/** 元件的 getHistory().then() 要等一輪微任務才會 setState，測試裡要 flush */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AccuracyHint', () => {
  beforeEach(() => {
    seq = 0;
    mockGetHistory.mockReset();
  });

  test('樣本不足（少於 5 則已驗）時不渲染', async () => {
    mockGetHistory.mockResolvedValue([
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage'), // 未回填，不計入分母
    ]);
    const tree = renderHint('marriage');
    await flush();
    expect(tree.toJSON()).toBeNull();
  });

  test('樣本足夠時渲染，帶出已驗筆數與應驗率', async () => {
    mockGetHistory.mockResolvedValue([
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'inaccurate'),
    ]);
    const tree = renderHint('marriage');
    await flush();
    const json = tree.toJSON();
    expect(json).not.toBeNull();
    const text = JSON.stringify(json);
    // 5 則已驗、4 則應驗、1 則未應驗 → 加權 4/5 = 80%
    expect(text).toContain('5');
    expect(text).toContain('80');
  });

  test('子領域先映回主類別才比對——用子領域 key 問，仍找得到主類別的統計', async () => {
    mockGetHistory.mockResolvedValue([
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
      record('marriage', 'accurate'),
    ]);
    // 'relationship' 是 marriage 底下的子領域（見 questionCategories.ts）
    const tree = renderHint('relationship');
    await flush();
    expect(tree.toJSON()).not.toBeNull();
  });

  test('沒有分類（general）且樣本不足時不渲染', async () => {
    mockGetHistory.mockResolvedValue([record('marriage', 'accurate')]);
    const tree = renderHint(undefined);
    await flush();
    expect(tree.toJSON()).toBeNull();
  });
});
