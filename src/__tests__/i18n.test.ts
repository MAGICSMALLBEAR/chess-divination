import fs from 'fs';
import path from 'path';
import { t, setLang, getLang, subscribe, LANG_OPTIONS, type Lang } from '../services/i18n';

const ALL_LANGS: Lang[] = ['zh-TW', 'en', 'ja'];

/**
 * i18n 是模組層級的 singleton，語言狀態會跨測試殘留。
 * 每個測試前復位，避免前一個測試的 setLang 影響後續斷言。
 */
beforeEach(() => {
  setLang('zh-TW');
});

describe('語言切換', () => {
  test('getLang 預設為繁體中文', () => {
    expect(getLang()).toBe('zh-TW');
  });

  test('setLang 後 getLang 回傳新語言', () => {
    for (const lang of ALL_LANGS) {
      setLang(lang);
      expect(getLang()).toBe(lang);
    }
  });

  test('t 依當前語言回傳對應翻譯', () => {
    setLang('zh-TW');
    expect(t('settings.title')).toBe('設定');
    setLang('en');
    expect(t('settings.title')).toBe('Settings');
    setLang('ja');
    expect(t('settings.title')).toBe('設定');
  });

  test('切換語言後同一 key 得到不同結果', () => {
    setLang('zh-TW');
    const zh = t('common.cancel');
    setLang('en');
    const en = t('common.cancel');
    expect(zh).toBe('取消');
    expect(en).toBe('Cancel');
    expect(zh).not.toBe(en);
  });
});

describe('t 的降級行為', () => {
  test('未知的 key 原樣回傳，不得回傳 undefined 或空字串', () => {
    for (const lang of ALL_LANGS) {
      setLang(lang);
      expect(t('nope.does.not.exist')).toBe('nope.does.not.exist');
    }
  });

  /**
   * 回傳 key 本身而非空白，是為了讓漏翻的字串在畫面上「看得見」。
   * 若改成回空字串，UI 會靜靜少一段文字，比顯示 key 更難發現。
   */
  test('空字串 key 不應拋錯', () => {
    expect(() => t('')).not.toThrow();
    expect(t('')).toBe('');
  });

  test('原型鏈上的屬性名不得被當成翻譯', () => {
    // translations 是普通物件，'toString' / 'constructor' 會命中 Object.prototype
    for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
      const result = t(key);
      expect(typeof result).toBe('string');
      expect(result).toBe(key);
    }
  });
});

describe('訂閱機制', () => {
  test('setLang 會通知所有訂閱者', () => {
    const a = jest.fn();
    const b = jest.fn();
    const offA = subscribe(a);
    const offB = subscribe(b);

    setLang('en');

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  test('取消訂閱後不再收到通知', () => {
    const fn = jest.fn();
    const off = subscribe(fn);

    setLang('en');
    expect(fn).toHaveBeenCalledTimes(1);

    off();
    setLang('ja');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('通知發出時語言已更新（監聽者讀到的是新值）', () => {
    let seen: Lang | null = null;
    const off = subscribe(() => { seen = getLang(); });

    setLang('ja');

    expect(seen).toBe('ja');
    off();
  });

  test('同一個函式重複訂閱只會註冊一次（Set 語義）', () => {
    const fn = jest.fn();
    const off1 = subscribe(fn);
    const off2 = subscribe(fn);

    setLang('en');

    expect(fn).toHaveBeenCalledTimes(1);
    off1();
    off2();
  });

  test('取消訂閱可重複呼叫而不拋錯', () => {
    const off = subscribe(jest.fn());
    expect(() => { off(); off(); }).not.toThrow();
  });
});

describe('語言選項', () => {
  test('LANG_OPTIONS 涵蓋全部三種語言且無重複', () => {
    const keys = LANG_OPTIONS.map(o => o.key);
    expect(keys.sort()).toEqual([...ALL_LANGS].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('每個選項都有非空標籤', () => {
    for (const opt of LANG_OPTIONS) {
      expect(opt.label.trim().length).toBeGreaterThan(0);
    }
  });

  test('LANG_OPTIONS 的每個 key 都能實際被 setLang 接受', () => {
    for (const opt of LANG_OPTIONS) {
      setLang(opt.key);
      expect(getLang()).toBe(opt.key);
    }
  });
});

/**
 * 資料完整性守門。
 * 語言切換器把三種語言都列給使用者，若某個 key 少了 en 或 ja，
 * 使用者切過去會看到中文夾雜——這種缺漏靠人工檢查 76 個 key 不可靠。
 */
describe('翻譯資料完整性', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'i18n.ts'),
    'utf8',
  );
  const declaredKeys = [...source.matchAll(/^ {2}'([^']+)':/gm)].map(m => m[1]);

  test('原始碼中至少宣告了 70 個 key（防止大量誤刪）', () => {
    expect(declaredKeys.length).toBeGreaterThanOrEqual(70);
  });

  test('沒有重複宣告的 key', () => {
    // 物件字面量的重複 key 會被靜默覆蓋，執行期查不出來，只能讀原始碼
    const seen = new Set<string>();
    const dupes = declaredKeys.filter(k => !seen.has(k) ? (seen.add(k), false) : true);
    expect(dupes).toEqual([]);
  });

  test('每個 key 在三種語言下都有非空翻譯', () => {
    const missing: string[] = [];
    for (const key of declaredKeys) {
      for (const lang of ALL_LANGS) {
        setLang(lang);
        const value = t(key);
        // 翻譯缺漏時 t 會回傳 key 本身
        if (value === key || value.trim().length === 0) {
          missing.push(`${key} (${lang})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('英文翻譯不應殘留中日文字元', () => {
    setLang('en');
    const leaked = declaredKeys.filter(k => /[一-鿿぀-ヿ]/.test(t(k)));
    expect(leaked).toEqual([]);
  });
});
