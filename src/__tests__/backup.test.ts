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

// 這個測試環境的 document 是 undefined（見 jest-expo 預設），
// 因此 backupData/restoreData 走的正是**原生**分支——原生通道能不能用，
// 只有這裡測得到（web 分支由 e2e 實際點過）。
const mockClipboard = { text: '' };
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn((v: string) => { mockClipboard.text = v; return Promise.resolve(); }),
  getStringAsync: jest.fn(() => Promise.resolve(mockClipboard.text)),
}));

const mockSharing = { available: true, shared: [] as string[], throws: false };
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(mockSharing.available)),
  shareAsync: jest.fn((uri: string) => {
    if (mockSharing.throws) return Promise.reject(new Error('分享失敗'));
    mockSharing.shared.push(uri);
    return Promise.resolve();
  }),
}));

// 以記憶體 Map 模擬檔案系統；只需支援 backup.ts 用到的 create/write/text
const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  File: class {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = parts.map(String).join(''); }
    create() { mockFiles.set(this.uri, ''); }
    write(content: string) { mockFiles.set(this.uri, content); }
    text() {
      const v = mockFiles.get(this.uri);
      return v === undefined
        ? Promise.reject(new Error('檔案不存在'))
        : Promise.resolve(v);
    }
  },
}));

const mockPicker = { canceled: false, uri: 'file:///picked.json', throws: false };
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => {
    if (mockPicker.throws) return Promise.reject(new Error('選檔器不可用'));
    return Promise.resolve(mockPicker.canceled
      ? { canceled: true, assets: null }
      : { canceled: false, assets: [{ uri: mockPicker.uri, name: 'backup.json' }] });
  }),
}));

import { buildBackup, parseBackup, applyBackup, backupData, restoreData } from '../services/backup';

const HISTORY = '@chess_divination_history';
const FAVORITES = '@chess_divination_favorites';
const SETTINGS = '@chess_divination_settings';
const DELETED = '@chess_divination_deleted';

beforeEach(() => {
  mockStore.clear();
  mockFiles.clear();
  mockClipboard.text = '';
  mockSharing.available = true;
  mockSharing.shared = [];
  mockSharing.throws = false;
  mockPicker.canceled = false;
  mockPicker.uri = 'file:///picked.json';
  mockPicker.throws = false;
  jest.clearAllMocks();
});

