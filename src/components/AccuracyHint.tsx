// 個人化應驗率提示 — 依這次占卜的問事類別，回顯使用者過去在同一類別
// 已回填的應驗率。
//
// 為什麼放在揭曉頁而不是只留在統計頁：stats.tsx 早就算得出「哪類問事你
// 比較準」，但那個數字只有主動翻開統計頁才看得到，離正在讀的這一支解讀
// 隔了兩三次點擊。這裡不生成新的判斷——只是把 verification.ts 已有的
// `accuracyByCategory` 結果，搬到使用者正在讀解讀文字的當下。
//
// 樣本不足（< MIN_INSIGHT_SAMPLES）時完全不渲染，不是渲染「樣本不足」
// 的提示：統計頁的清單本來就會列出所有分組，淡化標示是合理的；但這裡
// 是單一類別的即時提示，每次占卜都跳出「資料還不夠」只會變成雜訊，
// 且容易被讀成「你在這方面比較差」（S64 已有這個教訓）。

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getHistory } from '@/services/storage';
import { accuracyByCategory, type AccuracyBreakdown } from '@/services/verification';
import { questionCategoryDomain } from '@/services/questionCategories';
import { categoryLabel } from '@/services/i18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  /** 這次占卜的問事類別（子領域或主類別皆可，內部會映回主類別） */
  category?: string;
}

export default function AccuracyHint({ category }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [breakdown, setBreakdown] = useState<AccuracyBreakdown | null>(null);

  useEffect(() => {
    let cancelled = false;
    const domain = questionCategoryDomain(category);
    getHistory().then(records => {
      if (cancelled) return;
      const match = accuracyByCategory(records, categoryLabel).find(b => b.key === domain);
      setBreakdown(match?.enoughSamples ? match : null);
    });
    return () => { cancelled = true; };
  }, [category]);

  if (!breakdown) return null;

  return (
    <View
      style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
      testID="accuracy-hint"
    >
      <Icon name="chart" size={14} color={theme.textGold} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        {t('reveal.accuracyHint', {
          label: breakdown.label,
          n: breakdown.stats.verified,
          rate: breakdown.stats.rate ?? 0,
        })}
      </Text>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '100%',
    borderRadius: 10, borderWidth: 1,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  text: { fontSize: FontSize.caption, flex: 1, lineHeight: 18 },
});
