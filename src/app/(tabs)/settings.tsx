// 設定頁面（完整版）
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import type { AppSettings } from '@/services/storage';
import { getSettings, saveSettings } from '@/services/storage';
import { setSoundEnabled } from '@/services/sound';
import { setHapticEnabled } from '@/services/haptics';
import { backupData, restoreData } from '@/services/backup';
import { clearHistory } from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { LANG_OPTIONS, type Lang } from '@/services/i18n';
import { Spacing, FontSize } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t, lang, setLang } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const s = await getSettings();
    setSettings(s);
    setNameText(s.userName);
  }

  async function update(key: keyof AppSettings, value: any) {
    const updated = await saveSettings({ [key]: value });
    setSettings(updated);
  }

  async function handleBackup() {
    const result = await backupData();
    if (result) Alert.alert('備份成功', '資料已匯出');
  }

  async function handleRestore() {
    Alert.alert('還原資料', '將覆蓋現有資料，確定要還原嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '確定', onPress: async () => {
        const ok = await restoreData();
        if (ok) { Alert.alert('還原成功'); loadSettings(); }
        else Alert.alert('還原失敗', '請選擇正確的備份檔案');
      }},
    ]);
  }

  if (!settings) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={{ color: theme.textSecondary }}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>設定</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 用戶名稱 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>個人資訊</Text>
          {editingName ? (
            <View style={styles.row}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: theme.bgInk, borderColor: theme.bgMedium, color: theme.textPrimary }]}
                value={nameText}
                onChangeText={setNameText}
                placeholder="輸入您的名字"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <TouchableOpacity onPress={async () => {
                await update('userName', nameText);
                setEditingName(false);
              }}>
                <Text style={{ color: theme.gold, fontWeight: '600' }}>儲存</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setEditingName(true)}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>用戶名稱</Text>
              <Text style={{ color: theme.textPrimary }}>{settings.userName || '點擊設定'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 主題 & 語言 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>外觀設定</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>主題模式</Text>
            <View style={styles.options}>
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <TouchableOpacity key={mode}
                  style={[styles.option, settings.themeMode === mode && { borderColor: theme.gold }]}
                  onPress={() => update('themeMode', mode)}>
                  <Text style={[styles.optionText, settings.themeMode === mode && { color: theme.gold }]}>
                    {mode === 'dark' ? '🌙 墨色' : mode === 'light' ? '☀️ 宣紙' : '🔄 跟隨系統'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>語言</Text>
            <View style={styles.options}>
              {LANG_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.key}
                  style={[styles.option, lang === opt.key && { borderColor: theme.gold }]}
                  onPress={() => setLang(opt.key)}>
                  <Text style={[styles.optionText, lang === opt.key && { color: theme.gold }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 預設抽棋數量 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>預設抽棋數量</Text>
          <View style={styles.row}>
            <View style={styles.options}>
              {([1, 2, 3] as const).map((n) => (
                <TouchableOpacity key={n}
                  style={[styles.option, settings.pieceCountPreset === n && { borderColor: theme.gold }]}
                  onPress={() => update('pieceCountPreset', n)}>
                  <Text style={[styles.optionText, settings.pieceCountPreset === n && { color: theme.gold }]}>{n}顆</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 音效 & 觸覺 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>體驗設定</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>音效</Text>
            <Switch value={settings.soundEnabled}
              onValueChange={(v) => { update('soundEnabled', v); setSoundEnabled(v); }}
              trackColor={{ false: '#3A2F25', true: '#C9A96E' }} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>觸覺回饋</Text>
            <Switch value={settings.hapticEnabled}
              onValueChange={(v) => { update('hapticEnabled', v); setHapticEnabled(v); }}
              trackColor={{ false: '#3A2F25', true: '#C9A96E' }} />
          </View>
        </View>

        {/* 工具 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>工具</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/library')}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>📜 籤詩圖鑑</Text>
            <Text style={{ color: theme.textMuted }}>瀏覽 64 首籤詩 →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/stats')}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>📊 占卜統計</Text>
            <Text style={{ color: theme.textMuted }}>查看統計數據 →</Text>
          </TouchableOpacity>
        </View>

        {/* 備份 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>資料管理</Text>
          <TouchableOpacity style={styles.row} onPress={handleBackup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>💾 備份資料</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleRestore}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>📥 還原資料</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={async () => {
            await update('hasCompletedOnboarding', false);
            Alert.alert('已重置', '下次開啟App時將重新顯示引導');
          }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>🎓 重新觀看引導</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => {
            Alert.alert('清除所有歷史', '確定要清除所有占卜記錄嗎？此操作無法復原。', [
              { text: '取消', style: 'cancel' },
              { text: '清除', style: 'destructive', onPress: async () => { await clearHistory(); Alert.alert('已清除'); } },
            ]);
          }}>
            <Text style={[styles.label, { color: '#E5746A' }]}>🗑️ 清除所有歷史</Text>
          </TouchableOpacity>
        </View>

        {/* 關於 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>關於</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>版本</Text>
            <Text style={{ color: theme.textPrimary }}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>技術</Text>
            <Text style={{ color: theme.textPrimary }}>Expo SDK 57 + React Native</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: 40 },
  section: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: '#2A1F18',
  },
  label: { fontSize: FontSize.body },
  options: { flexDirection: 'row', gap: 6 },
  option: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
  },
  optionText: { fontSize: 13, color: '#8A7A60' },
  nameInput: {
    flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: FontSize.body, marginRight: Spacing.sm,
  },
});
