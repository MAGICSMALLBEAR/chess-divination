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

import {
  mergeHistories, mergeFromCloud, mergeSettings, syncWithCloud, uploadToCloud,
} from '../services/cloudSync';
import { STORAGE_KEYS, type AppSettings } from '../services/storage';

const rec = (id: string, timestamp: number) => ({ id, timestamp });

/** 建立最小可用的設定物件，測試只在乎被覆寫的欄位 */
const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  userName: '',
  drawAnimationSpeed: 'normal',
  themeMode: 'dark',
  soundEnabled: true,
  hapticEnabled: true,
  pieceCountPreset: 2,
  hasCompletedOnboarding: false,
  ...overrides,
});

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

describe('設定合併', () => {
  describe('資料夾', () => {
    /**
     * 迴歸：A 建立資料夾 F 並歸檔 R1 後同步，接著歸檔 R2 再同步——
     * 舊邏輯「先出現者優先」留下雲端的 F=[R1]，本地 R2 的歸檔被同步動作摧毀。
     * 同 id 資料夾的 recordIds 必須取聯集。
     */
    test('同 id 資料夾的 recordIds 取聯集，雲端舊副本不吃掉本地新增的歸檔', () => {
      const local = settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1', 'R2'] }],
      });
      const cloud = settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1'] }],
      });

      const merged = mergeSettings(local, cloud);

      expect(merged.folders).toHaveLength(1);
      expect(merged.folders![0].recordIds).toEqual(['R1', 'R2']);
    });

    /** 聯集不是本地覆蓋——另一台裝置放進同資料夾的歸檔也要留著 */
    test('同 id 資料夾的 recordIds 也保留雲端獨有的歸檔', () => {
      const local = settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1'] }],
      });
      const cloud = settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R2', 'R3'] }],
      });

      const merged = mergeSettings(local, cloud);
      // 聯集內容才是重點，順序不強求
      expect(merged.folders![0].recordIds.sort()).toEqual(['R1', 'R2', 'R3']);
    });

    /** 標量欄位與本函式 {...remote, ...local} 的政策一致：本地優先 */
    test('同 id 資料夾的 name/color 以本地為準，遠端舊值不覆蓋本地編輯', () => {
      const local = settings({
        folders: [{ id: 'f1', name: '改名後', color: 'blue', recordIds: ['R1'] }],
      });
      const cloud = settings({
        folders: [{ id: 'f1', name: '舊名稱', color: 'red', recordIds: ['R1'] }],
      });

      const merged = mergeSettings(local, cloud);

      expect(merged.folders).toHaveLength(1);
      expect(merged.folders![0].name).toBe('改名後');
      expect(merged.folders![0].color).toBe('blue');
    });

    test('兩邊各自獨有的資料夾都保留', () => {
      const local = settings({
        folders: [{ id: 'f-local', name: '本地夾', color: 'red', recordIds: [] }],
      });
      const cloud = settings({
        folders: [{ id: 'f-remote', name: '雲端夾', color: 'blue', recordIds: ['R1'] }],
      });

      const merged = mergeSettings(local, cloud);

      expect(merged.folders!.map(f => f.id)).toEqual(['f-remote', 'f-local']);
    });

    test('遠端沒有資料夾時保留本地資料夾', () => {
      const local = settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1'] }],
      });

      expect(mergeSettings(local, settings()).folders).toEqual(local.folders);
    });
  });

  describe('自訂類別', () => {
    /** 迴歸：舊邏輯留雲端的舊 label/icon，使用者改過的類別名稱悄悄變回原樣 */
    test('同 key 的自訂類別以本地 label/icon 為準', () => {
      const local = settings({
        customCategories: [{ key: 'c1', label: '搬家', icon: 'home' }],
      });
      const cloud = settings({
        customCategories: [{ key: 'c1', label: '遷居', icon: 'box' }],
      });

      const merged = mergeSettings(local, cloud);

      expect(merged.customCategories).toHaveLength(1);
      expect(merged.customCategories![0].label).toBe('搬家');
      expect(merged.customCategories![0].icon).toBe('home');
    });

    test('兩邊各自獨有的自訂類別都保留', () => {
      const local = settings({
        customCategories: [{ key: 'c-local', label: '本地類別', icon: 'home' }],
      });
      const cloud = settings({
        customCategories: [{ key: 'c-remote', label: '雲端類別', icon: 'box' }],
      });

      const merged = mergeSettings(local, cloud);

      expect(merged.customCategories!.map(c => c.key)).toEqual(['c-remote', 'c-local']);
    });
  });

  /** 既有行為守門：修 folders/customCategories 時不可動到這兩個欄位的聯集語意 */
  test('usageDates 與 unlockedAchievements 維持聯集', () => {
    const local = settings({
      usageDates: ['2026-08-23', '2026-08-24'],
      unlockedAchievements: ['first'],
    });
    const cloud = settings({
      usageDates: ['2026-08-24', '2026-08-25'],
      unlockedAchievements: ['first', 'second'],
    });

    const merged = mergeSettings(local, cloud);

    expect(merged.usageDates!.sort()).toEqual(['2026-08-23', '2026-08-24', '2026-08-25']);
    expect(merged.unlockedAchievements!.sort()).toEqual(['first', 'second']);
  });

  describe('合併後回寫', () => {
    beforeEach(() => { mockStore.clear(); });

    /**
     * 完整重現缺陷流程：本地已歸檔 R1+R2、雲端只有 R1（上次同步的舊副本）。
     * 合併寫回本地儲存後，R2 的歸檔必須還在。
     */
    test('同步寫回 SETTINGS 後，本地新增的歸檔仍在', async () => {
      mockStore.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings({
        folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1', 'R2'] }],
      })));

      const merged = await mergeFromCloud({
        version: 2,
        timestamp: 0,
        history: [],
        favorites: [],
        settings: settings({
          folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: ['R1'] }],
        }),
        dailyFortune: null,
        deletedIds: [],
      });

      expect((merged.settings as AppSettings).folders![0].recordIds).toEqual(['R1', 'R2']);
      const written = JSON.parse(mockStore.get(STORAGE_KEYS.SETTINGS)!);
      expect(written.folders[0].recordIds).toEqual(['R1', 'R2']);
    });
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

