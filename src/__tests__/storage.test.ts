// storage.ts 測試
// AsyncStorage 以記憶體 Map 模擬，每個測試前清空，確保彼此獨立。

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

import {
  getHistory, addHistory, removeHistory, clearHistory,
  getFavorites, toggleFavorite, isFavorited,
  getSettings, saveSettings,
  getFolders, addFolder, deleteFolder, addToFolder, removeFromFolder,
  getDailyFortune, saveDailyFortune,
  isLegacyRecord, hasLiuYaoData,
  setOutcome, clearOutcome,
  type DivinationRecord, type DailyFortune,
} from '../services/storage';
import { todayString } from '../services/date';

/** 建立測試用記錄，可覆寫任意欄位 */
function makeRecord(overrides: Partial<DivinationRecord> = {}): Omit<DivinationRecord, 'id'> {
  return {
    poemId: 1,
    poemTitle: '乾為天',
    poemContent: '天行健君子以自強不息',
    poemLevel: '大吉',
    drawnPieceTypes: ['king', 'chariot'],
    drawnPieceColors: ['red', 'black'],
    drawnPieceChars: ['帥', '車'],
    mode: 'draw',
    timestamp: Date.now(),
    isFavorited: false,
    engineVersion: 3,
    ...overrides,
  };
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('歷史記錄', () => {
  test('空儲存時回傳空陣列', async () => {
    expect(await getHistory()).toEqual([]);
  });

  test('新增記錄會產生 id 並置於最前', async () => {
    const first = await addHistory(makeRecord({ poemTitle: '第一筆' }));
    const second = await addHistory(makeRecord({ poemTitle: '第二筆' }));

    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);

    const history = await getHistory();
    expect(history).toHaveLength(2);
    // unshift：最新的在最前
    expect(history[0].poemTitle).toBe('第二筆');
    expect(history[1].poemTitle).toBe('第一筆');
  });

  test('依 id 刪除單筆記錄', async () => {
    const a = await addHistory(makeRecord({ poemTitle: 'A' }));
    await addHistory(makeRecord({ poemTitle: 'B' }));

    await removeHistory(a.id);

    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].poemTitle).toBe('B');
  });

  test('刪除不存在的 id 不影響現有記錄', async () => {
    await addHistory(makeRecord());
    await removeHistory('does-not-exist');
    expect(await getHistory()).toHaveLength(1);
  });

  test('清除全部歷史', async () => {
    await addHistory(makeRecord());
    await addHistory(makeRecord());
    await clearHistory();
    expect(await getHistory()).toEqual([]);
  });

  test('毀損的 JSON 應降級為空陣列而非拋錯', async () => {
    mockStore.set('@chess_divination_history', '{ not valid json');
    expect(await getHistory()).toEqual([]);
  });

  test('非陣列的 JSON 應降級為空陣列', async () => {
    mockStore.set('@chess_divination_history', '{"foo":"bar"}');
    expect(await getHistory()).toEqual([]);
  });

  test('歷史記錄上限 500 筆，超出者捨棄最舊的', async () => {
    // 直接寫入 500 筆已滿的歷史，再新增一筆
    const full: DivinationRecord[] = Array.from({ length: 500 }, (_, i) => ({
      ...makeRecord({ poemTitle: `舊記錄${i}` }),
      id: `old-${i}`,
    }));
    mockStore.set('@chess_divination_history', JSON.stringify(full));

    await addHistory(makeRecord({ poemTitle: '最新記錄' }));

    const history = await getHistory();
    expect(history).toHaveLength(500);
    expect(history[0].poemTitle).toBe('最新記錄');
    // 最舊的一筆（index 499）已被擠出
    expect(history.some(r => r.id === 'old-499')).toBe(false);
  });
});

