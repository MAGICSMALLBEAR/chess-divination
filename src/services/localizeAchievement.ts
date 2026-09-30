import { getLang, type Lang } from './i18n';
import type { Achievement } from '@/services/achievements';
import { achievementTranslations } from '@/data/translations/achievements';

export function localizeAchievement(achievement: Achievement, lang?: Lang): Achievement {
  const l = lang ?? getLang();
  if (l === 'zh-TW') return achievement;
  const locales = achievementTranslations[achievement.id]?.[l];
  if (!locales) return achievement;
  return { ...achievement, title: locales.title ?? achievement.title, desc: locales.desc ?? achievement.desc };
}
