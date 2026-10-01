import { categoryFilterOptions, filterRecords, isFiltering, pendingIdsOf, recordCategoryDomain, NO_FILTER } from '../services/recordFilter';
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
    expect(filterRecords(history, { status: 'pending', mode: null, category: null }, pending).map(r => r.id))
      .toEqual(['draw-old', 'board-old']);
  });

  test('已回填', () => {
    expect(filterRecords(history, { status: 'verified', mode: null, category: null }, pending).map(r => r.id))
      .toEqual(['lingqi-done']);
  });

  test('模式與狀態同時生效', () => {
    expect(filterRecords(history, { status: 'pending', mode: 'draw', category: null }, pending).map(r => r.id))
      .toEqual(['draw-old']);
    expect(filterRecords(history, { status: 'all', mode: 'lingqi', category: null }, pending).map(r => r.id))
      .toEqual(['lingqi-done']);
  });

  test('收藏是歷史的副本：用歷史算出的 id 一樣篩得到收藏裡的那一筆', () => {
    const favoriteCopy = { ...history[0], isFavorited: true };
    expect(filterRecords([favoriteCopy], { status: 'pending', mode: null, category: null }, pending)).toHaveLength(1);
  });
});

test('isFiltering 分得出「有條件」與「沒條件」', () => {
  expect(isFiltering(NO_FILTER)).toBe(false);
  expect(isFiltering({ status: 'pending', mode: null, category: null })).toBe(true);
  expect(isFiltering({ status: 'all', mode: 'board', category: null })).toBe(true);
});

describe('問事類別篩選（P4）', () => {
  const withCat = (id: string, questionCategory?: string): DivinationRecord =>
    ({ ...rec(id, 'draw', 1), questionCategory }) as DivinationRecord;
  const records = [
    withCat('career', 'career'),
    withCat('jobSearch', 'jobSearch'),
    withCat('wealth', 'wealth'),
    withCat('none'),
    withCat('custom', 'custom-1'),
  ];
  const none = new Set<string>();

  test('選主類別也列出它的子領域：與統計頁分項應驗率同一種分法', () => {
    expect(filterRecords(records, { ...NO_FILTER, category: 'career' }, none).map(r => r.id))
      .toEqual(['career', 'jobSearch']);
  });

  test('沒選類別的記錄算綜合——結果頁上顯示的就是「綜合」', () => {
    expect(recordCategoryDomain({})).toBe('general');
    expect(filterRecords(records, { ...NO_FILTER, category: 'general' }, none).map(r => r.id))
      .toEqual(['none']);
  });

  test('自訂類別自成一類', () => {
    expect(filterRecords(records, { ...NO_FILTER, category: 'custom-1' }, none).map(r => r.id))
      .toEqual(['custom']);
  });

  test('與狀態篩選同時生效', () => {
    const verified = { ...withCat('career-done', 'career'), outcome: { status: 'accurate', verifiedAt: NOW } } as DivinationRecord;
    expect(filterRecords([...records, verified], { status: 'verified', mode: null, category: 'career' }, none).map(r => r.id))
      .toEqual(['career-done']);
  });

  test('選項只列出現過的主類別，依給定順序排，不認得的排最後', () => {
    const order = ['general', 'career', 'wealth', 'jobSearch', 'custom-1'];
    expect(categoryFilterOptions(records, order)).toEqual(['general', 'career', 'wealth', 'custom-1']);
    // 子領域不會自己成為選項（已映回事業）
    expect(categoryFilterOptions(records, order)).not.toContain('jobSearch');
    expect(categoryFilterOptions([withCat('x', 'custom-gone'), withCat('y', 'career')], order))
      .toEqual(['career', 'custom-gone']);
  });

  test('isFiltering 認類別', () => {
    expect(isFiltering({ ...NO_FILTER, category: 'career' })).toBe(true);
  });
});
