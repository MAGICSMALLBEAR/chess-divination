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
import type { DivinerGender } from '@/services/useGod';
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

/** 占者性別選項。undefined 為「不指定」——感情問事就不出用神斷語。 */
const GENDER_OPTIONS: { value: DivinerGender | undefined; labelKey: string }[] = [
  { value: 'male', labelKey: 'settings.genderMale' },
  { value: 'female', labelKey: 'settings.genderFemale' },
  { value: undefined, labelKey: 'settings.genderUnset' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, mode, setMode } = useAppTheme();
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

    // 主題與語言是 Provider／模組層的即時狀態，只有掛載時讀過一次儲存。
    // 還原備份與雲端同步會在背後改寫儲存，不在這裡回推，畫面就會停在
    // 舊主題／舊語言直到重開 App——使用者剛還原完卻看不出任何變化。
    if (s.themeMode !== mode) setMode(s.themeMode);
    if (s.lang && s.lang !== lang) setLang(s.lang);
  }

  async function update(key: keyof AppSettings, value: any) {
    const updated = await saveSettings({ [key]: value });
    setSettings(updated);
  }

  async function handleBackup() {
    const result = await backupData();
    if (!result) { Alert.alert(t('settings.backupFail'), t('settings.backupFailDesc')); return; }
    // 三種通道下一步該做的事完全不同：下載已落到硬碟、分享已交給系統
    // 表單、剪貼簿還得使用者自己貼到某處才算數
    const desc = result === 'copied' ? t('settings.backupOkClipboard')
      : result === 'shared' ? t('settings.backupOkShared')
      : t('settings.backupOkDesc');
    Alert.alert(t('settings.backupOk'), desc);
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
        const result = await restoreData();
        // 取消是使用者的正常操作，不跳任何提示——報「還原失敗」
        // 只會讓人以為自己把東西弄壞了
        if (result === 'canceled') return;
        if (result === 'ok') { Alert.alert(t('settings.restoreOk')); loadSettings(); return; }
        Alert.alert(
          t('settings.restoreFail'),
          result === 'invalid' ? t('settings.restoreFailDesc') : t('settings.restoreFailRead'),
        );
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
          {/* 占者性別：只用於感情問事的用神取法，男女相反 */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.gender')}</Text>
            <View style={styles.options}>
              {GENDER_OPTIONS.map(({ value, labelKey }) => (
                <TouchableOpacity key={labelKey}
                  style={[styles.option, settings.divinerGender === value && { borderColor: theme.gold }]}
                  onPress={() => update('divinerGender', value)}
                  accessibilityLabel={t(labelKey)}>
                  <Text style={[styles.optionText, settings.divinerGender === value && { color: theme.gold }]}>
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.note, { color: theme.textMuted }]}>{t('settings.genderNote')}</Text>
        </View>

        {/* 主題 & 語言 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>{t('settings.appearance')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.theme')}</Text>
            <View style={styles.options}>
              {(['dark', 'light', 'system'] as const).map((opt) => (
                <TouchableOpacity key={opt}
                  style={[styles.option, mode === opt && { borderColor: theme.gold }]}
                  // 只寫 settings 不通知 ThemeProvider 的話，按鈕會亮起、
                  // 設定也存了，畫面卻要等重開才變色。setMode 自己會持久化，
                  // 故不再另外寫一次設定，避免兩份真相各寫各的。
                  onPress={() => setMode(opt)}>
                  <View style={styles.optionInner}>
                    <Icon name={opt === 'dark' ? 'moon' : opt === 'light' ? 'sun' : 'refresh'} size={16} color={mode === opt ? theme.gold : theme.textMuted} />
                    <Text style={[styles.optionText, mode === opt && { color: theme.gold }]}>
                      {' '}{t(opt === 'dark' ? 'settings.themeDark' : opt === 'light' ? 'settings.themeLight' : 'settings.themeSystem')}
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
                  onPress={() => {
                    // 語言是模組記憶體狀態，不寫進 settings 的話重開就歸零
                    setLang(opt.key);
                    update('lang', opt.key);
                  }}>
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
          <TouchableOpacity
            style={[styles.row, syncing && { opacity: 0.5 }]}
            onPress={handleCloudSync}
            disabled={syncing}
          >
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
  note: { fontSize: FontSize.caption, lineHeight: 18, color: t.textMuted, paddingTop: Spacing.sm },
  syncKeyEditor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
});
