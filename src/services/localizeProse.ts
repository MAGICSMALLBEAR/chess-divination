import { getLang, type Lang, type TParams } from './i18n';
import { divinationProse } from '@/data/translations/divination';

export function localizeProse(key: string, fallback: string, params?: TParams, lang?: Lang): string {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return fallback;
  const text = divinationProse[key]?.[l];
  if (!text) return fallback;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}
