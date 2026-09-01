// poemList.ts 測試
//
// 兩個缺陷的守門：
//   1. 圖鑑搜尋過去只比對 ALL_POEMS 的中文原文，en/ja 介面下
//      搜尋螢幕上看得到的英文／日文永遠零結果。
//   2. 首頁與收藏清單直接渲染 record.poemTitle（中文原題），
//      與 reveal 頁顯示的譯文不一致。
import fs from 'fs';
import path from 'path';
import { getPoemById } from '../data/poems';
import { setLang } from '../services/i18n';
import { poemMatchesSearch, localizedPoemTitle, recordMatchesSearch, lingqiMatchesSearch } from '../services/poemList';
import { LINGQI_ORACLES } from '../data/lingqiOracles';

const poem1 = getPoemById(1); // 乾為天 / Dragon Soars the Heavens / 龍 九霄に騰がる

afterEach(() => {
  setLang('zh-TW');
});

describe('poemMatchesSearch：比對畫面上顯示的字', () => {
  test('中文介面：卦名可搜（卦名刻意不翻譯）', () => {
    expect(poemMatchesSearch(poem1, '乾為天', 'zh-TW')).toBe(true);
  });

  test('中文介面：原題可搜', () => {
    expect(poemMatchesSearch(poem1, '龍騰', 'zh-TW')).toBe(true);
  });

  // 核心缺陷：en 介面下卡片顯示的是譯文，搜尋譯文必須命中
  test('英文介面：搜尋譯文標題命中', () => {
    expect(poemMatchesSearch(poem1, 'Dragon', 'en')).toBe(true);
  });

  test('英文介面：搜尋譯文內文命中', () => {
    // en content: "The general ascends to hold ten thousand shields."
    expect(poemMatchesSearch(poem1, 'shields', 'en')).toBe(true);
  });

  test('英文介面：搜尋譯文白話命中', () => {
    // en vernacular: "... majestic and unstoppable."
    expect(poemMatchesSearch(poem1, 'majestic', 'en')).toBe(true);
  });

  test('日文介面：搜尋日文標題命中', () => {
    expect(poemMatchesSearch(poem1, '九霄', 'ja')).toBe(true);
  });

  test('英文搜尋大小寫不敏感', () => {
    expect(poemMatchesSearch(poem1, 'dragon', 'en')).toBe(true);
  });

  // 決策：中文原文在 en/ja 介面下仍可搜——
  // 卦名本就是畫面上的中文字面值，且中文背景使用者即使切到
  // 外語介面，仍習慣用原文查找
  test('英文介面：中文卦名仍可搜', () => {
    expect(poemMatchesSearch(poem1, '乾為天', 'en')).toBe(true);
  });

  test('英文介面：中文原題仍可搜', () => {
    expect(poemMatchesSearch(poem1, '龍騰九霄', 'en')).toBe(true);
  });

  test('無匹配字串回 false', () => {
    expect(poemMatchesSearch(poem1, 'zzzz', 'en')).toBe(false);
  });

  test('空字串與純空白視為未搜尋，回 true', () => {
    expect(poemMatchesSearch(poem1, '', 'en')).toBe(true);
    expect(poemMatchesSearch(poem1, '   ', 'en')).toBe(true);
  });

  test('查詢字串前後空白會被忽略', () => {
    expect(poemMatchesSearch(poem1, '  Dragon  ', 'en')).toBe(true);
  });
});

describe('localizedPoemTitle：記錄清單顯示的譯文標題', () => {
  test('中文介面回原題', () => {
    expect(localizedPoemTitle(1)).toBe('龍騰九霄');
  });

  test('英文介面回譯文標題', () => {
    setLang('en');
    expect(localizedPoemTitle(1)).toBe('Dragon Soars the Heavens');
  });

  test('日文介面回譯文標題', () => {
    setLang('ja');
    expect(localizedPoemTitle(1)).toBe('龍 九霄に騰がる');
  });

  test('無效 poemId 走 getPoemById 的既定 fallback，不拋錯', () => {
    expect(localizedPoemTitle(9999)).toBe('龍騰九霄');
  });
});

