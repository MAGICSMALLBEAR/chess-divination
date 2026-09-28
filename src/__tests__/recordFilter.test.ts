import { filterRecords, isFiltering, pendingIdsOf, NO_FILTER } from '../services/recordFilter';
import type { DivinationRecord } from '../services/storage';

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 28, 12).getTime();

function rec(id: string, mode: DivinationRecord['mode'], daysAgo: number, verified = false): DivinationRecord {
  return {
    id, mode, timestamp: NOW - daysAgo * DAY,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '', poemLevel: '大吉',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [], isFavorited: false,
    ...(verified ? { outcome: { status: 'accurate', verifiedAt: NOW } } : {}),
  } as DivinationRecord;
}

const history = [
  rec('draw-old', 'draw', 20),
  rec('draw-new', 'draw', 2),
  rec('board-old', 'board', 30),
  rec('lingqi-done', 'lingqi', 40, true),
];

describe('pendingIdsOf', () => {
  test('與 pendingVerification 同一個判定：滿天數且沒回填才算，剛占的不算', () => {
    expect([...pendingIdsOf(history, NOW, 14)].sort()).toEqual(['board-old', 'draw-old']);
  });

  test('天數跟著設定走（7 天時 20 天前的算、2 天前的仍不算）', () => {
    expect(pendingIdsOf(history, NOW, 7).has('draw-new')).toBe(false);
    expect(pendingIdsOf(history, NOW, 1).has('draw-new')).toBe(true);
  });
});

describe('filterRecords', () => {
  const pending = pendingIdsOf(history, NOW, 14);

  test('不篩選：原樣回傳且保留順序', () => {
    expect(filterRecords(history, NO_FILTER, pending).map(r => r.id))
      .toEqual(['draw-old', 'draw-new', 'board-old', 'lingqi-done']);
  });

  test('待回填：只列滿期未回填的，不是「沒有 outcome 就算」', () => {
    expect(filterRecords(history, { status: 'pending', mode: null }, pending).map(r => r.id))
      .toEqual(['draw-old', 'board-old']);
  });

  test('已回填', () => {
    expect(filterRecords(history, { status: 'verified', mode: null }, pending).map(r => r.id))
      .toEqual(['lingqi-done']);
  });

  test('模式與狀態同時生效', () => {
    expect(filterRecords(history, { status: 'pending', mode: 'draw' }, pending).map(r => r.id))
      .toEqual(['draw-old']);
    expect(filterRecords(history, { status: 'all', mode: 'lingqi' }, pending).map(r => r.id))
      .toEqual(['lingqi-done']);
  });

  test('收藏是歷史的副本：用歷史算出的 id 一樣篩得到收藏裡的那一筆', () => {
    const favoriteCopy = { ...history[0], isFavorited: true };
    expect(filterRecords([favoriteCopy], { status: 'pending', mode: null }, pending)).toHaveLength(1);
  });
});

test('isFiltering 分得出「有條件」與「沒條件」', () => {
  expect(isFiltering(NO_FILTER)).toBe(false);
  expect(isFiltering({ status: 'pending', mode: null })).toBe(true);
  expect(isFiltering({ status: 'all', mode: 'board' })).toBe(true);
});
