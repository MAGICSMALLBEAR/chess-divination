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