/**
 * recordMatchesSearch：收藏頁的搜尋。
 *
 * 與圖鑑是同一個缺陷的兩處：卡片渲染的是 localizedPoemTitle，
 * 搜尋卻只比對 record.poemTitle（起卦當下存下的中文原題）。
 * 圖鑑那一處已於 Session 32 修掉，收藏頁當時漏掉。
 */
describe('recordMatchesSearch：收藏頁的記錄搜尋', () => {
  const record = {
    poemId: 1,
    poemTitle: '乾為天',
    poemContent: '龍騰九霄志凌雲',
    drawnPieceChars: ['帥', '車'],
    questionText: '這次面試會順利嗎',
  };

  test('中文介面下以原題命中', () => {
    expect(recordMatchesSearch(record, '乾為天', 'zh-TW')).toBe(true);
  });

  /** 這一條就是缺陷本身：en 介面下卡片印的是譯名，搜尋卻搜不到 */
  test('英文介面下以卡片顯示的譯名命中', () => {
    const shown = (setLang('en'), localizedPoemTitle(1));
    expect(shown).not.toBe('乾為天');
    expect(recordMatchesSearch(record, shown, 'en')).toBe(true);
  });

  test('日文介面下以卡片顯示的譯名命中', () => {
    const shown = (setLang('ja'), localizedPoemTitle(1));
    expect(recordMatchesSearch(record, shown, 'ja')).toBe(true);
  });

  test('切到 en/ja 後仍可用中文原文查找', () => {
    // 中文背景的使用者即使把介面切走，仍習慣用原文搜
    expect(recordMatchesSearch(record, '乾為天', 'en')).toBe(true);
    expect(recordMatchesSearch(record, '龍騰', 'ja')).toBe(true);
  });

  test('以棋子漢字命中', () => {
    expect(recordMatchesSearch(record, '帥', 'zh-TW')).toBe(true);
    expect(recordMatchesSearch(record, '帥車', 'zh-TW')).toBe(true);
  });

  /** 問題本文不顯示在卡片上，但那是使用者回頭找某次占卜最好用的線索 */
  test('以自己寫下的問題命中', () => {
    expect(recordMatchesSearch(record, '面試', 'zh-TW')).toBe(true);
  });

  test('沒有問題本文的記錄不因此出錯', () => {
    const { questionText, ...noQuestion } = record;
    void questionText;
    expect(recordMatchesSearch(noQuestion, '乾為天', 'zh-TW')).toBe(true);
    expect(recordMatchesSearch(noQuestion, 'zzzz', 'zh-TW')).toBe(false);
  });

  test('空字串視為不過濾', () => {
    expect(recordMatchesSearch(record, '', 'zh-TW')).toBe(true);
    expect(recordMatchesSearch(record, '   ', 'zh-TW')).toBe(true);
  });

  test('無關字串不命中', () => {
    expect(recordMatchesSearch(record, 'zzzz', 'zh-TW')).toBe(false);
  });

  test('英文比對不分大小寫、前後空白不影響', () => {
    setLang('en');
    const shown = localizedPoemTitle(1);
    expect(recordMatchesSearch(record, `  ${shown.toUpperCase()}  `, 'en')).toBe(true);
  });
});

/**
 * 靜態守門：首頁與收藏清單必須透過 localizedPoemTitle 顯示標題。
 *
 * 行為測試只能守 poemList.ts 本身；「畫面有沒有真的走這條路」
 * 是接線層的問題，直接渲染整頁的成本太高，改以來源掃描擋住
 * 「繞過翻譯直接渲染 record.poemTitle」的寫法。
 */
