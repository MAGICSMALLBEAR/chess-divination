// 術語詞典的搜尋與分組
//
// 與 poemList.ts 同一個道理：比對的是「畫面上看得到的字」，所以 en/ja 介面下
// 要比對當前語言的兩段說明；但術語本身是漢字、且使用者多半是從盤面上抄下一個
// 詞來查，中文原文也一併納入——「看得到的都搜得到」需要兩邊都比。

import { GLOSSARY, GLOSSARY_GROUPS, type GlossaryEntry, type GlossaryGroupId } from '@/data/glossary';
import type { Lang } from './i18n';

/** 詞條是否命中搜尋字串（空字串命中全部） */
export function glossaryMatchesSearch(entry: GlossaryEntry, query: string, lang: Lang): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystacks = [
    entry.term, entry.gloss,
    entry.plain[lang], entry.inApp[lang],
    entry.plain['zh-TW'], entry.inApp['zh-TW'],
  ];
  return haystacks.some(text => text.toLowerCase().includes(q));
}

export interface GlossarySection {
  group: GlossaryGroupId;
  entries: GlossaryEntry[];
}

/**
 * 依搜尋字串篩出詞條，並照 GLOSSARY_GROUPS 的順序分組。
 * 沒有命中任何詞條的分組直接省略——畫面不該出現只有標題沒有內容的區塊。
 */
export function searchGlossary(query: string, lang: Lang): GlossarySection[] {
  const hits = GLOSSARY.filter(entry => glossaryMatchesSearch(entry, query, lang));
  return GLOSSARY_GROUPS
    .map(group => ({ group, entries: hits.filter(entry => entry.group === group) }))
    .filter(section => section.entries.length > 0);
}

/**
 * 長按盤面某一塊時要列出的詞條：依給定順序、去重。
 * 不認得的 key 直接丟掉——盤面上寫錯一個 key 不該讓整張速查表打不開；
 * 寫錯由 glossaryPeek.test.ts 掃 LiuYaoPanel 的原始碼抓出來。
 */
export function glossaryEntriesFor(keys: readonly string[]): GlossaryEntry[] {
  const seen = new Set<string>();
  const out: GlossaryEntry[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = GLOSSARY.find(e => e.key === key);
    if (entry) out.push(entry);
  }
  return out;
}

/** 六親（盤面上印的漢字，如「妻財」）對應的詞條 key；不是六親回 undefined */
export function glossaryKeyForRelative(relative: string): string | undefined {
  return GLOSSARY.find(e => e.group === 'relative' && e.key !== 'sixRelatives' && e.term === relative)?.key;
}
