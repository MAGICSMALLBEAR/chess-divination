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

import { getLang, type Lang } from './i18n';
import type { Poem } from '@/data/poems';
import type { ChessPiece } from '@/data/pieces';
import type { Achievement } from '@/services/achievements';
import { poemTranslations } from '@/data/translations/poems';
import { pieceTranslations } from '@/data/translations/pieces';
import { achievementTranslations } from '@/data/translations/achievements';

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
