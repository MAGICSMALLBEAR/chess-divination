// 錯誤邊界元件 — 捕獲渲染錯誤並顯示友好訊息
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

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
            <Text style={styles.icon}>⚠️</Text>
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
    flex: 1, backgroundColor: '#0D0A08',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { alignItems: 'center', padding: 32 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 20, fontWeight: '700', color: '#F5EDE0',
    marginBottom: 8,
  },
  message: {
    fontSize: 14, color: '#8A7A60', textAlign: 'center',
    marginBottom: 24, lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#C9A96E', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: 16, fontWeight: '600', color: '#1A1210' },
});
