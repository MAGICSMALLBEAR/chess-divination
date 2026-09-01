import fs from 'fs';
import path from 'path';
import { t, setLang, getLang, subscribe, categoryLabel, LANG_OPTIONS, translations, type Lang } from '../services/i18n';

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

  test('帶佔位符的 key 三種語言都必須保留同一組佔位符', () => {
    // 少一個佔位符，那個語言就會靜靜少掉一段數字；
    // 多一個則會在畫面上留下沒被填掉的 {n}
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    const mismatched: string[] = [];
    for (const key of declaredKeys) {
      setLang('zh-TW');
      const base = placeholders(t(key));
      if (base.length === 0) continue;
      for (const lang of ['en', 'ja'] as Lang[]) {
        setLang(lang);
        if (placeholders(t(key)).join(',') !== base.join(',')) {
          mismatched.push(`${key} (${lang})`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe('t 的佔位符插值', () => {
  test('以 params 填入佔位符', () => {
    setLang('zh-TW');
    expect(t('stats.times', { n: 3 })).toBe('3 次');
    setLang('ja');
    expect(t('stats.times', { n: 3 })).toBe('3 回');
  });

  test('同一 key 的數字位置隨語言而異', () => {
    setLang('zh-TW');
    expect(t('home.streak', { n: 7 })).toBe('連續 7 天');
    setLang('en');
    expect(t('home.streak', { n: 7 })).toBe('7-day streak');
  });

  test('同一佔位符出現多次時全部填入', () => {
    // replace 搭配正則的 g 旗標，非只換第一個
    expect(t('collection.confirmBatch', { n: 2 })).toContain('2');
  });

  test('未傳 params 時佔位符原樣保留', () => {
    // 留著 {n} 很顯眼；換成空字串則會靜靜少一段文字，更難發現漏傳
    expect(t('stats.times')).toBe('{n} 次');
  });

  test('params 少傳一個 key 時，該佔位符原樣保留', () => {
    setLang('zh-TW');
    const result = t('stats.verifiedMeta', { v: 5 });
    expect(result).toContain('5');
    expect(result).toContain('{u}');
  });

  test('params 帶了字典裡沒有的 key 不影響輸出', () => {
    expect(t('stats.times', { n: 1, unused: 'x' })).toBe('1 次');
  });

  test('查無此 key 時回傳 key 本身，不做插值', () => {
    expect(t('no.such.key', { n: 1 })).toBe('no.such.key');
  });
});

describe('categoryLabel', () => {
  test('內建類別回傳當前語言的譯文', () => {
    setLang('zh-TW');
    expect(categoryLabel('marriage')).toBe('感情');
    setLang('en');
    expect(categoryLabel('marriage')).toBe('Love');
    setLang('ja');
    expect(categoryLabel('marriage')).toBe('恋愛');
  });

  test('七個內建類別在三種語言下都有譯文', () => {
    const keys = ['general', 'marriage', 'career', 'wealth', 'health', 'study', 'travel'];
    for (const lang of ALL_LANGS) {
      setLang(lang);
      for (const key of keys) {
        expect(categoryLabel(key)).not.toBe(key);
      }
    }
  });

  test('自訂類別的 key 原樣回傳', () => {
    // 使用者自己取的名字沒有譯文，硬套 t() 只會顯示出那串 key
    expect(categoryLabel('custom-1699999999')).toBe('custom-1699999999');
  });
});

// ── localizePoem / localizePiece / localizeAchievement ──

import { localizePoem, localizePiece, localizeAchievement } from '../services/localize';
import { getPoemById, type Poem } from '../data/poems';
import { ALL_PIECES, type ChessPiece } from '../data/pieces';
import { ACHIEVEMENTS, type Achievement } from '../services/achievements';

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

  /**
   * 列舉真正的成就清單，不再手抄 id。
   *
   * 原本抄了八個 id，而清單早已長到十項——漏在外面的 first_verify 與
   * ten_verify 剛好有人補了翻譯，才沒在畫面上露出英文介面裡的中文成就名。
   * 手抄的清單不會跟著新成就長大，這種守門測試綠得沒有意義。
   */
  test('每一項成就都有 en 和 ja 翻譯', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
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

// ── 三語完整性守門 ──
//
// 兩批平行開發（牌陣系統與主題／備份修復）各自往翻譯表加了十幾個鍵，
// 而在此之前沒有任何測試檢查新鍵是否補齊 en/ja。
// 漏翻譯不會壞掉任何功能——t() 會原樣回傳鍵名，於是畫面上直接出現
// 「board.spreadTimelineHint」這種字串，只有真的切到該語言才看得到。

describe('翻譯表的三語完整性', () => {
  const LANGS: Lang[] = ['zh-TW', 'en', 'ja'];
  const entries = Object.entries(translations);

  test('翻譯表非空（避免守門測試空轉）', () => {
    expect(entries.length).toBeGreaterThan(300);
  });

  test('每個鍵都具備三種語言', () => {
    const missing: string[] = [];
    for (const [key, value] of entries) {
      for (const lang of LANGS) {
        if (typeof value[lang] !== 'string') missing.push(`${key} → 缺 ${lang}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('沒有空字串或只有空白的翻譯', () => {
    const blank: string[] = [];
    for (const [key, value] of entries) {
      for (const lang of LANGS) {
        if (typeof value[lang] === 'string' && value[lang].trim() === '') {
          blank.push(`${key}/${lang}`);
        }
      }
    }
    expect(blank).toEqual([]);
  });

  /** 佔位符在三種語言必須一致，否則換語言後參數就不會被替換 */
  test('含參數的鍵，三種語言的佔位符相同', () => {
    const mismatched: string[] = [];
    for (const [key, value] of entries) {
      const setOf = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
      const base = setOf(value['zh-TW']);
      for (const lang of LANGS) {
        if (setOf(value[lang]) !== base) {
          mismatched.push(`${key}/${lang}: {${setOf(value[lang])}} ≠ {${base}}`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });
});