describe('資料夾／類別的刪除墓碑', () => {
  /**
   * 迴歸：記錄有墓碑、資料夾沒有——A 刪掉資料夾後同步，B 那邊還留著上次
   * 同步的舊副本，取聯集就讓它復活了。使用者刪一次、它回來一次。
   */
  test('本地刪掉的資料夾不會被雲端舊副本復活', () => {
    const local = settings({
      folders: [{ id: 'keep', name: '留著', color: 'red', recordIds: [] }],
      deletedFolderIds: ['gone'],
    });
    const cloud = settings({
      folders: [
        { id: 'keep', name: '留著', color: 'red', recordIds: [] },
        { id: 'gone', name: '已刪除', color: 'blue', recordIds: ['R1'] },
      ],
    });

    const merged = mergeSettings(local, cloud);

    expect(merged.folders!.map(f => f.id)).toEqual(['keep']);
    expect(merged.deletedFolderIds).toContain('gone');
  });

  test('另一台裝置刪掉的資料夾，本地這份也要跟著消失', () => {
    const local = settings({
      folders: [{ id: 'gone', name: '本地還留著', color: 'red', recordIds: ['R1'] }],
    });
    const cloud = settings({ deletedFolderIds: ['gone'] });

    expect(mergeSettings(local, cloud).folders).toEqual([]);
  });

  test('自訂類別的墓碑同樣生效，且兩邊墓碑取聯集', () => {
    const local = settings({
      customCategories: [{ key: 'c1', label: '搬家', icon: 'home' }],
      deletedCategoryKeys: ['c2'],
    });
    const cloud = settings({
      customCategories: [
        { key: 'c1', label: '搬家', icon: 'home' },
        { key: 'c2', label: '已刪除', icon: 'star' },
        { key: 'c3', label: '對面刪的', icon: 'box' },
      ],
      deletedCategoryKeys: ['c3'],
    });

    const merged = mergeSettings(local, cloud);

    expect(merged.customCategories!.map(c => c.key)).toEqual(['c1']);
    expect(merged.deletedCategoryKeys!.sort()).toEqual(['c2', 'c3']);
  });

  /** 沒有墓碑的舊資料不該被誤刪——欄位缺席時行為必須與從前一致 */
  test('兩邊都沒有墓碑欄位時，資料夾與類別全數保留', () => {
    const local = settings({
      folders: [{ id: 'f1', name: '感情', color: 'red', recordIds: [] }],
      customCategories: [{ key: 'c1', label: '搬家', icon: 'home' }],
    });

    const merged = mergeSettings(local, settings());

    expect(merged.folders).toHaveLength(1);
    expect(merged.customCategories).toHaveLength(1);
  });
});

