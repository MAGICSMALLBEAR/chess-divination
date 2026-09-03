import fs from 'fs';
import path from 'path';
import { questionPrompts } from '@/services/questionPrompts';
import {
  questionCategoryDomain, poemFacetForCategory, POEM_FACETS, QUESTION_CATEGORY_DOMAINS,
} from '@/services/questionCategories';
import { ALL_POEMS } from '@/data/poems';

describe('快速提問範本', () => {
  test('每個內建細分領域都有四個以上可直接帶入的中文問題', () => {
    for (const key of [
      'relationship', 'reconciliation', 'jobSearch', 'promotion', 'workplace',
      'business', 'cashflow', 'exam', 'wellbeing', 'relocation',
    ]) {
      const prompts = questionPrompts(key, key, 'zh-TW');
      expect(prompts.length).toBeGreaterThanOrEqual(4);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  test('沒有專屬翻譯的語言與自訂類別仍提供五個可用範本', () => {
    expect(questionPrompts('jobSearch', 'Job Search', 'en')).toHaveLength(5);
    expect(questionPrompts('custom-1', '自訂類別', 'ja')).toHaveLength(5);
  });
});

describe('細分領域的解讀歸類', () => {
  test.each([
    ['relationship', 'marriage'], ['reconciliation', 'marriage'],
    ['jobSearch', 'career'], ['promotion', 'career'], ['workplace', 'career'], ['business', 'career'],
    ['cashflow', 'wealth'], ['exam', 'study'], ['wellbeing', 'health'], ['relocation', 'travel'],
  ])('%s 沿用 %s 的既有解讀規則', (category, domain) => {
    expect(questionCategoryDomain(category)).toBe(domain);
  });
});

/**
 * 子領域上線後，凡是「只認七個主類別」的地方都會靜靜失準：
 * 不會壞畫面、不會紅型別，只會讓使用者選了「求職」之後，
 * 拿到的是綜合詳解、沒有用神斷語、統計上與「事業」分成兩列。
 */
describe('子領域在周邊系統的映回', () => {
  test('七個詳解面向與籤詩的 jieYue 欄位一一對應', () => {
    for (const poem of ALL_POEMS) {
      expect(Object.keys(poem.jieYue).sort()).toEqual([...POEM_FACETS].sort());
    }
  });

  test('每個子領域都對得到一個詳解面向', () => {
    for (const key of Object.keys(QUESTION_CATEGORY_DOMAINS)) {
      expect(POEM_FACETS).toContain(poemFacetForCategory(key));
      expect(poemFacetForCategory(key)).toBe(questionCategoryDomain(key));
    }
  });

  test('自訂類別與未給值退回綜合，而不是留著對不上分頁的原鍵', () => {
    expect(poemFacetForCategory('custom-1735689600000')).toBe('general');
    expect(poemFacetForCategory(undefined)).toBe('general');
  });

  // PoemCard 的分頁陣列是元件內的常數，改動它不會驚動任何型別；
  // 少一格或多一格都會讓「預設展開所問的那一面」對不上。
  test('PoemCard 的分頁鍵就是這七個面向', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'PoemCard.tsx'), 'utf-8',
    );
    const block = source.slice(source.indexOf('const CATEGORIES'));
    const keys = [...block.slice(0, block.indexOf('];')).matchAll(/key: '([^']+)'/g)]
      .map(m => m[1]);
    expect(keys).toEqual([...POEM_FACETS]);
  });

  // 感情的用神取法依占者性別而定，取不到就整段斷語都不出；
  // 只認 'marriage' 的話，子領域會沒有斷語也沒有「請補性別」的提示。
  test('六爻盤的性別提示比對映回後的主類別', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'LiuYaoPanel.tsx'), 'utf-8',
    );
    expect(source).toMatch(/needsGender\s*=\s*questionCategoryDomain\(questionCategory\)\s*===\s*'marriage'/);
  });

  // 三頁用的是同一個選類別元件，其中一頁不記得選過什麼只會像是沒存到。
  test.each(['draw.tsx', 'board.tsx', 'lingqi.tsx'])('%s 記得上次選的問事類別', (page) => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', page), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(/\r?\n/).map(line => line.replace(/\/\/.*$/, '')).join('\n');
    expect(source).toContain('saveSettings({ questionCategory:');
    expect(source).toMatch(/if \(s(ettings)?\.questionCategory\) setSelectedCategory/);
  });
});
