/**
 * 問事子領域 → 既有的解讀／用神主類別。
 *
 * 子領域讓使用者把問題說清楚；命理規則仍只在取法有明確依據的主類別上運作。
 * 不要直接以子領域 key 擴寫 useGod，否則容易把沒有定法的細節誤裝成定論。
 */
export const QUESTION_CATEGORY_DOMAINS: Readonly<Record<string, string>> = {
  relationship: 'marriage',
  reconciliation: 'marriage',
  jobSearch: 'career',
  promotion: 'career',
  workplace: 'career',
  business: 'career',
  cashflow: 'wealth',
  exam: 'study',
  wellbeing: 'health',
  relocation: 'travel',
};

/** 供規則式解讀、AI 標籤與用神取法共用的主類別。 */
export function questionCategoryDomain(category?: string): string {
  if (!category) return 'general';
  return QUESTION_CATEGORY_DOMAINS[category] ?? category;
}

/**
 * 籤詩詳解的七個面向，順序即 PoemCard 分頁的順序。
 * 與 `Poem.jieYue` 的欄位一一對應（由 poems.test 釘住）。
 */
export const POEM_FACETS = [
  'general', 'marriage', 'career', 'wealth', 'health', 'study', 'travel',
] as const;

/**
 * 問事類別對應的詳解面向。
 *
 * 子領域先映回主類別；自訂類別映不回來，退回綜合——原樣送進去的話
 * 七個分頁一個都不會亮，內容也會靜靜掉回綜合，看起來像沒選過類別。
 */
export function poemFacetForCategory(category?: string): string {
  const domain = questionCategoryDomain(category);
  return (POEM_FACETS as readonly string[]).includes(domain) ? domain : 'general';
}
