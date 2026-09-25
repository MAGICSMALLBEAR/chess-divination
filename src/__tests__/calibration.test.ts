// 預測校準（calibration.ts）
//
// 每一條斷言對應一個設計決定：直覺的分數要用「事情本身的結果」打（不是占驗）、
// 卦不換算成機率只比方向、兩個命中數的分母必須是同一批記錄、樣本不足不下結論。

import {
  computeCalibration, readingDirection, isIntuitionPct, isRealizedStatus,
  INTUITION_CHOICES, REALIZED_STATUSES,
  type IntuitionPct, type RealizedStatus,
} from '../services/calibration';
import { MIN_INSIGHT_SAMPLES } from '../services/verification';
import { POEM_LEVELS } from '../data/poems';
import type { DivinationRecord, OutcomeStatus } from '../services/storage';

let seq = 0;
function rec(
  intuition: IntuitionPct | undefined,
  realized: RealizedStatus | undefined,
  over: Partial<DivinationRecord> = {},
  status: OutcomeStatus = 'accurate',
): DivinationRecord {
  return {
    id: `c${seq++}`,
    poemId: 1, poemTitle: 't', poemContent: 'c', poemLevel: '大吉',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
    mode: 'draw', timestamp: 1_000 + seq, isFavorited: false,
    ...(intuition !== undefined ? { intuition } : {}),
    ...(realized !== undefined || status ? {
      outcome: { status, verifiedAt: 2_000, ...(realized ? { realized } : {}) },
    } : {}),
    ...over,
  };
}

describe('選項與型別守門', () => {
  test('直覺五檔對稱於 50%，而且都落在 0–100 之間', () => {
    expect([...INTUITION_CHOICES]).toEqual([10, 30, 50, 70, 90]);
    for (const p of INTUITION_CHOICES) expect(INTUITION_CHOICES).toContain(100 - p);
  });

  test('不認得的直覺值與結果值一律不算（手改的備份、字串化的數字）', () => {
    expect(isIntuitionPct(70)).toBe(true);
    for (const bad of [75, '70', null, undefined, 0, 100]) expect(isIntuitionPct(bad)).toBe(false);
    expect(REALIZED_STATUSES.every(isRealizedStatus)).toBe(true);
    for (const bad of ['accurate', 'maybe', 1, undefined]) expect(isRealizedStatus(bad)).toBe(false);
  });
});

describe('readingDirection：只看等級字面，不換算', () => {
  test('吉三級看好、下下不看好、中平與空字串（靈棋）不表態', () => {
    expect(readingDirection('大吉')).toBe('favorable');
    expect(readingDirection('上吉')).toBe('favorable');
    expect(readingDirection('中吉')).toBe('favorable');
    expect(readingDirection('下下')).toBe('unfavorable');
    expect(readingDirection('中平')).toBeNull();
    expect(readingDirection('')).toBeNull();
  });

  /** 等級表若日後增減，這裡要逼人決定新等級的方向，而不是默默落到「不表態」 */
  test('每一個籤詩等級都被明確歸類過（對著 POEM_LEVELS 窮舉）', () => {
    const classified = { favorable: ['大吉', '上吉', '中吉'], unfavorable: ['下下'], none: ['中平'] };
    const all = [...classified.favorable, ...classified.unfavorable, ...classified.none].sort();
    expect(all).toEqual([...POEM_LEVELS].sort());
    for (const l of classified.favorable) expect(readingDirection(l)).toBe('favorable');
    for (const l of classified.unfavorable) expect(readingDirection(l)).toBe('unfavorable');
    for (const l of classified.none) expect(readingDirection(l)).toBeNull();
  });
});

