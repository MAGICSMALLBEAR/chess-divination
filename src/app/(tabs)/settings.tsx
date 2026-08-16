// 設定頁面（完整版）
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import type { AppSettings } from '@/services/storage';
import { getSettings, saveSettings } from '@/services/storage';
import { setSoundEnabled } from '@/services/sound';
import { setHapticEnabled } from '@/services/haptics';
import { backupData, restoreData } from '@/services/backup';
import { clearHistory } from '@/services/storage';
import CustomCategoriesSection from '@/components/CustomCategoriesSection';
import { scheduleDailyReminder, cancelDailyReminder, isReminderScheduled, requestNotificationPermission } from '@/services/notifications';
import { getSyncKey, saveSyncKey, syncWithCloud } from '@/services/cloudSync';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { LANG_OPTIONS, type Lang } from '@/services/i18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t, lang, setLang } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState('');
  const [reminderOn, setReminderOn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingSyncKey, setEditingSyncKey] = useState(false);
  const [syncKeyText, setSyncKeyText] = useState('');

  useEffect(() => { loadSettings(); checkReminder(); }, []);

  async function loadSettings() {
    const [s, syncKey] = await Promise.all([getSettings(), getSyncKey()]);
    setSettings(s);
    setNameText(s.userName);
    setSyncKeyText(syncKey || '');
  }

  async function update(key: keyof AppSettings, value: any) {
    const updated = await saveSettings({ [key]: value });
    setSettings(updated);
  }

  async function handleBackup() {
    const result = await backupData();
    if (result) Alert.alert(t('settings.backupOk'), t('settings.backupOkDesc'));
  }

  async function checkReminder() {
    const on = await isReminderScheduled();
    setReminderOn(on);
  }

  async function toggleReminder(on: boolean) {
    setReminderOn(on);
    if (on) {
      const ok = await scheduleDailyReminder();
      if (!ok) {
        setReminderOn(false);
        Alert.alert(t('settings.notifyDenied'), t('settings.notifyDeniedDesc'));
      }
    } else {
      await cancelDailyReminder();
    }
  }

  async function handleRestore() {
    Alert.alert(t('settings.restore'), t('settings.restoreConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: async () => {
        const ok = await restoreData();
        if (ok) { Alert.alert(t('settings.restoreOk')); loadSettings(); }
        else Alert.alert(t('settings.restoreFail'), t('settings.restoreFailDesc'));
      }},
    ]);
  }

  async function handleCloudSync() {
    setSyncing(true);
    const result = await syncWithCloud();
    if (result === 'ok') {
      await loadSettings();
      Alert.alert(t('settings.cloudSync'), t('settings.syncOk'));
    } else {
      Alert.alert(t('settings.cloudSync'), t('settings.syncUnset'));
    }
    setSyncing(false);
  }

  if (!settings) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 用戶名稱 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.personal')}</Text>
          {editingName ? (
            <View style={styles.row}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: theme.bgInk, borderColor: theme.bgMedium, color: theme.textPrimary }]}
                value={nameText}
                onChangeText={setNameText}
                placeholder={t('settings.namePlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <TouchableOpacity onPress={async () => {
                await update('userName', nameText);
                setEditingName(false);
              }}>
                <Text style={{ color: theme.gold, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setEditingName(true)}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.userName')}</Text>
              <Text style={{ color: theme.textPrimary }}>{settings.userName || t('settings.nameUnset')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 主題 & 語言 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.appearance')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.theme')}</Text>
            <View style={styles.options}>
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <TouchableOpacity key={mode}
                  style={[styles.option, settings.themeMode === mode && { borderColor: theme.gold }]}
                  onPress={() => update('themeMode', mode)}>
                  <View style={styles.optionInner}>
                    <Icon name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'refresh'} size={16} color={settings.themeMode === mode ? theme.gold : theme.textMuted} />
                    <Text style={[styles.optionText, settings.themeMode === mode && { color: theme.gold }]}>
                      {' '}{t(mode === 'dark' ? 'settings.themeDark' : mode === 'light' ? 'settings.themeLight' : 'settings.themeSystem')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.lang')}</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.preset')}</Text>
          <View style={styles.row}>
            <View style={styles.options}>
              {([1, 2, 3] as const).map((n) => (
                <TouchableOpacity key={n}
                  style={[styles.option, settings.pieceCountPreset === n && { borderColor: theme.gold }]}
                  onPress={() => update('pieceCountPreset', n)}>
                  <Text style={[styles.optionText, settings.pieceCountPreset === n && { color: theme.gold }]}>{t('settings.pieces', { n })}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 音效 & 觸覺 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.experience')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.sound')}</Text>
            <Switch value={settings.soundEnabled}
              onValueChange={(v) => { update('soundEnabled', v); setSoundEnabled(v); }}
              trackColor={{ false: theme.bgMedium, true: theme.gold }} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.haptic')}</Text>
            <Switch value={settings.hapticEnabled}
              onValueChange={(v) => { update('hapticEnabled', v); setHapticEnabled(v); }}
              trackColor={{ false: theme.bgMedium, true: theme.gold }} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.dailyReminder')}</Text>
            <Switch value={reminderOn}
              onValueChange={toggleReminder}
              trackColor={{ false: theme.bgMedium, true: theme.gold }} />
          </View>
        </View>

        {/* 自訂問事類別 */}
        <CustomCategoriesSection onChanged={loadSettings} />

        {/* 工具 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.tools')}</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/library')}>
            <View style={styles.optionInner}>
              <Icon name="scroll" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.library')}</Text>
            </View>
            <Text style={{ color: theme.textMuted }}>{t('settings.libraryDesc')} →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/stats')}>
            <View style={styles.optionInner}>
              <Icon name="chart" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.stats')}</Text>
            </View>
            <Text style={{ color: theme.textMuted }}>{t('settings.statsDesc')} →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/achievements')}>
            <View style={styles.optionInner}>
              <Icon name="trophy" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.achievements')}</Text>
            </View>
            <Text style={{ color: theme.textMuted }}>{t('settings.achievementsDesc')} →</Text>
          </TouchableOpacity>
        </View>

        {/* 備份 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.data')}</Text>
          <TouchableOpacity style={styles.row} onPress={handleBackup}>
            <View style={styles.optionInner}>
              <Icon name="save" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.backup')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleCloudSync}>
            <View style={styles.optionInner}>
              <Icon name="refresh" size={16} color={syncing ? theme.gold : theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {' '}{syncing ? t('settings.syncing') : t('settings.cloudSync')}
              </Text>
            </View>
          </TouchableOpacity>
          {editingSyncKey ? (
            <View style={styles.syncKeyEditor}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: theme.bgInk, borderColor: theme.bgMedium, color: theme.textPrimary }]}
                value={syncKeyText}
                onChangeText={setSyncKeyText}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={48}
              />
              <TouchableOpacity onPress={async () => {
                if (await saveSyncKey(syncKeyText)) setEditingSyncKey(false);
                else Alert.alert(t('settings.cloudSync'), t('settings.syncKeyInvalid'));
              }}><Text style={{ color: theme.gold, fontWeight: '600' }}>{t('common.save')}</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setEditingSyncKey(true)}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.syncKey')}</Text>
              <Text style={{ color: theme.textMuted }}>{syncKeyText ? '••••••••••••' : '—'}</Text>
            </TouchableOpacity>
          )}
          {editingSyncKey && <Text style={{ color: theme.textMuted, fontSize: FontSize.small }}>{t('settings.syncKeyHint')}</Text>}
          <TouchableOpacity style={styles.row} onPress={handleRestore}>
            <View style={styles.optionInner}>
              <Icon name="download" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.restore')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={async () => {
            await update('hasCompletedOnboarding', false);
            Alert.alert(t('settings.onboardingReset'), t('settings.onboardingResetDesc'));
          }}>
            <View style={styles.optionInner}>
              <Icon name="graduation" size={16} color={theme.textSecondary} />
              <Text style={[styles.label, { color: theme.textSecondary }]}> {t('settings.replayOnboarding')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => {
            Alert.alert(t('settings.clearHistory'), t('settings.clearConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.clear'), style: 'destructive', onPress: async () => { await clearHistory(); Alert.alert(t('settings.cleared')); } },
            ]);
          }}>
            <View style={styles.optionInner}>
              <Icon name="trash" size={16} color={theme.textRed} />
              <Text style={[styles.label, { color: theme.textRed }]}> {t('settings.clearHistory')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 關於 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.about')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.version')}</Text>
            <Text style={{ color: theme.textPrimary }}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.tech')}</Text>
            <Text style={{ color: theme.textPrimary }}>Expo SDK 57 + React Native</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
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
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: t.bgMedium,
  },
  label: { fontSize: FontSize.body },
  options: { flexDirection: 'row', gap: 6 },
  option: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  optionInner: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 13, color: t.textMuted },
  nameInput: {
    flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: FontSize.body, marginRight: Spacing.sm,
  },
  syncKeyEditor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
});
