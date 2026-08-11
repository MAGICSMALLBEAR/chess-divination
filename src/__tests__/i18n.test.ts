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

// ── localizePoem / localizePiece / localizeAchievement ──

import { localizePoem, localizePiece, localizeAchievement } from '../services/localize';
import { getPoemById, type Poem } from '../data/poems';
import { ALL_PIECES, type ChessPiece } from '../data/pieces';
import type { Achievement } from '../services/achievements';

describe('localizePoem', () => {
  test('zh-TW 回傳原始物件（不產生新參考也無妨，欄位一致即為正確）', () => {
    setLang('zh-TW');
    const poem = getPoemById(1);
    const result = localizePoem(poem);
    expect(result.title).toBe(poem.title);
    expect(result.content).toBe(poem.content);
    expect(result.vernacular).toBe(poem.vernacular);
    expect(result.story).toBe(poem.story);
  });

  test('en 回傳翻譯後的詩籤', () => {
    setLang('en');
    const poem = getPoemById(1);
    const result = localizePoem(poem);
    expect(result.title).not.toBe(poem.title);
    expect(result.title!.length).toBeGreaterThan(0);
    expect(result.vernacular!.length).toBeGreaterThan(20);
    expect(result.story!.length).toBeGreaterThan(20);
    expect(result.content!.split('\n').length).toBe(4);
  });

  test('ja 回傳翻譯後的詩籤', () => {
    setLang('ja');
    const poem = getPoemById(64);
    const result = localizePoem(poem);
    expect(result.title!.length).toBeGreaterThan(0);
    expect(result.vernacular!.length).toBeGreaterThan(20);
    expect(result.content!.split('\n').length).toBe(4);
  });

  test('jieYue 各面向皆被翻譯', () => {
    setLang('en');
    const result = localizePoem(getPoemById(11));
    expect(result.jieYue.marriage).not.toBe(getPoemById(11).jieYue.marriage);
    expect(result.jieYue.wealth!.length).toBeGreaterThan(5);
    expect(result.jieYue.career!.length).toBeGreaterThan(5);
    expect(result.jieYue.health!.length).toBeGreaterThan(5);
    expect(result.jieYue.study!.length).toBeGreaterThan(5);
    expect(result.jieYue.travel!.length).toBeGreaterThan(5);
    expect(result.jieYue.general!.length).toBeGreaterThan(5);
  });

  test('全部 64 首籤詩在 en/ja 下都有翻譯', () => {
    const missing: string[] = [];
    for (const lang of ['en', 'ja'] as Lang[]) {
      setLang(lang);
      for (let id = 1; id <= 64; id++) {
        const poem = getPoemById(id);
        const localized = localizePoem(poem);
        if (!localized.title || localized.title === poem.title) {
          missing.push(`poem ${id} title (${lang})`);
        }
        if (!localized.vernacular || localized.vernacular === poem.vernacular) {
          missing.push(`poem ${id} vernacular (${lang})`);
        }
        if (!localized.story || localized.story === poem.story) {
          missing.push(`poem ${id} story (${lang})`);
        }
        for (const cat of ['marriage', 'wealth', 'career', 'health', 'study', 'travel', 'general']) {
          const origCat = (poem.jieYue as any)[cat];
          const locCat = (localized.jieYue as any)[cat];
          if (!locCat || locCat === origCat) {
            missing.push(`poem ${id} jieYue.${cat} (${lang})`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('localizePoem 接受 explicit lang 參數', () => {
    setLang('zh-TW');
    const result = localizePoem(getPoemById(1), 'en');
    expect(result.title).not.toBe(getPoemById(1).title);
  });
});

describe('localizePiece', () => {
  test('zh-TW 回傳原始棋子', () => {
    setLang('zh-TW');
    const piece = ALL_PIECES[0];
    const result = localizePiece(piece);
    expect(result.meaning).toBe(piece.meaning);
    expect(result.keywords).toEqual(piece.keywords);
  });

  test('en 回傳翻譯後的棋子', () => {
    setLang('en');
    const piece = ALL_PIECES[0]; // red-king-1
    const result = localizePiece(piece);
    expect(result.meaning).not.toBe(piece.meaning);
    expect(result.meaning!.length).toBeGreaterThan(20);
    expect(result.keywords!.length).toBe(5);
    // keywords 應為英文
    for (const kw of result.keywords!) {
      expect(/^[A-Z]/.test(kw)).toBe(true);
    }
  });

  test('ja 回傳翻譯後的棋子', () => {
    setLang('ja');
    const piece = ALL_PIECES[15]; // black-chariot-1
    const result = localizePiece(piece);
    expect(result.meaning!.length).toBeGreaterThan(10);
    expect(result.keywords!.length).toBe(5);
  });

  test('全部 32 顆棋子在 en/ja 下都有翻譯', () => {
    const missing: string[] = [];
    for (const lang of ['en', 'ja'] as Lang[]) {
      setLang(lang);
      for (const piece of ALL_PIECES) {
        const localized = localizePiece(piece);
        if (!localized.meaning || localized.meaning === piece.meaning) {
          missing.push(`${piece.id} meaning (${lang})`);
        }
        if (!localized.keywords || localized.keywords === piece.keywords) {
          missing.push(`${piece.id} keywords (${lang})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('localizeAchievement', () => {
  const mockAchievement: Achievement = {
    id: 'first_draw',
    title: '初窺棋道',
    desc: '完成第一次抽棋占卜',
    icon: '🎲',
    unlocked: true,
  };

  test('zh-TW 回傳原始成就', () => {
    setLang('zh-TW');
    const result = localizeAchievement(mockAchievement);
    expect(result.title).toBe('初窺棋道');
    expect(result.desc).toBe('完成第一次抽棋占卜');
  });

  test('en 回傳翻譯後的成就', () => {
    setLang('en');
    const result = localizeAchievement(mockAchievement);
    expect(result.title).toBe('First Glimpse of the Way');
    expect(result.desc).toBe('Complete your first chess piece divination');
  });

  test('ja 回傳翻譯後的成就', () => {
    setLang('ja');
    const result = localizeAchievement(mockAchievement);
    expect(result.title).toBe('初めて棋道を窺う');
    expect(result.desc!.length).toBeGreaterThan(5);
  });

  test('八項成就全部有 en 和 ja 翻譯', () => {
    const ids = ['first_draw', 'ten_draws', 'fifty_draws', 'first_board', 'first_favorite', 'week_streak', 'both_modes', 'all_levels'];
    const missing: string[] = [];
    for (const lang of ['en', 'ja'] as Lang[]) {
      setLang(lang);
      for (const id of ids) {
        const ach: Achievement = { id, title: 'orig', desc: 'orig', icon: '🎲', unlocked: false };
        const result = localizeAchievement(ach);
        if (!result.title || result.title === 'orig') {
          missing.push(`${id} title (${lang})`);
        }
        if (!result.desc || result.desc === 'orig') {
          missing.push(`${id} desc (${lang})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