describe('computeCalibration', () => {
  test('沒有任何資料：分數為 null、不足樣本、五檔都空', () => {
    const r = computeCalibration([]);
    expect(r.samples).toBe(0);
    expect(r.brier).toBeNull();
    expect(r.baselineBrier).toBeNull();
    expect(r.enoughSamples).toBe(false);
    expect(r.buckets.map(b => [b.pct, b.count, b.realizedRate])).toEqual(
      INTUITION_CHOICES.map(p => [p, 0, null]));
  });

  /**
   * 最核心的一條：直覺的分數用「事情本身的結果」打，不是占驗。
   * 占驗是「卦說中了沒」——拿它打直覺，等於用卦去評卦。
   */
  test('分數只看 realized，不看占驗的 status', () => {
    const a = computeCalibration([rec(90, 'yes', {}, 'inaccurate')]);
    const b = computeCalibration([rec(90, 'yes', {}, 'accurate')]);
    expect(a.brier).toBe(b.brier);
    expect(a.brier).toBe(0.01); // (0.9 − 1)²
  });

  test('只記了直覺、還沒回填事情結果的：不進分數，計入 awaiting', () => {
    const r = computeCalibration([rec(70, undefined), rec(30, 'no'), rec(undefined, 'yes')]);
    expect(r.samples).toBe(1);
    expect(r.awaiting).toBe(1);
  });

  test('Brier 與 50% 對照都在同一批上實算；部分如願計半', () => {
    const r = computeCalibration([rec(90, 'yes'), rec(10, 'no'), rec(70, 'partial')]);
    // (0.01 + 0.01 + 0.04) / 3 = 0.02
    expect(r.brier).toBe(0.02);
    // 50% 對照：0.25 + 0.25 + 0 → 0.17，不是固定的 0.25
    expect(r.baselineBrier).toBe(0.17);
  });

  test('逐檔的實際如願率', () => {
    const r = computeCalibration([rec(70, 'yes'), rec(70, 'no'), rec(70, 'partial'), rec(30, 'no')]);
    const byPct = Object.fromEntries(r.buckets.map(b => [b.pct, b]));
    expect(byPct[70]).toMatchObject({ count: 3, realizedRate: 50 });
    expect(byPct[30]).toMatchObject({ count: 1, realizedRate: 0 });
    expect(byPct[90]).toMatchObject({ count: 0, realizedRate: null });
  });

  test(`樣本門檻沿用 MIN_INSIGHT_SAMPLES（${MIN_INSIGHT_SAMPLES}），不另訂一個`, () => {
    const make = (n: number) => Array.from({ length: n }, () => rec(70, 'yes'));
    expect(computeCalibration(make(MIN_INSIGHT_SAMPLES - 1)).enoughSamples).toBe(false);
    expect(computeCalibration(make(MIN_INSIGHT_SAMPLES)).enoughSamples).toBe(true);
  });
});

describe('卦與直覺並列（headToHead）', () => {
  test('兩個命中數的分母是同一批：部分如願、中平、靈棋、直覺 50% 都排除', () => {
    const r = computeCalibration([
      rec(90, 'yes', { poemLevel: '大吉' }),   // 卦對、直覺對
      rec(30, 'yes', { poemLevel: '下下' }),   // 卦錯、直覺錯
      rec(70, 'no', { poemLevel: '下下' }),    // 卦對、直覺錯
      rec(90, 'partial', { poemLevel: '大吉' }), // 排除：部分如願
      rec(90, 'yes', { poemLevel: '中平' }),   // 排除：卦不表態
      rec(90, 'yes', { mode: 'lingqi', poemLevel: '' }), // 排除：靈棋沒有等級
      rec(50, 'yes', { poemLevel: '大吉' }),   // 排除：直覺不表態
    ]);
    expect(r.headToHead).toMatchObject({ count: 3, readingHits: 2, intuitionHits: 1 });
    // 被排除的記錄仍然算進直覺本身的分數——排除只針對「並列」
    expect(r.samples).toBe(7);
  });

  test('並列另有自己的樣本門檻：總樣本夠了、可並列的不夠，也不下並列', () => {
    const records = [
      ...Array.from({ length: MIN_INSIGHT_SAMPLES }, () => rec(50, 'yes')),
      rec(90, 'yes'),
    ];
    const r = computeCalibration(records);
    expect(r.enoughSamples).toBe(true);
    expect(r.headToHead.count).toBe(1);
    expect(r.headToHead.enoughSamples).toBe(false);
  });

  test('不認得的直覺值（例如 75）整筆不算，不會被歸到哪一檔或哪一方', () => {
    const bad = rec(undefined, 'yes', { intuition: 75 as IntuitionPct });
    const r = computeCalibration([bad]);
    expect(r.samples).toBe(0);
    expect(r.awaiting).toBe(0);
    expect(r.headToHead.count).toBe(0);
  });
});
