// 資料層多語系輔助函式
//
// UI 翻譯透過 i18n.ts 的 t() 處理（key-value lookup）。
// 此模組則負責將「資料物件」（籤詩、棋子、成就）依目前語言回傳對應欄位。
//
// 用法：
//   import { localizePoem } from '@/services/localize';
//   const poem = getPoemById(id);
//   const localized = localizePoem(poem);  // 依 getLang() 回傳對應語言的 poem
//
// 所有翻譯資料存放在 src/data/translations/ 目錄下。

import { getLang, type Lang, type TParams } from './i18n';
import type { Poem } from '@/data/poems';
import type { ChessPiece } from '@/data/pieces';
import type { Achievement } from '@/services/achievements';
import { poemTranslations } from '@/data/translations/poems';
import { pieceTranslations } from '@/data/translations/pieces';
import { achievementTranslations } from '@/data/translations/achievements';
import { divinationProse } from '@/data/translations/divination';

// ── Poem ──

/** 回傳指定語言的籤詩副本。若該語言無翻譯，fallback 到 zh-TW 原文。 */
export function localizePoem(poem: Poem, lang?: Lang): Poem {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return poem;

  const t = poemTranslations[poem.id];
  if (!t) return poem;

  const locales = t[l];
  if (!locales) return poem;

  return {
    ...poem,
    title: locales.title ?? poem.title,
    content: locales.content ?? poem.content,
    vernacular: locales.vernacular ?? poem.vernacular,
    story: locales.story ?? poem.story,
    jieYue: locales.jieYue
      ? { ...poem.jieYue, ...locales.jieYue }
      : poem.jieYue,
  };
}

// ── Piece ──

/** 回傳指定語言的棋子副本 */
export function localizePiece(piece: ChessPiece, lang?: Lang): ChessPiece {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return piece;

  const t = pieceTranslations[piece.id];
  if (!t) return piece;

  const locales = t[l];
  if (!locales) return piece;

  return {
    ...piece,
    meaning: locales.meaning ?? piece.meaning,
    keywords: locales.keywords ?? piece.keywords,
  };
}

// ── Achievement ──

/** 回傳指定語言的成就副本 */
export function localizeAchievement(achievement: Achievement, lang?: Lang): Achievement {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return achievement;

  const t = achievementTranslations[achievement.id];
  if (!t) return achievement;

  const locales = t[l];
  if (!locales) return achievement;

  return {
    ...achievement,
    title: locales.title ?? achievement.title,
    desc: locales.desc ?? achievement.desc,
  };
}

// ── 命理散文 ──

/**
 * 回傳命理斷語散文的譯文；沒有譯文就回傳中文原句。
 *
 * 與上面三個不同，這裡以 key + fallback 而非資料物件作為介面，
 * 因為這些句子不屬於某個有 id 的資料（籤詩、棋子、成就），
 * 而是寫在服務裡的斷語。fallback 就是服務裡那一句中文原文，
 * 讓中文版仍是唯一真相來源、不必兩邊同步。
 *
 * 在 render 時呼叫（LiuYaoPanel 有 useI18n 訂閱語言變更），
 * 切語言時斷語會跟著重算。
 */
export function localizeProse(
  key: string,
  fallback: string,
  params?: TParams,
  lang?: Lang,
): string {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return fallback;

  const text = divinationProse[key]?.[l];
  if (!text) return fallback;
  if (!params) return text;

  // 與 i18n 的 interpolate 同語法（{name}）。不共用是因為那邊吃的是
  // translations 表，這邊的來源不同——共用會讓兩張表的查找路徑糾纏在一起。
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}
