// 設定頁面
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch,
} from 'react-native';
import InkBackground from '@/components/InkBackground';
import type { AppSettings } from '@/services/storage';
import { getSettings, saveSettings } from '@/services/storage';
import { Spacing, FontSize } from '@/constants/theme';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await getSettings();
    setSettings(s);
  }

  async function update(key: keyof AppSettings, value: any) {
    const updated = await saveSettings({ [key]: value });
    setSettings(updated);
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.safe}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={styles.title}>設定</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 用戶名稱 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>個人資訊</Text>
          <View style={styles.row}>
            <Text style={styles.label}>用戶名稱</Text>
            <Text style={styles.value}>{settings.userName || '未設定'}</Text>
          </View>
        </View>

        {/* 動畫設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>動畫設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>動畫速度</Text>
            <View style={styles.options}>
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.option,
                    settings.drawAnimationSpeed === speed && styles.optionActive,
                  ]}
                  onPress={() => update('drawAnimationSpeed', speed)}
                >
                  <Text style={[
                    styles.optionText,
                    settings.drawAnimationSpeed === speed && styles.optionTextActive,
                  ]}>
                    {speed === 'slow' ? '慢速' : speed === 'normal' ? '標準' : '快速'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 主題設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主題設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>主題模式</Text>
            <View style={styles.options}>
              {(['dark', 'light'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.option,
                    settings.themeMode === mode && styles.optionActive,
                  ]}
                  onPress={() => update('themeMode', mode)}
                >
                  <Text style={[
                    styles.optionText,
                    settings.themeMode === mode && styles.optionTextActive,
                  ]}>
                    {mode === 'dark' ? '🌙 墨色' : '☀️ 宣紙'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 其他設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>其他設定</Text>
          <View style={styles.row}>
            <Text style={styles.label}>音效</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => update('soundEnabled', v)}
              trackColor={{ false: '#3A2F25', true: '#C9A96E' }}
              thumbColor={settings.soundEnabled ? '#F5EDE0' : '#8A7A60'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>觸覺回饋</Text>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(v) => update('hapticEnabled', v)}
              trackColor={{ false: '#3A2F25', true: '#C9A96E' }}
              thumbColor={settings.hapticEnabled ? '#F5EDE0' : '#8A7A60'}
            />
          </View>
        </View>

        {/* 預設抽棋數量 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>預設抽棋數量</Text>
          <View style={styles.row}>
            <View style={styles.options}>
              {([1, 2, 3] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.option,
                    settings.pieceCountPreset === n && styles.optionActive,
                  ]}
                  onPress={() => update('pieceCountPreset', n)}
                >
                  <Text style={[
                    styles.optionText,
                    settings.pieceCountPreset === n && styles.optionTextActive,
                  ]}>
                    {n}顆
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 關於 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>關於</Text>
          <View style={styles.row}>
            <Text style={styles.label}>版本</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>技術</Text>
            <Text style={styles.value}>Expo SDK 57 + React Native</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0A08' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.body, color: '#C9B99A' },
  header: {
    alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: '#F5EDE0' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: 40 },
  section: {
    backgroundColor: '#1A1210', borderRadius: 12,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.small, fontWeight: '600', color: '#C9A96E',
    marginBottom: Spacing.sm, letterSpacing: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: '#2A1F18',
  },
  label: { fontSize: FontSize.body, color: '#C9B99A' },
  value: { fontSize: FontSize.body, color: '#8A7A60' },
  options: { flexDirection: 'row', gap: 6 },
  option: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#231A14',
  },
  optionActive: {
    backgroundColor: '#2A1F18', borderWidth: 1, borderColor: '#C9A96E',
  },
  optionText: { fontSize: 13, color: '#8A7A60' },
  optionTextActive: { color: '#C9A96E', fontWeight: '600' },
});
