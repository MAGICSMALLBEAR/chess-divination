// 匯出報告前的確認框：問「要不要把問題與筆記一起收進去」。
//
// 與 ShareTargetSheet 同一套 Modal 樣式，但這裡問的是隱私選項而非去處。
// 預設收（true）——報告是給自己保存的，這兩欄位往往是最有參考價值的部分；
// 使用者要分享給別人看時可以自己關掉，見 report.ts 檔頭。

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** 這次要匯出幾筆；單筆匯出時不顯示筆數 */
  count?: number;
  onConfirm: (includePersonalText: boolean) => void;
  onDismiss: () => void;
}

export default function ReportExportSheet({ visible, count, onConfirm, onDismiss }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [includePersonal, setIncludePersonal] = useState(true);

  // 與 settings.tsx 同一個理由：react-native-web 的 Switch 開啟態讀
  // activeThumbColor，只給 thumbColor 會在 web 上留下內建的青綠滑塊。
  const switchThumb = {
    thumbColor: theme.bgRice,
    activeThumbColor: theme.bgRice,
  } as unknown as { thumbColor: string };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.textGold }]}>
            {count ? t('report.exportTitleBatch', { n: count }) : t('report.exportTitle')}
          </Text>

          <View style={[styles.toggleRow, { borderColor: theme.bgMedium }]}>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{t('report.includePersonal')}</Text>
              <Text style={[styles.toggleHint, { color: theme.textMuted }]}>{t('report.includePersonalHint')}</Text>
            </View>
            <Switch value={includePersonal} onValueChange={setIncludePersonal}
              trackColor={{ false: theme.bgMedium, true: theme.gold }} {...switchThumb} />
          </View>

          <TouchableOpacity
            testID="report-export-confirm"
            style={[styles.confirmBtn, { backgroundColor: theme.gold }]}
            accessibilityRole="button"
            onPress={() => onConfirm(includePersonal)}
          >
            <Text style={styles.confirmText}>{t('report.export')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="report-export-cancel"
            style={styles.cancel}
            accessibilityRole="button"
            onPress={onDismiss}
          >
            <Text style={[styles.cancelText, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: t.scrim,
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 360,
    borderRadius: 16, borderWidth: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSize.subtitle, fontWeight: '700',
    marginBottom: Spacing.md, textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.sm, borderWidth: 1, borderRadius: 10,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: FontSize.small, fontWeight: '600' },
  toggleHint: { fontSize: FontSize.overline, marginTop: 2, lineHeight: 16 },
  confirmBtn: {
    minHeight: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  confirmText: { fontSize: FontSize.body, fontWeight: '700', color: t.textInverse },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FontSize.small },
});
