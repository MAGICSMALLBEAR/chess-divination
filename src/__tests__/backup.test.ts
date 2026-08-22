// backup.ts 測試
//
// 備份還原一旦出錯就是使用者的占卜記錄全沒了，或被垃圾資料覆蓋，
// 因此重點在於「不該還原的內容要擋下來」。

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

import { buildBackup, parseBackup, applyBackup } from '../services/backup';

const HISTORY = '@chess_divination_history';
const FAVORITES = '@chess_divination_favorites';
const SETTINGS = '@chess_divination_settings';
const DELETED = '@chess_divination_deleted';

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('產生備份', () => {
  test('備份包含版本與日期', async () => {
    const b = await buildBackup();
    expect(b.version).toBe(1);
    expect(typeof b.date).toBe('string');
    expect(Number.isNaN(Date.parse(b.date))).toBe(false);
  });

  test('備份涵蓋歷史／收藏／設定／刪除墓碑四個鍵', async () => {
    const b = await buildBackup();
    expect(Object.keys(b.data).sort()).toEqual([HISTORY, FAVORITES, SETTINGS, DELETED].sort());
  });

  test('空儲存時各鍵為 null 而非拋錯', async () => {
    const b = await buildBackup();
    expect(b.data[HISTORY]).toBeNull();
  });

  test('備份會帶出實際存放的內容', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a', poemTitle: '乾為天' }]));
    const b = await buildBackup();
    expect(b.data[HISTORY]).toEqual([{ id: 'a', poemTitle: '乾為天' }]);
  });

  test('備份可序列化為 JSON 並還原回同樣內容', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a' }]));
    const b = await buildBackup();
    expect(JSON.parse(JSON.stringify(b)).data[HISTORY]).toEqual([{ id: 'a' }]);
  });
});

describe('解析備份檔', () => {
  test('合法備份檔可解析', () => {
    const json = JSON.stringify({
      version: 1, date: '2026-08-08T00:00:00.000Z',
      data: { [HISTORY]: [{ id: 'a' }], [SETTINGS]: { themeMode: 'dark' } },
    });
    const r = parseBackup(json);
    expect(r).not.toBeNull();
    expect(r![HISTORY]).toEqual([{ id: 'a' }]);
    expect(r![SETTINGS]).toEqual({ themeMode: 'dark' });
  });

  /**
   * 迴歸：原本 JSON.parse 直接寫在檔案讀取的 async 回呼裡，
   * 格式不對會讓整個 Promise 永遠不 resolve，UI 靜靜卡住。
   */
  test('非 JSON 內容回傳 null 而非拋錯', () => {
    expect(parseBackup('這不是 JSON')).toBeNull();
    expect(parseBackup('')).toBeNull();
    expect(parseBackup('{ 壞掉的')).toBeNull();
  });

  test('缺少 data 欄位視為無效', () => {
    expect(parseBackup(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseBackup(JSON.stringify({ version: 1, data: null }))).toBeNull();
  });

  test('data 不是物件視為無效', () => {
    expect(parseBackup(JSON.stringify({ data: '字串' }))).toBeNull();
    expect(parseBackup(JSON.stringify({ data: [1, 2, 3] }))).toBeNull();
  });

  test('頂層是陣列或純值視為無效', () => {
    expect(parseBackup(JSON.stringify([1, 2]))).toBeNull();
    expect(parseBackup(JSON.stringify('字串'))).toBeNull();
    expect(parseBackup(JSON.stringify(42))).toBeNull();
    expect(parseBackup(JSON.stringify(null))).toBeNull();
  });

  /** 別的 App 的 JSON 不該被當成本 App 的備份而寫入 */
  test('不含任何已知鍵的檔案視為無效', () => {
    const json = JSON.stringify({ version: 1, data: { '@other_app': [1] } });
    expect(parseBackup(json)).toBeNull();
  });

  /** 備份檔可能夾帶額外的鍵，只還原認得的，避免寫入任意內容 */
  test('只取出認得的鍵，忽略其餘', () => {
    const json = JSON.stringify({
      version: 1,
      data: { [HISTORY]: [{ id: 'a' }], '@evil_key': '不該被寫入' },
    });
    const r = parseBackup(json);
    expect(Object.keys(r!)).toEqual([HISTORY]);
  });

  test('部分鍵缺失時仍可還原既有的部分', () => {
    const json = JSON.stringify({ version: 1, data: { [SETTINGS]: { userName: '小熊' } } });
    const r = parseBackup(json);
    expect(Object.keys(r!)).toEqual([SETTINGS]);
  });
});

describe('套用備份', () => {
  test('寫回儲存後可讀出相同內容', async () => {
    await applyBackup({ [HISTORY]: [{ id: 'x' }] });
    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: 'x' }]);
  });

  test('只寫入傳入的鍵，不動其他鍵', async () => {
    mockStore.set(SETTINGS, JSON.stringify({ userName: '原本的' }));
    await applyBackup({ [HISTORY]: [] });
    expect(JSON.parse(mockStore.get(SETTINGS)!)).toEqual({ userName: '原本的' });
  });

  test('備份 → 解析 → 套用 可完整往返', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a', poemTitle: '乾為天' }]));
    mockStore.set(SETTINGS, JSON.stringify({ themeMode: 'light' }));

    const json = JSON.stringify(await buildBackup());
    mockStore.clear();

    const restorable = parseBackup(json);
    expect(restorable).not.toBeNull();
    await applyBackup(restorable!);

    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: 'a', poemTitle: '乾為天' }]);
    expect(JSON.parse(mockStore.get(SETTINGS)!)).toEqual({ themeMode: 'light' });
  });
});
