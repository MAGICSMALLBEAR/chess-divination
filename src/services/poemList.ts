// 列表畫面顯示籤詩的小工具
//
// 圖鑑、首頁最近紀錄、收藏清單都拿「資料層的籤詩」渲染，
// 但顯示前必須先經 localizePoem 翻譯（reveal.tsx 也是同一個路徑）。
// 把「搜尋比對」與「標題翻譯」集中在此，避免各畫面各自重寫、
// 各自漏掉翻譯。

import type { Poem } from '@/data/poems';
import { getPoemById } from '@/data/poems';
import type { Lang } from './i18n';
import { localizePoem } from './localize';

/**
 * 籤詩是否命中搜尋字串。
 *
 * 比對對象必須是「畫面上看得到的字」：圖鑑卡片顯示的是 localizePoem
 * 之後的標題/內文/白話，若只拿 ALL_POEMS 的中文原文比對，en/ja 介面下
 * 搜尋螢幕上看得到的字會永遠零結果。
 *
 * 卦名（hexagramName）是資料層刻意不翻譯的中文字面值——en/ja 介面的
 * 卡片上顯示的仍是中文卦名，故卦名只比對原文即可命中。
 *
 * 中文原文欄位也一併納入：中文背景的使用者即使把介面切到 en/ja，
 * 仍習慣用原文查找；且翻譯缺漏時卡片會 fallback 顯示原文——
 * 「看得到的都搜得到」就需要原文與譯文兩邊都比對。
 * toLowerCase 對 CJK 是 no-op，但讓英文大小寫不敏感。
 */
export function poemMatchesSearch(poem: Poem, query: string, lang: Lang): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const localized = localizePoem(poem, lang);
  const haystacks = [
    localized.title, localized.content, localized.vernacular,
    poem.title, poem.content, poem.vernacular, poem.hexagramName,
  ];
  return haystacks.some(text => text.toLowerCase().includes(q));
}

/**
 * 記錄清單要顯示的籤詩標題。
 *
 * DivinationRecord 存的是起卦當下的中文原題；en/ja 介面下若直接渲染
 * record.poemTitle，同一筆記錄在首頁/收藏是中文、點進 reveal 頁卻是
 * 譯文，前後不一致。與 reveal.tsx 相同的 localizePoem(getPoemById(...))
 * 路徑；id 無效時 getPoemById 有既定的 fallback（籤詩 #1），不會拋錯。
 */
export function localizedPoemTitle(poemId: number): string {
  return localizePoem(getPoemById(poemId)).title;
}
