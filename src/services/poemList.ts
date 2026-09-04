// 列表畫面顯示籤詩的小工具
//
// 圖鑑、首頁最近紀錄、收藏清單都拿「資料層的籤詩」渲染，
// 但顯示前必須先經 localizePoem 翻譯（reveal.tsx 也是同一個路徑）。
// 把「搜尋比對」與「標題翻譯」集中在此，避免各畫面各自重寫、
// 各自漏掉翻譯。

import type { Poem } from '@/data/poems';
import { getPoemById } from '@/data/poems';
import type { LingqiOracle } from '@/data/lingqiOracles';
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
 * 《靈棋經》卦目是否命中搜尋字串。
 *
 * 沒有 lang 參數是刻意的，與 poemMatchesSearch 不同：靈棋原典逐字保留、
 * 三語介面一律顯示漢字（見 data/lingqiOracles.ts 的檔頭），卡片上看得到
 * 的字就只有這一份，沒有第二種寫法要比對。
 *
 * 比對範圍涵蓋卡片收合時看得到的（卦名、卦目、象、詩曰）與展開後才看得到
 * 的（斷、方位、象曰、又曰、又）——使用者記得的往往是某一句四言或七言，
 * 而不是卦名。
 */
export function lingqiMatchesSearch(oracle: LingqiOracle, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystacks = [
    oracle.name, oracle.notation, oracle.image, oracle.stance, oracle.direction,
    ...oracle.xiang, ...oracle.xiangAlt, ...oracle.shi, ...oracle.shiAlt,
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

/**
 * 記錄清單要顯示的標題。
 *
 * 不能一律走 localizedPoemTitle(record.poemId)：靈棋記錄走的是《靈棋經》
 * 125 卦目而非六十四籤詩，其 poemId 恆為 0，而 getPoemById 對無效 id 的
 * fallback 是籤詩 #1——那會讓每一筆靈棋記錄都印成「龍騰九霄」。
 *
 * 靈棋的卦名（如「大通卦」）與六十四卦卦名同屬不翻譯的命理資料值，
 * 三語介面都顯示漢字原文，故直接取記錄上的 poemTitle。
 */
export function recordTitle(record: Pick<SearchableRecord, 'poemId' | 'poemTitle'> & { mode?: string }): string {
  return record.mode === 'lingqi' ? record.poemTitle : localizedPoemTitle(record.poemId);
}

/** recordMatchesSearch 只需要記錄裡的這幾個欄位，不必整個 DivinationRecord */
export interface SearchableRecord {
  poemId: number;
  poemTitle: string;
  poemContent: string;
  drawnPieceChars: string[];
  questionText?: string;
  /** 使用者為這次占卜寫下的自由筆記 */
  note?: string;
  /** 占驗回填時自述「實際發生了什麼」 */
  outcome?: { note?: string };
  /** 靈棋記錄不查籤詩表，見 recordTitle 與 recordMatchesSearch */
  mode?: string;
}

/**
 * 占卜記錄是否命中搜尋字串。
 *
 * 與 poemMatchesSearch 同樣的理由：收藏頁的卡片顯示的是
 * localizedPoemTitle(record.poemId)，但搜尋原本只比對 record.poemTitle
 * ——那是起卦當下存下的中文原題。en/ja 介面下，使用者輸入卡片上
 * 明明看得到的譯名，結果是零。圖鑑的同型缺陷已在 Session 32 修掉，
 * 收藏頁當時漏掉。
 *
 * 記錄自己存的中文原題與原文內容一併保留：那是這筆記錄的真實快照，
 * 且籤詩資料日後若有增修，記錄上的字仍應搜得到。
 *
 * questionText、note 與 outcome.note 都不顯示在卡片上，仍納入比對——
 * 它們是使用者回頭找某一次占卜時最好用的線索（「我那次問工作的是哪一卦？」
 * 「後來寫了『主管換人』的是哪一筆？」），而且只會多命中、不會漏掉本來
 * 搜得到的東西。
 *
 * 兩則筆記原本漏在外面：questionText 是起卦當下就有的欄位，寫這段比對時
 * 就在；`note`（自由筆記）與 `outcome.note`（占驗自述）是後來才加的，
 * 加欄位時沒有回頭看誰在比對記錄。使用者自己動手打下的字，比系統代填的
 * 任何欄位都更該搜得到。
 */
export function recordMatchesSearch(record: SearchableRecord, query: string, lang: Lang): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (recordTitle(record).toLowerCase().includes(q)) return true;

  // 籤詩全文（含譯文的內容與白話）也要能搜——卡片上雖只印標題，
  // 但使用者記得的往往是詩句而非篇名。
  // 靈棋記錄不走這條：它的 poemId 恆為 0，比對籤詩 #1 的內容只會誤命中，
  // 其卦名與詩句改由下方的 poemTitle／poemContent 快照涵蓋。
  if (record.mode !== 'lingqi' && poemMatchesSearch(getPoemById(record.poemId), query, lang)) return true;

  const own = [
    record.poemTitle,
    record.poemContent,
    record.drawnPieceChars.join(''),
    record.questionText ?? '',
    record.note ?? '',
    record.outcome?.note ?? '',
  ];
  return own.some(text => text.toLowerCase().includes(q));
}