/** 造一份合法備份檔的 JSON 字串 */
function backupJson(data: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, date: '2026-08-23T00:00:00.000Z', data });
}

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

  /**
   * 迴歸：原本逐鍵 raw JSON.parse，一個鍵壞掉就整份「備份失敗」——
   * 而最需要備份的正是資料已經開始出問題的時候。讀取端對壞鍵一向是
   * 降級成 []／預設值，備份端卻整份放棄，兩邊策略不一致。
   */
  test('單一壞鍵不會讓整份備份失敗', async () => {
    mockStore.set(HISTORY, '{這不是 JSON');
    mockStore.set(SETTINGS, JSON.stringify({ userName: '阿明' }));

    const b = await buildBackup();

    expect(b.data[HISTORY]).toBeNull();
    expect(b.data[SETTINGS]).toEqual({ userName: '阿明' });   // 好的鍵照樣備份
  });

  test('壞鍵記進 skippedKeys，缺漏是看得見的', async () => {
    mockStore.set(HISTORY, 'xxx');
    mockStore.set(FAVORITES, '[[[');

    const b = await buildBackup();

    expect(b.skippedKeys?.sort()).toEqual([FAVORITES, HISTORY].sort());
  });

  test('沒有壞鍵時不出現 skippedKeys 欄位', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a' }]));
    const b = await buildBackup();
    expect(b.skippedKeys).toBeUndefined();
  });

  /** 壞掉的原文不可以進備份——還原時會再 parse 一次，等於把問題帶著走 */
  test('壞鍵的原始字串不會被寫進備份', async () => {
    mockStore.set(HISTORY, '{這不是 JSON');
    const json = JSON.stringify(await buildBackup());
    expect(json).not.toContain('這不是 JSON');
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

  /**
   * 值的型別驗證。
   *
   * 原本只檢查「鍵在不在」，值是什麼一概照收，而還原是直接把值寫回儲存——
   * 讀取端對壞值的反應是安靜地當作空的，或直接崩潰：
   *   history 是物件而非陣列 → normalizeRecords 回 []，使用者看到
   *     「還原成功」配上一片空白的歷史，像是還原動作本身刪光了資料；
   *   settings.folders 是物件 → 收藏頁的 folders.map 當場炸開。
   * 手改過或半途截斷的備份檔都長這樣，而還原正是換機搬家的正規路徑。
   */
  describe('值的型別驗證', () => {
    test('history 不是陣列時整份拒絕，不會靜默清空', () => {
      const json = JSON.stringify({ version: 1, data: { [HISTORY]: { foo: 1 } } });
      expect(parseBackup(json)).toBeNull();
    });

    test('history 元素缺少 id 時拒絕', () => {
      expect(parseBackup(JSON.stringify({ version: 1, data: { [HISTORY]: [1, 2, 3] } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [HISTORY]: [{ poemId: 3 }] } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [HISTORY]: [{ id: 7 }] } }))).toBeNull();
    });

    test('favorites 與 history 適用同一套形狀檢查', () => {
      expect(parseBackup(JSON.stringify({ version: 1, data: { [FAVORITES]: '字串' } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [FAVORITES]: [{ noId: true }] } }))).toBeNull();
    });

    test('settings 是陣列或純值時拒絕', () => {
      expect(parseBackup(JSON.stringify({ version: 1, data: { [SETTINGS]: [1] } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [SETTINGS]: '字串' } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [SETTINGS]: 42 } }))).toBeNull();
    });

    test('墓碑必須是字串陣列', () => {
      expect(parseBackup(JSON.stringify({ version: 1, data: { [DELETED]: { a: 1 } } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [DELETED]: [1, 2] } }))).toBeNull();
      expect(parseBackup(JSON.stringify({ version: 1, data: { [DELETED]: ['a', 'b'] } }))![DELETED])
        .toEqual(['a', 'b']);
    });

    /** buildBackup 對空的鍵寫入 null，那是合法備份的一部分 */
    test('null 值代表該項本來就是空的，略過而非拒絕', () => {
      const json = JSON.stringify({
        version: 1,
        data: { [HISTORY]: [{ id: 'a' }], [SETTINGS]: null, [FAVORITES]: null, [DELETED]: null },
      });
      const r = parseBackup(json);
      expect(r).not.toBeNull();
      expect(Object.keys(r!)).toEqual([HISTORY]);
    });

    /** 全部都是 null 的備份等於沒有任何可還原內容 */
    test('所有鍵皆為 null 時視為無效', () => {
      const json = JSON.stringify({
        version: 1, data: { [HISTORY]: null, [FAVORITES]: null, [SETTINGS]: null, [DELETED]: null },
      });
      expect(parseBackup(json)).toBeNull();
    });

    test('一個鍵壞掉就整份拒絕，不做部分還原', () => {
      const json = JSON.stringify({
        version: 1,
        data: { [HISTORY]: [{ id: 'a' }], [SETTINGS]: [1, 2] },
      });
      expect(parseBackup(json)).toBeNull();
    });

    /** 形狀未知的新版備份，寧可拒絕也不要照著猜測寫進儲存 */
    test('版本比本版新時拒絕', () => {
      const json = JSON.stringify({ version: 99, data: { [HISTORY]: [{ id: 'a' }] } });
      expect(parseBackup(json)).toBeNull();
    });

    test('缺 version 時當作 v1，仍可還原', () => {
      const json = JSON.stringify({ data: { [HISTORY]: [{ id: 'a' }] } });
      expect(parseBackup(json)).not.toBeNull();
    });
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

// ── 原生通道（document undefined 時的分支）──
//
// 這一段守的是一個曾經半殘的功能：原生端「備份」只回傳字串而沒有真的
// 產生任何東西，「還原」則一律回 false——備份做了一半，使用者按還原
// 必定失敗。以下把兩條通道的成功與退化路徑都釘住。