describe('收藏', () => {
  test('切換收藏會加入並回傳 true', async () => {
    const record = await addHistory(makeRecord());
    const nowFavorited = await toggleFavorite({ ...record });

    expect(nowFavorited).toBe(true);
    expect(await isFavorited(record.id)).toBe(true);
    expect(await getFavorites()).toHaveLength(1);
  });

  test('再次切換會移除並回傳 false', async () => {
    const record = await addHistory(makeRecord());
    await toggleFavorite({ ...record });
    const stillFavorited = await toggleFavorite({ ...record });

    expect(stillFavorited).toBe(false);
    expect(await isFavorited(record.id)).toBe(false);
    expect(await getFavorites()).toEqual([]);
  });

  test('收藏會同步更新歷史記錄的 isFavorited 欄位', async () => {
    const record = await addHistory(makeRecord());
    await toggleFavorite({ ...record });

    const history = await getHistory();
    expect(history[0].isFavorited).toBe(true);

    await toggleFavorite({ ...record });
    expect((await getHistory())[0].isFavorited).toBe(false);
  });

  test('收藏中的記錄 isFavorited 一律為 true', async () => {
    const record = await addHistory(makeRecord({ isFavorited: false }));
    await toggleFavorite({ ...record, isFavorited: false });

    const favorites = await getFavorites();
    expect(favorites[0].isFavorited).toBe(true);
  });
});

describe('設定', () => {
  test('未設定時回傳預設值', async () => {
    const s = await getSettings();
    expect(s.themeMode).toBe('dark');
    expect(s.soundEnabled).toBe(true);
    expect(s.pieceCountPreset).toBe(2);
    expect(s.hasCompletedOnboarding).toBe(false);
  });

  test('部分更新會與現有設定合併', async () => {
    await saveSettings({ userName: '小熊' });
    await saveSettings({ themeMode: 'light' });

    const s = await getSettings();
    expect(s.userName).toBe('小熊');
    expect(s.themeMode).toBe('light');
    // 未觸及的欄位保持預設
    expect(s.soundEnabled).toBe(true);
  });

  test('毀損的設定 JSON 應降級為預設值', async () => {
    mockStore.set('@chess_divination_settings', 'not json at all');
    const s = await getSettings();
    expect(s.themeMode).toBe('dark');
  });

  test('舊版設定缺少新欄位時，新欄位取預設值', async () => {
    // 模擬舊版只存了兩個欄位
    mockStore.set('@chess_divination_settings', JSON.stringify({ userName: '舊用戶', themeMode: 'light' }));
    const s = await getSettings();
    expect(s.userName).toBe('舊用戶');
    expect(s.pieceCountPreset).toBe(2);   // 新欄位補上預設
  });

  test('自訂問事類別可存取', async () => {
    await saveSettings({
      customCategories: [{ key: 'custom-1', label: '搬家', icon: 'home' }],
    });
    const s = await getSettings();
    expect(s.customCategories).toHaveLength(1);
    expect(s.customCategories![0].label).toBe('搬家');
  });
});

describe('資料夾', () => {
  test('未建立時回傳空陣列', async () => {
    expect(await getFolders()).toEqual([]);
  });

  test('新增資料夾會配色並持久化', async () => {
    const folder = await addFolder('感情');
    expect(folder.name).toBe('感情');
    expect(folder.color).toBeTruthy();
    expect(folder.recordIds).toEqual([]);

    expect(await getFolders()).toHaveLength(1);
  });

  test('多個資料夾循環取色', async () => {
    const a = await addFolder('第一');
    const b = await addFolder('第二');
    expect(a.id).not.toBe(b.id);
    expect(await getFolders()).toHaveLength(2);
  });

  test('刪除資料夾', async () => {
    const folder = await addFolder('待刪除');
    await addFolder('保留');
    await deleteFolder(folder.id);

    const folders = await getFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('保留');
  });

  test('加入記錄到資料夾', async () => {
    const folder = await addFolder('收藏夾');
    await addToFolder(folder.id, 'record-123');

    const folders = await getFolders();
    expect(folders[0].recordIds).toContain('record-123');
  });

  test('重複加入同一筆記錄不會產生重複項', async () => {
    const folder = await addFolder('收藏夾');
    await addToFolder(folder.id, 'record-123');
    await addToFolder(folder.id, 'record-123');

    const folders = await getFolders();
    expect(folders[0].recordIds).toEqual(['record-123']);
  });

  test('從資料夾移除記錄', async () => {
    const folder = await addFolder('收藏夾');
    await addToFolder(folder.id, 'record-A');
    await addToFolder(folder.id, 'record-B');
    await removeFromFolder(folder.id, 'record-A');

    const folders = await getFolders();
    expect(folders[0].recordIds).toEqual(['record-B']);
  });
});

