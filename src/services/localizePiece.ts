import { getLang, type Lang } from './i18n';
import type { ChessPiece } from '@/data/pieces';
import { pieceTranslations } from '@/data/translations/pieces';

export function localizePiece(piece: ChessPiece, lang?: Lang): ChessPiece {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return piece;
  const locales = pieceTranslations[piece.id]?.[l];
  if (!locales) return piece;
  return { ...piece, meaning: locales.meaning ?? piece.meaning, keywords: locales.keywords ?? piece.keywords };
}