describe('原生備份通道', () => {
  test('分享可用時寫出檔案並交給系統分享表單', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a' }]));

    await expect(backupData()).resolves.toBe('shared');

    expect(mockSharing.shared).toHaveLength(1);
    // 送出的必須是剛寫好的那個檔，且內容是完整備份
    const written = mockFiles.get(mockSharing.shared[0]);
    expect(written).toBeTruthy();
    expect(parseBackup(written!)![HISTORY]).toEqual([{ id: 'a' }]);
  });

  test('檔名帶當地日期且為 .json', async () => {
    await backupData();
    expect(mockSharing.shared[0]).toMatch(/chess-divination-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  /** 模擬器與部分 Android ROM 沒有分享表單，此時仍要留下保底通道 */
  test('分享不可用時退回剪貼簿', async () => {
    mockSharing.available = false;
    mockStore.set(HISTORY, JSON.stringify([{ id: 'b' }]));

    await expect(backupData()).resolves.toBe('copied');
    expect(parseBackup(mockClipboard.text)![HISTORY]).toEqual([{ id: 'b' }]);
  });

  test('分享中途拋錯也退回剪貼簿，不算失敗', async () => {
    mockSharing.throws = true;

    await expect(backupData()).resolves.toBe('copied');
    expect(mockClipboard.text).not.toBe('');
  });
});

describe('原生還原通道', () => {
  test('選到合法備份檔即寫回儲存', async () => {
    mockFiles.set('file:///picked.json', backupJson({ [HISTORY]: [{ id: 'restored' }] }));

    await expect(restoreData()).resolves.toBe('ok');
    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: 'restored' }]);
  });

  /**
   * 取消是正常操作，不是失敗——回傳值若與失敗共用，設定頁就會在使用者
   * 按下「取消」時跳出「還原失敗」，把人嚇一跳。
   */
  test('使用者取消選檔回傳 canceled，且不動既有資料', async () => {
    mockPicker.canceled = true;
    mockStore.set(HISTORY, JSON.stringify([{ id: '原本的' }]));

    await expect(restoreData()).resolves.toBe('canceled');
    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: '原本的' }]);
  });

  test('選到不是備份檔的 JSON 回傳 invalid，且不動既有資料', async () => {
    mockFiles.set('file:///picked.json', JSON.stringify({ data: { '@other_app': [1] } }));
    mockStore.set(HISTORY, JSON.stringify([{ id: '原本的' }]));

    await expect(restoreData()).resolves.toBe('invalid');
    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: '原本的' }]);
  });

  test('讀檔失敗回傳 error，不寫入任何東西', async () => {
    mockPicker.uri = 'file:///不存在.json';
    await expect(restoreData()).resolves.toBe('error');
    expect(mockStore.size).toBe(0);
  });

  /** 選檔器整個不可用時（模組缺失），剪貼簿是最後一條路 */
  test('選檔器不可用時改讀剪貼簿', async () => {
    mockPicker.throws = true;
    mockClipboard.text = backupJson({ [SETTINGS]: { userName: '小熊' } });

    await expect(restoreData()).resolves.toBe('ok');
    expect(JSON.parse(mockStore.get(SETTINGS)!)).toEqual({ userName: '小熊' });
  });

  test('選檔器不可用且剪貼簿不是備份時回傳 invalid', async () => {
    mockPicker.throws = true;
    mockClipboard.text = '隨手複製的一段字';

    await expect(restoreData()).resolves.toBe('invalid');
    expect(mockStore.size).toBe(0);
  });
});

describe('跨平台往返', () => {
  /**
   * 換機／跨平台搬家全靠這條：web 匯出的檔案要能在原生還原。
   * 兩邊的檔案格式一旦分岔，使用者的歷史就搬不過去。
   */
  test('備份產生的檔案內容可被還原流程完整吃回', async () => {
    mockStore.set(HISTORY, JSON.stringify([{ id: 'a', poemTitle: '乾為天' }]));
    mockStore.set(SETTINGS, JSON.stringify({ themeMode: 'light' }));
    mockStore.set(DELETED, JSON.stringify(['gone']));

    await backupData();
    const exported = mockFiles.get(mockSharing.shared[0])!;

    mockStore.clear();
    mockFiles.set('file:///picked.json', exported);
    await expect(restoreData()).resolves.toBe('ok');

    expect(JSON.parse(mockStore.get(HISTORY)!)).toEqual([{ id: 'a', poemTitle: '乾為天' }]);
    expect(JSON.parse(mockStore.get(SETTINGS)!)).toEqual({ themeMode: 'light' });
    expect(JSON.parse(mockStore.get(DELETED)!)).toEqual(['gone']);
  });
});
