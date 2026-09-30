import { getLang, type Lang } from './i18n';
import type { Poem } from '@/data/poems';

type PoemTranslations = typeof import('@/data/translations/poems').poemTranslations;
type TranslationLang = Exclude<Lang, 'zh-TW'>;

// 中文介面完全不需要譯文；英文與日文各自只有在首次切換時才下載。
let poemTranslations: Partial<PoemTranslations> | undefined;
const loadingTranslations = new Map<TranslationLang, Promise<void>>();
const loadedLanguages = new Set<TranslationLang>();

export function preloadPoemTranslations(lang: Lang = getLang()): Promise<void> {
  if (lang === 'zh-TW') return Promise.resolve();
  if (loadedLanguages.has(lang)) return Promise.resolve();
  const existing = loadingTranslations.get(lang);
  if (existing) return existing;

  const loading = (lang === 'en'
    ? import('@/data/translations/poems.en').then(({ poemTranslationsEn }) => poemTranslationsEn)
    : import('@/data/translations/poems.ja').then(({ poemTranslationsJa }) => poemTranslationsJa)
  ).then((loaded) => {
    poemTranslations = { ...poemTranslations, ...loaded };
    loadedLanguages.add(lang);
  });
  loadingTranslations.set(lang, loading);
  void loading.catch(() => loadingTranslations.delete(lang));
  return loading;
}

/** 僅供 Jest 注入資料；產品環境一律走 preloadPoemTranslations 的動態 chunk。 */
export function seedPoemTranslationsForTests(translations: PoemTranslations): void {
  poemTranslations = translations;
  loadedLanguages.add('en');
  loadedLanguages.add('ja');
}

/** 回傳指定語言的籤詩副本；沒有譯文時保留中文原文。 */
export function localizePoem(poem: Poem, lang?: Lang): Poem {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return poem;
  // 譯文還在下載時先保留原文；載入完成後 setLang 會通知 UI 重繪。
  const locales = poemTranslations?.[poem.id]?.[l];
  if (!locales) return poem;
  return {
    ...poem,
    title: locales.title ?? poem.title,
    content: locales.content ?? poem.content,
    vernacular: locales.vernacular ?? poem.vernacular,
    story: locales.story ?? poem.story,
    jieYue: locales.jieYue ? { ...poem.jieYue, ...locales.jieYue } : poem.jieYue,
  };
}
