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
  getSettings, saveSettings, updateSettings,
  getFolders, addFolder, deleteFolder, addToFolder, removeFromFolder,
  getDailyFortune, saveDailyFortune,
  isLegacyRecord, hasLiuYaoData,
  setOutcome, clearOutcome,
  recordFromDivination, STORAGE_KEYS,
  type DivinationRecord, type DailyFortune,
} from '../services/storage';
import { todayString } from '../services/date';
import { getPoemById } from '../data/poems';
import { ALL_PIECES } from '../data/pieces';

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

describe('牌陣記錄', () => {
  test('牌陣類型會寫入結構化記錄，供日後篩選與統計', () => {
    const record = recordFromDivination(
      getPoemById(1),
      ALL_PIECES.slice(0, 3),
      'board',
      'general',
      '測試問題',
      '牌陣解讀',
      undefined,
      'timeline',
    );

    expect(record.spreadId).toBe('timeline');
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

describe('刪除與收藏的連動', () => {
  /**
   * 迴歸：收藏存的是記錄的完整副本——刪歷史時若不連動，
   * 被刪的記錄永遠留在收藏頁，收藏頁的刪除鈕再按一次 removeHistory 也是 no-op。
   */
  test('刪除歷史中的記錄時，收藏副本一併移除', async () => {
    const a = await addHistory(makeRecord());
    await addHistory(makeRecord({ poemTitle: '保留的' }));
    await toggleFavorite(a);

    await removeHistory(a.id);

    expect((await getHistory()).map(r => r.id)).not.toContain(a.id);
    expect(await getFavorites()).toEqual([]);
    expect(await isFavorited(a.id)).toBe(false);
  });

  /** 使用者接受了破壞性確認，收藏頁卻還留著整套記錄，兩者互相矛盾 */
  test('清除所有歷史時，收藏也一併清空', async () => {
    const a = await addHistory(makeRecord());
    const b = await addHistory(makeRecord());
    await toggleFavorite(a);
    await toggleFavorite(b);

    await clearHistory();

    expect(await getHistory()).toEqual([]);
    expect(await getFavorites()).toEqual([]);
  });

  /**
   * 墓碑要涵蓋收藏獨有的 id。
   *
   * 舊版只刪歷史不刪收藏，留下一批「歷史已無、收藏還在」的孤兒記錄。
   * 清除歷史時若只依歷史的 id 寫墓碑，這些孤兒被清掉卻沒有墓碑，
   * 下一次雲端同步就把它們原封不動地拉回來——使用者以為清乾淨了，
   * 過幾天又全部出現。
   */
  test('清除歷史時，收藏獨有的孤兒記錄也會留下墓碑', async () => {
    const orphan = await addHistory(makeRecord());
    await toggleFavorite(orphan);
    // 直接改寫歷史鍵，模擬舊版只刪歷史所留下的狀態
    mockStore.set(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    expect((await getFavorites()).map(r => r.id)).toEqual([orphan.id]);

    await clearHistory();

    const deleted = JSON.parse(mockStore.get(STORAGE_KEYS.DELETED) ?? '[]');
    expect(deleted).toContain(orphan.id);
  });

  test('刪除未收藏的記錄不影響其他收藏', async () => {
    const a = await addHistory(makeRecord());
    const b = await addHistory(makeRecord());
    await toggleFavorite(b);

    await removeHistory(a.id);

    expect((await getFavorites()).map(r => r.id)).toEqual([b.id]);
  });

  /**
   * 舊版留下的孤兒收藏（歷史副本已刪、收藏副本還在）：
   * 從收藏頁按刪除時 removeHistory 也該把它從收藏移除，否則永遠刪不掉。
   */
  test('歷史中已不存在的收藏記錄，刪除時仍會從收藏移除', async () => {
    const a = await addHistory(makeRecord());
    await toggleFavorite(a);
    // 模擬舊版 bug 造成的狀態：歷史已無此記錄，收藏副本還留著
    mockStore.set('@chess_divination_history', '[]');

    await removeHistory(a.id);

    expect(await getFavorites()).toEqual([]);
  });

  /** 收藏連動移除的同時，墓碑照樣要寫——否則雲端同步會把刪除復活 */
  test('刪除已收藏的記錄仍寫入墓碑', async () => {
    const a = await addHistory(makeRecord());
    await toggleFavorite(a);

    await removeHistory(a.id);

    const deleted = JSON.parse(mockStore.get('@chess_divination_deleted')!);
    expect(deleted).toContain(a.id);
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

/**
 * 併發寫入設定。
 *
 * saveSettings 是「讀出整包 → 合併 → 寫回整包」，沒有序列化的話兩個並行
 * 呼叫會讀到同一份舊值，後寫的整個蓋掉先寫的。這不是理論問題：reveal 頁
 * 的同一個 effect 裡 recordUsage() 與 syncAchievements() 併發且都不 await，
 * 撞上時當日的連續天數更新會遺失，而且那一天過了就補不回來。
 */
describe('設定的併發寫入', () => {
  test('同時寫入不同欄位，兩者都要留下', async () => {
    await Promise.all([
      saveSettings({ userName: '小熊' }),
      saveSettings({ currentStreak: 7 }),
    ]);

    const s = await getSettings();
    expect(s.userName).toBe('小熊');
    expect(s.currentStreak).toBe(7);
  });

  test('大量併發寫入後每一個欄位都在', async () => {
    // 單一一對可能因為排程剛好錯開而僥倖通過；20 個併發把窗口撐開
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => saveSettings({ [`k${i}`]: i } as never)),
    );

    const s = await getSettings() as unknown as Record<string, number>;
    const missing = Array.from({ length: 20 }, (_, i) => `k${i}`).filter(k => s[k] === undefined);
    expect(missing).toEqual([]);
  });

  test('updateSettings 的 updater 讀到的是輪到它時的最新值', async () => {
    await saveSettings({ currentStreak: 0 });

    // 每個 updater 都是 +1。沒有序列化的話全部讀到 0，結果會是 1 而非 10。
    await Promise.all(
      Array.from({ length: 10 }, () =>
        updateSettings(current => ({ currentStreak: (current.currentStreak ?? 0) + 1 }))),
    );

    expect((await getSettings()).currentStreak).toBe(10);
  });

  test('某次寫入失敗不會讓後續寫入卡住', async () => {
    // updater 拋錯時佇列必須還能繼續，否則一次意外就讓設定永久寫不進去
    await expect(
      updateSettings(() => { throw new Error('壞掉的 updater'); }),
    ).rejects.toThrow('壞掉的 updater');

    await saveSettings({ userName: '照樣寫得進去' });
    expect((await getSettings()).userName).toBe('照樣寫得進去');
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
