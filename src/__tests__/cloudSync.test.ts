// cloudSync.ts 測試
//
// 合併邏輯出錯就是使用者的占卜記錄被覆蓋或遺失，
// 因此重點在於「本地資料不能被弄丟」與「遠端的垃圾不能混進來」。

// mergeFromCloud 會寫回 AsyncStorage，以記憶體 Map 模擬（與 storage.test 同款）
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { mergeHistories, mergeFromCloud } from '../services/cloudSync';
import { STORAGE_KEYS } from '../services/storage';

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

  /**
   * 迴歸：換機後本地副本尚未回填占驗，雲端已回填——
   * 「先出現者優先」會讓未回填的本地版壓掉占驗結果，那筆占驗永久遺失。
   */
  test('有占驗結果的版本勝過未回填的版本', () => {
    const outcome = { status: 'accurate', verifiedAt: 100 };
    const cloud = [{ id: 'a', timestamp: 1, outcome }];
    const merged = mergeHistories([rec('a', 1)], cloud) as typeof cloud;

    expect(merged).toHaveLength(1);
    expect(merged[0].outcome).toEqual(outcome);
  });

  test('兩邊都有占驗時取較新的 verifiedAt', () => {
    const local = [{ id: 'a', timestamp: 1, outcome: { status: 'inaccurate', verifiedAt: 50 } }];
    const cloud = [{ id: 'a', timestamp: 1, outcome: { status: 'accurate', verifiedAt: 200 } }];
    const merged = mergeHistories(local, cloud) as typeof cloud;

    expect(merged[0].outcome?.status).toBe('accurate');
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

  test('超出上限時絕不丟僅本地存在的記錄', () => {
    const local = Array.from({ length: 400 }, (_, i) => rec(`L${i}`, i));       // 0–399
    const cloud = Array.from({ length: 400 }, (_, i) => rec(`C${i}`, 1000 + i)); // 1000–1399
    const merged = mergeHistories(local, cloud);

    // 僅本地存在的 400 筆全數保留——同步本身不該摧毀尚未上傳的歷史
    expect(merged.filter(r => r.id.startsWith('L'))).toHaveLength(400);
    // 犧牲的是最舊的雲端端共有記錄（另一端仍保有，下次同步補回）
    expect(merged.filter(r => r.id.startsWith('C'))).toHaveLength(100);
    expect(merged.some(r => r.id === 'C0')).toBe(false);
    expect(merged.some(r => r.id === 'C300')).toBe(true);
    // 本地記錄排在最前（其中最新的一筆居首），不被截斷擠掉
    expect(merged[0].id).toBe('L399');
  });
});

describe('墓碑（已刪除記錄的同步）', () => {
  beforeEach(() => { mockStore.clear(); });

  /** 沒有墓碑合併，使用者刪掉的記錄會在下一次同步時全部復活 */
  test('雲端已刪除的 id 不會在本地復活', async () => {
    mockStore.set(STORAGE_KEYS.HISTORY, JSON.stringify([rec('a', 1), rec('b', 2)]));

    const merged = await mergeFromCloud({
      version: 2,
      timestamp: 0,
      history: [rec('a', 1), rec('b', 2)],
      favorites: [],
      settings: {},
      dailyFortune: null,
      deletedIds: ['a'],
    });

    expect((merged.history as { id: string }[]).map(r => r.id)).toEqual(['b']);
    expect(merged.deletedIds).toContain('a');
    // 合併結果已寫回本地儲存
    expect(JSON.parse(mockStore.get(STORAGE_KEYS.HISTORY)!).map((r: { id: string }) => r.id)).toEqual(['b']);
  });

  test('本地與雲端的刪除集合取聯集', async () => {
    mockStore.set(STORAGE_KEYS.HISTORY, JSON.stringify([rec('a', 1), rec('b', 2)]));
    mockStore.set(STORAGE_KEYS.DELETED, JSON.stringify(['a']));

    const merged = await mergeFromCloud({
      version: 2,
      timestamp: 0,
      history: [rec('a', 1), rec('b', 2), rec('c', 3)],
      favorites: [],
      settings: {},
      dailyFortune: null,
      deletedIds: ['b'],
    });

    expect((merged.history as { id: string }[]).map(r => r.id)).toEqual(['c']);
    expect(merged.deletedIds?.sort()).toEqual(['a', 'b']);
  });
});
