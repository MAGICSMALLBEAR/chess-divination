// cloudSync.ts 測試
//
// 合併邏輯出錯就是使用者的占卜記錄被覆蓋或遺失，
// 因此重點在於「本地資料不能被弄丟」與「遠端的垃圾不能混進來」。

import { mergeHistories } from '../services/cloudSync';

const rec = (id: string, timestamp: number) => ({ id, timestamp });

describe('合併歷史記錄', () => {
  test('兩邊都空時得到空陣列', () => {
    expect(mergeHistories([], [])).toEqual([]);
  });

  test('本地為空時採用雲端記錄', () => {
    const cloud = [rec('a', 3), rec('b', 1)];
    expect(mergeHistories([], cloud).map(r => r.id)).toEqual(['a', 'b']);
  });

  test('雲端為空時保留本地記錄', () => {
    const local = [rec('a', 2), rec('b', 1)];
    expect(mergeHistories(local, []).map(r => r.id)).toEqual(['a', 'b']);
  });

  test('兩邊的記錄都會被保留', () => {
    const merged = mergeHistories([rec('a', 1)], [rec('b', 2)]);
    expect(merged.map(r => r.id).sort()).toEqual(['a', 'b']);
  });

  test('依時間由新到舊排序', () => {
    const merged = mergeHistories([rec('old', 1)], [rec('new', 9), rec('mid', 5)]);
    expect(merged.map(r => r.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('去重', () => {
  test('相同 id 只保留一筆', () => {
    const merged = mergeHistories([rec('a', 1)], [rec('a', 1)]);
    expect(merged).toHaveLength(1);
  });

  /** 本地是使用者當下的真實狀態（含收藏標記等），不該被遠端覆寫 */
  test('id 重複時保留本地版本', () => {
    const local = [{ id: 'a', timestamp: 1, isFavorited: true }];
    const cloud = [{ id: 'a', timestamp: 1, isFavorited: false }];
    const merged = mergeHistories(local, cloud) as typeof local;

    expect(merged).toHaveLength(1);
    expect(merged[0].isFavorited).toBe(true);
  });

  test('雲端內部自身重複也只保留一筆', () => {
    const merged = mergeHistories([], [rec('a', 1), rec('a', 2)]);
    expect(merged).toHaveLength(1);
  });
});

describe('無效輸入的防護', () => {
  /** 迴歸：本地毀損或遠端回傳非預期格式時，不該整個炸掉或寫入垃圾 */
  test('非陣列輸入視為空，不拋錯', () => {
    expect(() => mergeHistories(null, null)).not.toThrow();
    expect(mergeHistories(null, null)).toEqual([]);
    expect(mergeHistories('字串', { a: 1 })).toEqual([]);
    expect(mergeHistories(undefined, 42)).toEqual([]);
  });

  test('丟棄缺少 id 或 timestamp 的項目', () => {
    const cloud = [
      rec('good', 1),
      { id: 'no-timestamp' },
      { timestamp: 5 },
      null,
      '字串',
      42,
    ];
    const merged = mergeHistories([], cloud);
    expect(merged.map(r => r.id)).toEqual(['good']);
  });

  test('型別不符的 id / timestamp 也會被丟棄', () => {
    const cloud = [
      { id: 123, timestamp: 1 },
      { id: 'a', timestamp: '不是數字' },
      rec('ok', 2),
    ];
    expect(mergeHistories([], cloud).map(r => r.id)).toEqual(['ok']);
  });

  test('本地含無效項目時仍能合併有效的部分', () => {
    const local = [rec('a', 2), null, { broken: true }];
    const merged = mergeHistories(local, [rec('b', 1)]);
    expect(merged.map(r => r.id)).toEqual(['a', 'b']);
  });
});

describe('數量上限', () => {
  /** 與 storage.ts 的歷史上限一致，避免同步後把儲存撐爆 */
  test('合併結果不超過 500 筆', () => {
    const local = Array.from({ length: 400 }, (_, i) => rec(`L${i}`, i));
    const cloud = Array.from({ length: 400 }, (_, i) => rec(`C${i}`, 1000 + i));
    const merged = mergeHistories(local, cloud);

    expect(merged).toHaveLength(500);
  });

  test('超出上限時捨棄最舊的，保留最新的', () => {
    const local = Array.from({ length: 400 }, (_, i) => rec(`L${i}`, i));       // 0–399
    const cloud = Array.from({ length: 400 }, (_, i) => rec(`C${i}`, 1000 + i)); // 1000–1399
    const merged = mergeHistories(local, cloud);

    // 雲端那批較新，應全數留下
    expect(merged.filter(r => r.id.startsWith('C'))).toHaveLength(400);
    // 最舊的本地記錄應被擠出
    expect(merged.some(r => r.id === 'L0')).toBe(false);
    // 最新的一筆是雲端最後一筆
    expect(merged[0].id).toBe('C399');
  });
});
