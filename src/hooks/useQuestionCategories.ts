// 取得合併後的問事類別清單（內建 + 自訂）
import { useState, useEffect, useMemo } from 'react';
import type { IconName } from '@/components/icons/Icon';
import type { CustomCategory } from '@/services/storage';
import { getSettings } from '@/services/storage';
import { useI18n } from './useI18n';

export interface QuestionCategory {
  key: string;
  label: string;
  icon: IconName;
  isCustom?: boolean;
}

// 只存 key 與圖示。label 在每次 render 時才由 categoryLabel 取得——
// 存成文字會被凍結在模組載入時的語言，之後切語言也不會變。
const BUILT_IN: { key: string; labelKey: string; icon: IconName }[] = [
  { key: 'general', labelKey: 'poem.catGeneral', icon: 'crystal-ball' },
  { key: 'marriage', labelKey: 'poem.catMarriage', icon: 'love' },
  { key: 'career', labelKey: 'poem.catCareer', icon: 'career' },
  { key: 'wealth', labelKey: 'poem.catWealth', icon: 'wealth' },
  { key: 'health', labelKey: 'poem.catHealth', icon: 'health' },
  { key: 'study', labelKey: 'poem.catStudy', icon: 'study' },
  { key: 'travel', labelKey: 'poem.catTravel', icon: 'travel' },
  // 子領域仍歸入既有主類別解讀；用名稱讓使用者直接挑到眼前的情境。
  { key: 'relationship', labelKey: 'poem.catRelationship', icon: 'love' },
  { key: 'reconciliation', labelKey: 'poem.catReconciliation', icon: 'love' },
  { key: 'jobSearch', labelKey: 'poem.catJobSearch', icon: 'career' },
  { key: 'promotion', labelKey: 'poem.catPromotion', icon: 'career' },
  { key: 'workplace', labelKey: 'poem.catWorkplace', icon: 'career' },
  { key: 'business', labelKey: 'poem.catBusiness', icon: 'career' },
  { key: 'cashflow', labelKey: 'poem.catCashflow', icon: 'wealth' },
  { key: 'exam', labelKey: 'poem.catExam', icon: 'study' },
  { key: 'wellbeing', labelKey: 'poem.catWellbeing', icon: 'health' },
  { key: 'relocation', labelKey: 'poem.catRelocation', icon: 'travel' },
];

export function useQuestionCategories(): QuestionCategory[] {
  const [custom, setCustom] = useState<CustomCategory[]>([]);
  // 訂閱語言變更，順便取得 lang 作為 useMemo 的依賴
  const { lang, t } = useI18n();

  useEffect(() => {
    getSettings().then(s => setCustom(s.customCategories || []));
  }, []);

  return useMemo(() => {
    const merged: QuestionCategory[] = BUILT_IN.map(c => ({
      key: c.key,
      label: t(c.labelKey),
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
  }, [custom, lang, t]);
}