describe('兩台都滿載時的記錄交換', () => {
  beforeEach(() => { mockStore.clear(); });

  /**
   * 迴歸：本機與雲端各滿 500 筆時，舊作法上傳的也只有 500 筆——雲端被
   * 本機那份整個取代，永遠不持有聯集，兩台來回覆蓋、誰都拿不到對方的記錄。
   * 上傳那份要存得下聯集，這個迴圈才會停。
   */
  test('上傳的 payload 含兩邊聯集，本機仍只留 500 筆', async () => {
    const local = Array.from({ length: 500 }, (_, i) => rec(`L${i}`, i));
    const cloud = Array.from({ length: 500 }, (_, i) => rec(`C${i}`, 1000 + i));
    mockStore.set(STORAGE_KEYS.HISTORY, JSON.stringify(local));

    const merged = await mergeFromCloud({
      version: 3, timestamp: 0, history: cloud, favorites: [],
      settings: {}, dailyFortune: null, deletedIds: [],
    });

    // 上傳那份：兩邊 1000 筆一個不少
    const uploaded = (merged.history as { id: string }[]).map(r => r.id);
    expect(uploaded).toHaveLength(1000);
    expect(uploaded.filter(id => id.startsWith('L'))).toHaveLength(500);
    expect(uploaded.filter(id => id.startsWith('C'))).toHaveLength(500);

    // 寫回本機那份：維持單機上限，且不丟本地獨有的記錄
    const written = JSON.parse(mockStore.get(STORAGE_KEYS.HISTORY)!) as { id: string }[];
    expect(written).toHaveLength(500);
    expect(written.filter(r => r.id.startsWith('L'))).toHaveLength(500);
  });

  test('聯集也受上限保護，不會無限膨脹', () => {
    const local = Array.from({ length: 800 }, (_, i) => rec(`L${i}`, i));
    const cloud = Array.from({ length: 800 }, (_, i) => rec(`C${i}`, 1000 + i));

    expect(mergeHistories(local, cloud, 1000)).toHaveLength(1000);
  });
});

describe('同步失敗的原因回報', () => {
  const originalFetch = global.fetch;

  /** 讓 GET/PUT 各自回指定的狀態碼 */
  function mockFetch(handler: (method: string) => Response | Promise<Response>) {
    global.fetch = jest.fn((_url: unknown, init?: { method?: string }) =>
      Promise.resolve(handler(init?.method ?? 'GET'))) as unknown as typeof fetch;
  }

  beforeEach(() => {
    mockStore.clear();
    mockStore.set('@chess_divination_sync_key', 'a'.repeat(48));
  });
  afterEach(() => { global.fetch = originalFetch; });

  /**
   * 缺陷本身：任何失敗都顯示「尚未設定雲端同步伺服器」。
   * 斷網、超限、被限流的使用者照著訊息去設環境變數也不會好。
   */
  test.each([
    [501, 'not-configured'],
    [401, 'invalid-key'],
    [413, 'too-large'],
    [429, 'rate-limited'],
    [500, 'server-error'],
  ])('伺服器回 %s 時回報 %s', async (status, expected) => {
    mockFetch(method =>
      method === 'GET'
        ? new Response(null, { status: 404 })      // 雲端尚無資料
        : new Response(null, { status: status as number }));

    expect(await syncWithCloud()).toBe(expected);
  });

  test('連不上時回報 offline 而非「未設定」', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
    expect(await syncWithCloud()).toBe('offline');
  });

  test('一切正常時回報 ok', async () => {
    mockFetch(method =>
      method === 'GET'
        ? new Response(null, { status: 404 })
        : Response.json({ ok: true }));

    expect(await syncWithCloud()).toBe('ok');
  });

  /**
   * 下載失敗就地停手，不是為了訊息好看：照舊往下走會拿本機那份去 PUT，
   * 一次暫時的斷網就把雲端的聯集抹平。
   */
  test('下載失敗時不上傳，避免把雲端資料蓋掉', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn((_url: unknown, init?: { method?: string }) => {
      calls.push(init?.method ?? 'GET');
      return Promise.resolve(new Response(null, { status: 500 }));
    }) as unknown as typeof fetch;

    expect(await syncWithCloud()).toBe('server-error');
    expect(calls).toEqual(['GET']);
  });

  /** 上傳去掉冗餘的收藏副本，payload 才不會接近雙倍大 */
  test('上傳的 payload 不夾帶收藏的完整副本', async () => {
    let body: string | undefined;
    global.fetch = jest.fn((_url: unknown, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') body = init.body;
      return Promise.resolve(Response.json({ ok: true }));
    }) as unknown as typeof fetch;

    await uploadToCloud({
      version: 3, timestamp: 0,
      history: [{ id: 'a', timestamp: 1, isFavorited: true }],
      favorites: [{ id: 'a', timestamp: 1, isFavorited: true }],
      settings: {}, dailyFortune: null, deletedIds: [],
    });

    const sent = JSON.parse(body!);
    expect(sent.favorites).toEqual([]);
    // 收藏靠 history 的 isFavorited 還原，資訊沒有遺失
    expect(sent.history[0].isFavorited).toBe(true);
    expect(sent.version).toBe(3);
  });
});
