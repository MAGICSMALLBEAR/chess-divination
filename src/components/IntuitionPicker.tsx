// 占卜前的直覺 — 在看到卦之前，先記下自己覺得這件事如願的機率
//
// 放在三個模式的問題步驟（抽棋、棋盤、靈棋），因為這是唯一還沒看到卦的時間點；
// 看過卦再填，量到的就是被卦影響過的直覺（理由見 services/calibration.ts）。
//
// 選填、預設不選、再點一次同一檔即取消：絕大多數人只是想占一卦，這一列不能成為門檻。
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { INTUITION_CHOICES, type IntuitionPct } from '@/services/calibration';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  value?: IntuitionPct;
  onChange: (value: IntuitionPct | undefined) => void;
  /** 與問題輸入框同寬，三頁的欄寬各自決定 */
  width?: number;
}

export default function IntuitionPicker({ value, onChange, width }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();

  return (
    <View testID="intuition-picker" style={[styles.box, width !== undefined && { width }]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{t('intuition.title')}</Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>{t('intuition.hint')}</Text>
      <View style={styles.row}>
        {INTUITION_CHOICES.map(pct => {
          const active = value === pct;
          return (
            <TouchableOpacity
              key={pct}
              testID={`intuition-${pct}`}
              accessibilityRole="button"
              // aria-selected 而非 accessibilityState：後者在 react-native-web 不輸出
              // aria-selected（S74 記下的缺口），讀屏在網頁上分不出選了哪一檔
              aria-selected={active}
              style={[
                styles.chip,
                { borderColor: active ? theme.gold : theme.bgMedium },
                active && { backgroundColor: theme.goldSoft },
              ]}
              onPress={() => onChange(active ? undefined : pct)}
            >
              <Text style={[styles.chipText, { color: active ? theme.textGold : theme.textMuted }]}>
                {pct}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (_t: ThemeColors) => StyleSheet.create({
  box: { marginBottom: Spacing.md },
  title: { fontSize: FontSize.small, fontWeight: '600' },
  hint: { fontSize: FontSize.caption, lineHeight: 18, marginTop: 2, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.xs },
  chip: {
    flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontSize: FontSize.small, fontWeight: '600' },
});