describe('列表畫面的籤詩標題接線（靜態守門）', () => {
  const homeSrc = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(tabs)', 'index.tsx'), 'utf-8');
  const collectionSrc = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(tabs)', 'collection.tsx'), 'utf-8');

  /**
   * 守住接線：收藏頁若哪天又改回自己拼 includes，這裡會紅。
   * 缺陷能在圖鑑修好後仍留在收藏頁，正是因為沒有東西擋著。
   */
  test('收藏頁的搜尋走 recordMatchesSearch，不自己比對原題', () => {
    expect(collectionSrc).toContain('recordMatchesSearch(');
    expect(collectionSrc).not.toMatch(/r\.poemTitle\.includes\(/);
    expect(collectionSrc).not.toMatch(/r\.poemContent\.includes\(/);
  });

  test('首頁不直接渲染 record.poemTitle', () => {
    expect(homeSrc).not.toMatch(/\{r\.poemTitle\}/);
  });

  test('收藏卡片與資料夾列不直接渲染 record.poemTitle', () => {
    expect(collectionSrc).not.toMatch(/\{record\.poemTitle\}/);
    expect(collectionSrc).not.toMatch(/\{rec\.poemTitle\}/);
  });

  /**
   * 兩個畫面都得走 recordTitle，而不是直接呼叫 localizedPoemTitle。
   *
   * 差別在靈棋記錄：它走《靈棋經》125 卦目，poemId 恆為 0，而 getPoemById
   * 對無效 id 的 fallback 是籤詩 #1——直接呼叫 localizedPoemTitle 會讓
   * 每一筆靈棋記錄都印成「龍騰九霄」，而且畫面上看起來像一筆正常記錄，
   * 不會有任何錯誤跡象。recordTitle 是唯一分得清兩種記錄的那道門。
   */
  test('兩個畫面都走 recordTitle，不直接呼叫 localizedPoemTitle', () => {
    expect(homeSrc).toContain('recordTitle(');
    expect(collectionSrc).toContain('recordTitle(');
    expect(homeSrc).not.toContain('localizedPoemTitle(');
    expect(collectionSrc).not.toContain('localizedPoemTitle(');
  });
});

/**
 * 靈棋卦目搜尋。
 *
 * 圖鑑加了靈棋分頁後，125 卦目要搜得到——而使用者記得的往往是某一句
 * 四言或七言，不是卦名。這裡釘住比對範圍涵蓋收合與展開兩種狀態下
 * 看得到的每一個欄位。
 */
describe('lingqiMatchesSearch', () => {
  const daTong = LINGQI_ORACLES.find(o => o.key === '1-1-1')!;

  test('卦名、卦目與象都命中', () => {
    expect(lingqiMatchesSearch(daTong, daTong.name)).toBe(true);
    expect(lingqiMatchesSearch(daTong, '一上一中一下')).toBe(true);
    expect(lingqiMatchesSearch(daTong, daTong.image)).toBe(true);
  });

  test('展開後才看得到的象曰與詩曰也搜得到', () => {
    expect(lingqiMatchesSearch(daTong, daTong.xiang[0])).toBe(true);
    expect(lingqiMatchesSearch(daTong, daTong.shi[0])).toBe(true);
  });

  test('斷與方位同樣納入比對', () => {
    expect(lingqiMatchesSearch(daTong, daTong.stance)).toBe(true);
    expect(lingqiMatchesSearch(daTong, daTong.direction)).toBe(true);
  });

  test('空白查詢視為全部通過，不會讓清單變空', () => {
    expect(lingqiMatchesSearch(daTong, '')).toBe(true);
    expect(lingqiMatchesSearch(daTong, '   ')).toBe(true);
  });

  test('不相干的字不命中', () => {
    expect(lingqiMatchesSearch(daTong, 'zzz')).toBe(false);
  });

  /**
   * 靈棋不吃 lang：原典三語都顯示漢字原文（見 data/lingqiOracles.ts 檔頭）。
   * 切語言後仍搜得到，是這個決定的直接後果，值得釘住。
   */
  test('切到 en/ja 仍以漢字原文搜得到', () => {
    for (const lang of ['en', 'ja'] as const) {
      setLang(lang);
      expect(lingqiMatchesSearch(daTong, daTong.name)).toBe(true);
    }
  });

  test('125 卦目每一卦都搜得到自己的卦名', () => {
    const missed = LINGQI_ORACLES.filter(o => !lingqiMatchesSearch(o, o.name));
    expect(missed).toEqual([]);
    expect(LINGQI_ORACLES).toHaveLength(125);
  });
});
