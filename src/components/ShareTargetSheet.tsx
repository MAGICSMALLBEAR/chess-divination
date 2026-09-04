// 分享去處選單
//
// 原生分享選單（Web Share API／RN Share）拿不到時的降級路徑。
// 桌面瀏覽器沒有 navigator.share，所有分享都會走到這裡。
//
// 為什麼是自製 Modal 而不是 `dialog.ts` 的 confirmAction：那一層刻意只用
// 瀏覽器原生 confirm，理由寫在 `dialog.web.ts` 檔頭——刪除／還原／覆蓋
// 這類確認一旦靜默失效就是資料遺失，不能賭在「元件有沒有掛載到」。
// 分享不是那種操作：沒掛上就是沒分享出去，使用者看得見，也沒有東西不見。
// 而原生 confirm 只有兩顆按鈕，塞不下三個去處。
//
// 用 Modal 而非行內覆蓋層：與 CustomCategoriesSection 的編輯框同一套作法，
// 才不會被揭曉頁的 sticky 側欄與墨滴轉場的層級蓋掉。

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import type { ShareTarget } from '@/services/socialShare';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  visible: boolean;
  onSelect: (target: ShareTarget) => void;
  onDismiss: () => void;
}

/**
 * 三個去處。LINE 與 Facebook 是品牌名，三種語言都寫原樣，故直接是字面量
 * 而非翻譯鍵；只有「複製文字」需要翻譯。
 */
const TARGETS: { key: ShareTarget; label: string; labelKey?: string; icon: IconName }[] = [
  { key: 'line', label: 'LINE', icon: 'share' },
  { key: 'facebook', label: 'Facebook', icon: 'share' },
  { key: 'copy', label: '', labelKey: 'share.viaCopy', icon: 'save' },
];

export default function ShareTargetSheet({ visible, onSelect, onDismiss }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();

  return (
    // onRequestClose 是 Android 實體返回鍵的唯一出口；少了它，
    // 這張選單在 Android 上按返回是關不掉的
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        {/* 內層吃掉點擊，否則點在卡片上也會被背景的關閉手勢接走 */}
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.textGold }]}>{t('share.pickTitle')}</Text>

          {TARGETS.map(target => (
            <TouchableOpacity
              key={target.key}
              testID={`share-target-${target.key}`}
              style={[styles.row, { borderColor: theme.bgMedium }]}
              accessibilityRole="button"
              onPress={() => onSelect(target.key)}
            >
              <Icon name={target.icon} size={16} color={theme.gold} />
              <Text style={[styles.rowText, { color: theme.textPrimary }]}>
                {target.labelKey ? t(target.labelKey) : target.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            testID="share-target-cancel"
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    // 44 是可點擊目標的建議下限；這張選單只有三顆按鈕，撐得起來
    minHeight: 44, paddingHorizontal: Spacing.md,
    borderRadius: 10, borderWidth: 1,
    marginBottom: Spacing.sm,
    backgroundColor: t.bgCard,
  },
  rowText: { fontSize: FontSize.body },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FontSize.small },
});
