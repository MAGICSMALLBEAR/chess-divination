// 取得合併後的問事類別清單（內建 + 自訂）
import { useState, useEffect, useMemo } from 'react';
import type { IconName } from '@/components/icons/Icon';
import type { CustomCategory } from '@/services/storage';
import { getSettings } from '@/services/storage';

export interface QuestionCategory {
  key: string;
  label: string;
  icon: IconName;
  isCustom?: boolean;
}

const BUILT_IN: QuestionCategory[] = [
  { key: 'general', label: '綜合', icon: 'crystal-ball' },
  { key: 'marriage', label: '感情', icon: 'love' },
  { key: 'career', label: '事業', icon: 'career' },
  { key: 'wealth', label: '財運', icon: 'wealth' },
  { key: 'health', label: '健康', icon: 'health' },
  { key: 'study', label: '學業', icon: 'study' },
  { key: 'travel', label: '出行', icon: 'travel' },
];

export function useQuestionCategories(): QuestionCategory[] {
  const [custom, setCustom] = useState<CustomCategory[]>([]);

  useEffect(() => {
    getSettings().then(s => setCustom(s.customCategories || []));
  }, []);

  return useMemo(() => {
    const merged: QuestionCategory[] = [...BUILT_IN];
    for (const c of custom) {
      merged.push({
        key: c.key,
        label: c.label,
        icon: c.icon as IconName,
        isCustom: true,
      });
    }
    return merged;
  }, [custom]);
}
