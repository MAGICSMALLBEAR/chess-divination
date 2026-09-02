import { questionPrompts } from '@/services/questionPrompts';
import { questionCategoryDomain } from '@/services/questionCategories';

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