describe('每日運勢', () => {
  const fortune: DailyFortune = {
    date: todayString(),
    luckyPiece: 'chariot',
    luckyColor: '紅',
    luckyDirection: '東',
    luckyNumber: 7,
    fortuneLevel: '中吉',
    fortuneText: '今日宜靜觀其變。',
  };

  test('未儲存時回傳 null', async () => {
    expect(await getDailyFortune()).toBeNull();
  });

  test('當日運勢可讀回', async () => {
    await saveDailyFortune(fortune);
    const loaded = await getDailyFortune();
    expect(loaded?.luckyPiece).toBe('chariot');
    expect(loaded?.fortuneLevel).toBe('中吉');
  });

  /** 迴歸：跨日後應視為過期，強制重新起卦 */
  test('非當日的運勢視為過期，回傳 null', async () => {
    await saveDailyFortune({ ...fortune, date: '2020-01-01' });
    expect(await getDailyFortune()).toBeNull();
  });

  test('毀損的運勢 JSON 回傳 null', async () => {
    mockStore.set('@chess_divination_daily', 'broken');
    expect(await getDailyFortune()).toBeNull();
  });
});

describe('記錄版本判定', () => {
  /** 迴歸：v1 卦序有誤，必須被標記為舊卦法 */
  test('缺少 engineVersion 者視為 v1 舊記錄', () => {
    const record = { ...makeRecord(), id: 'x', engineVersion: undefined } as DivinationRecord;
    expect(isLegacyRecord(record)).toBe(true);
  });

  test('v1 記錄視為舊卦法', () => {
    const record = { ...makeRecord({ engineVersion: 1 }), id: 'x' } as DivinationRecord;
    expect(isLegacyRecord(record)).toBe(true);
  });

  test('v2 以後卦序正確，不算舊卦法', () => {
    expect(isLegacyRecord({ ...makeRecord({ engineVersion: 2 }), id: 'x' } as DivinationRecord)).toBe(false);
    expect(isLegacyRecord({ ...makeRecord({ engineVersion: 3 }), id: 'x' } as DivinationRecord)).toBe(false);
  });

  test('含 hexagramIndex 與 movingLine 者具備完整六爻資訊', () => {
    const withLiuYao = {
      ...makeRecord({ hexagramIndex: 12, movingLine: 3 }),
      id: 'x',
    } as DivinationRecord;
    expect(hasLiuYaoData(withLiuYao)).toBe(true);
  });

  test('缺少任一六爻欄位者視為資料不完整', () => {
    expect(hasLiuYaoData({ ...makeRecord({ hexagramIndex: 12 }), id: 'x' } as DivinationRecord)).toBe(false);
    expect(hasLiuYaoData({ ...makeRecord({ movingLine: 3 }), id: 'x' } as DivinationRecord)).toBe(false);
    expect(hasLiuYaoData({ ...makeRecord(), id: 'x' } as DivinationRecord)).toBe(false);
  });
});

