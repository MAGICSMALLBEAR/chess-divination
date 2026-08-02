// 錯誤邊界元件 — 捕獲渲染錯誤並顯示友好訊息
//
// 使用固定的後備色盤而非主題：本元件是 class component 無法用 hook，
// 且可能在 ThemeProvider 本身出錯時才被觸發，此時不能依賴主題 context。
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Icon } from '@/components/icons';
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

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Icon name="warning" size={56} color={FallbackPalette.gold} />
            <Text style={styles.title}>發生了一些問題</Text>
            <Text style={styles.message}>
              {this.state.error?.message || '未知錯誤'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
              <Text style={styles.retryText}>重新載入</Text>
            </TouchableOpacity>
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
});
