// 取得合併後的問事類別清單（內建 + 自訂）
import { useState, useEffect, useMemo } from 'react';
import type { IconName } from '@/components/icons/Icon';
import type { CustomCategory } from '@/services/storage';
import { getSettings } from '@/services/storage';
import { categoryLabel } from '@/services/i18n';
import { useI18n } from './useI18n';

export interface QuestionCategory {
  key: string;
  label: string;
  icon: IconName;
  isCustom?: boolean;
}

// 只存 key 與圖示。label 在每次 render 時才由 categoryLabel 取得——
// 存成文字會被凍結在模組載入時的語言，之後切語言也不會變。
const BUILT_IN: { key: string; icon: IconName }[] = [
  { key: 'general', icon: 'crystal-ball' },
  { key: 'marriage', icon: 'love' },
  { key: 'career', icon: 'career' },
  { key: 'wealth', icon: 'wealth' },
  { key: 'health', icon: 'health' },
  { key: 'study', icon: 'study' },
  { key: 'travel', icon: 'travel' },
];

export function useQuestionCategories(): QuestionCategory[] {
  const [custom, setCustom] = useState<CustomCategory[]>([]);
  // 訂閱語言變更，順便取得 lang 作為 useMemo 的依賴
  const { lang } = useI18n();

  useEffect(() => {
    getSettings().then(s => setCustom(s.customCategories || []));
  }, []);

  return useMemo(() => {
    const merged: QuestionCategory[] = BUILT_IN.map(c => ({
      key: c.key,
      label: categoryLabel(c.key),
      icon: c.icon,
    }));
    for (const c of custom) {
      merged.push({
        key: c.key,
        // 自訂類別的名字是使用者自己取的，沒有譯文可言
        label: c.label,
        icon: c.icon as IconName,
        isCustom: true,
      });
    }
    return merged;
  }, [custom, lang]);
}