describe('占驗回填', () => {
  test('新記錄沒有 outcome', async () => {
    const r = await addHistory(makeRecord());
    expect(r.outcome).toBeUndefined();
  });

  test('setOutcome 寫入狀態、備註與回填時間', async () => {
    const r = await addHistory(makeRecord());
    const before = Date.now();
    await setOutcome(r.id, 'accurate', '面試上了');

    const [saved] = await getHistory();
    expect(saved.outcome?.status).toBe('accurate');
    expect(saved.outcome?.note).toBe('面試上了');
    expect(saved.outcome?.verifiedAt).toBeGreaterThanOrEqual(before);
  });

  test('備註留白或只有空白時存為 undefined，不留空字串', async () => {
    const r = await addHistory(makeRecord());
    await setOutcome(r.id, 'partial');
    expect((await getHistory())[0].outcome?.note).toBeUndefined();

    await setOutcome(r.id, 'partial', '   ');
    expect((await getHistory())[0].outcome?.note).toBeUndefined();
  });

  test('備註前後空白會被修掉', async () => {
    const r = await addHistory(makeRecord());
    await setOutcome(r.id, 'accurate', '  真的應驗了  ');
    expect((await getHistory())[0].outcome?.note).toBe('真的應驗了');
  });

  test('重複 setOutcome 以最後一次為準', async () => {
    const r = await addHistory(makeRecord());
    await setOutcome(r.id, 'accurate', '第一次');
    await setOutcome(r.id, 'inaccurate', '想想其實沒中');

    const [saved] = await getHistory();
    expect(saved.outcome?.status).toBe('inaccurate');
    expect(saved.outcome?.note).toBe('想想其實沒中');
  });

  test('clearOutcome 讓記錄回到未驗狀態', async () => {
    const r = await addHistory(makeRecord());
    await setOutcome(r.id, 'accurate', '中了');
    await clearOutcome(r.id);

    const [saved] = await getHistory();
    expect(saved.outcome).toBeUndefined();
    expect('outcome' in saved).toBe(false);
  });

  /**
   * 收藏清單存的是記錄的完整副本。只更新歷史的話，
   * 從收藏頁點進去看到的會是沒有占驗的舊副本，同一筆記錄在兩頁顯示不一致。
   */
  test('已收藏的記錄，歷史與收藏兩份副本同步更新', async () => {
    const r = await addHistory(makeRecord());
    await toggleFavorite(r);

    await setOutcome(r.id, 'partial', '一半準');

    expect((await getHistory())[0].outcome?.status).toBe('partial');
    expect((await getFavorites())[0].outcome?.status).toBe('partial');
  });

  test('清除占驗同樣同步到收藏副本', async () => {
    const r = await addHistory(makeRecord());
    await toggleFavorite(r);
    await setOutcome(r.id, 'accurate');

    await clearOutcome(r.id);

    expect((await getHistory())[0].outcome).toBeUndefined();
    expect((await getFavorites())[0].outcome).toBeUndefined();
  });

  test('只改到指定的記錄，其餘不受影響', async () => {
    const a = await addHistory(makeRecord({ poemTitle: 'A' }));
    const b = await addHistory(makeRecord({ poemTitle: 'B' }));

    await setOutcome(b.id, 'accurate');

    const history = await getHistory();
    expect(history.find(r => r.id === b.id)?.outcome?.status).toBe('accurate');
    expect(history.find(r => r.id === a.id)?.outcome).toBeUndefined();
  });

  test('對不存在的 id 操作不拋錯，也不新增記錄', async () => {
    await addHistory(makeRecord());
    await expect(setOutcome('no-such-id', 'accurate')).resolves.toBeDefined();
    await expect(clearOutcome('no-such-id')).resolves.toBeUndefined();
    expect(await getHistory()).toHaveLength(1);
  });

  test('回填不動到記錄的其他欄位', async () => {
    const r = await addHistory(makeRecord({ questionText: '這次面試如何', hexagramIndex: 42 }));
    await setOutcome(r.id, 'accurate');

    const [saved] = await getHistory();
    expect(saved.questionText).toBe('這次面試如何');
    expect(saved.hexagramIndex).toBe(42);
    expect(saved.poemTitle).toBe('乾為天');
    expect(saved.id).toBe(r.id);
  });
});
