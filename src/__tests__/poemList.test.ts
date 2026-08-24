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
import { poemMatchesSearch, localizedPoemTitle } from '../services/poemList';

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

  test('首頁不直接渲染 record.poemTitle', () => {
    expect(homeSrc).not.toMatch(/\{r\.poemTitle\}/);
  });

  test('收藏卡片與資料夾列不直接渲染 record.poemTitle', () => {
    expect(collectionSrc).not.toMatch(/\{record\.poemTitle\}/);
    expect(collectionSrc).not.toMatch(/\{rec\.poemTitle\}/);
  });

  test('兩個畫面都走 localizedPoemTitle', () => {
    expect(homeSrc).toContain('localizedPoemTitle(');
    expect(collectionSrc).toContain('localizedPoemTitle(');
  });
});
