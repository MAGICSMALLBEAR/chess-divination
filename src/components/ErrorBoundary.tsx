// 錯誤邊界元件 — 捕獲渲染錯誤並顯示友好訊息
//
// 使用固定的後備色盤而非主題：本元件是 class component 無法用 hook，
// 且可能在 ThemeProvider 本身出錯時才被觸發，此時不能依賴主題 context。
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
// router 是模組層級的 singleton，不經 React context——
// 這正是這裡需要的：邊界被觸發時，壞掉的往往就是 context 樹本身
import { router } from 'expo-router';
import { Icon } from '@/components/icons';
// 直接取 t 而非 useI18n：class component 不能用 hook。
// i18n 是模組層級的 singleton，不經 React context，故即使
// context 樹已經壞掉這裡仍取得到譯文。代價是切換語言不會即時
// 重繪這個畫面——錯誤畫面不需要。
import { t } from '@/services/i18n';
import { FallbackPalette, Spacing, FontSize } from '@/constants/theme';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  /**
   * 逃生出口：回到設定頁。
   *
   * 這個邊界包住整個 Stack（含導覽），所以畫面一旦是「必然重現」的錯誤，
   * 「重試」只會再炸一次，使用者沒有任何路徑回到設定頁去還原備份或
   * 匯出資料——資料還在，只是拿不到。先導頁再清狀態：順序反過來的話，
   * 會先重繪那個必炸的畫面，導頁還沒發生就又被邊界接住。
   */
  handleGoSettings = () => {
    try {
      router.replace('/(tabs)/settings');
    } catch (e) {
      console.warn('錯誤畫面導頁失敗:', e);
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Icon name="warning" size={56} color={FallbackPalette.gold} />
            <Text style={styles.title}>{t('error.title')}</Text>
            <Text style={styles.message}>
              {this.state.error?.message || t('error.unknown')}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={this.handleRetry}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>{t('error.reload')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.escapeBtn}
              onPress={this.handleGoSettings}
              accessibilityRole="button"
            >
              <Text style={styles.escapeText}>{t('error.goSettings')}</Text>
            </TouchableOpacity>
            <Text style={styles.escapeHint}>{t('error.escapeHint')}</Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: FallbackPalette.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { alignItems: 'center', padding: Spacing.xl },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.heading, fontWeight: '700', color: FallbackPalette.text,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.small, color: FallbackPalette.textMuted, textAlign: 'center',
    marginBottom: Spacing.lg, lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: FallbackPalette.gold,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: FontSize.body, fontWeight: '600', color: FallbackPalette.card },
  escapeBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: FallbackPalette.border,
  },
  escapeText: { fontSize: FontSize.small, color: FallbackPalette.gold },
  escapeHint: {
    fontSize: FontSize.caption, lineHeight: 18,
    color: FallbackPalette.textMuted,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
