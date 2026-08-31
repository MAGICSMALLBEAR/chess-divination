// 靈棋十二子頁面
//
// 與抽棋／棋盤不同，靈棋不是六十四籤詩那一套，因此不共用 reveal 頁：
// 擲卦與卦目解讀都在本頁完成，歷史記錄點回來也回到這裡（見 services/recordLink.ts）。
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import OutcomeMarker from '@/components/OutcomeMarker';
import QuestionPrompts from '@/components/QuestionPrompts';
import { Icon } from '@/components/icons';
import { castLingqi, lingqiOracle, lingqiOracleByKey, type LingqiCast, type LingqiOracle } from '@/services/lingqi';
import {
  addHistory, getHistory, getSettings, saveSettings,
  recordFromLingqi, setOutcome, clearOutcome, setRecordNote,
  type DivinationRecord, type OutcomeStatus,
} from '@/services/storage';
import { cancelVerificationReminder, scheduleVerificationReminder } from '@/services/notifications';
import { notify } from '@/services/dialog';
import { hapticMedium } from '@/services/haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useLayout } from '@/hooks/useLayout';
import { useQuestionCategories } from '@/hooks/useQuestionCategories';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { FontSize, Spacing } from '@/constants/theme';

export default function LingqiScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const categories = useQuestionCategories();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();

  const [cast, setCast] = useState<LingqiCast | null>(null);
  const [oracle, setOracle] = useState<LingqiOracle | null>(null);
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const selectedCategoryLabel = categories.find(c => c.key === selectedCategory)?.label ?? selectedCategory;

  // in-flight 防護：連點會讓 addHistory 的 read-modify-write 互相覆蓋
  // （與 useDrawDivination 同一個理由）
  const savingRef = useRef(false);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      if (settings.questionCategory) setSelectedCategory(settings.questionCategory);
    })();
  }, []);

  // 由歷史記錄開啟：還原那一次的卦目，不重擲也不重存
  useEffect(() => {
    if (!recordId) return;
    (async () => {
      const found = (await getHistory()).find(r => r.id === recordId);
      if (!found?.lingqiKey) return;
      const saved = lingqiOracleByKey(found.lingqiKey);
      if (!saved) return;
      setRecord(found);
      setOracle(saved);
      setCast(null);
      if (found.questionText) setQuestionText(found.questionText);
      if (found.questionCategory) setSelectedCategory(found.questionCategory);
    })();
  }, [recordId]);

  async function handleCategorySelect(key: string) {
    setSelectedCategory(key);
    await saveSettings({ questionCategory: key });
  }

  async function handleCast() {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      hapticMedium();
      const thrown = castLingqi();
      const result = lingqiOracle(thrown);
      setCast(thrown);
      setOracle(result);

      const saved = await addHistory(recordFromLingqi(result, selectedCategory, questionText.trim() || undefined));
      setRecord(saved);
      void scheduleVerificationReminder(saved);
    } catch (e) {
      // 儲存失敗（空間滿／儲存損毀）不能只是靜默——卦已經擲了，
      // 使用者要知道這一次沒有進歷史記錄
      console.warn('靈棋記錄儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveRecordFailed'));
    } finally {
      savingRef.current = false;
    }
  }

  function handleRecast() {
    setCast(null);
    setOracle(null);
    setRecord(null);
  }

  const refreshRecord = useCallback(async (id: string) => {
    setRecord((await getHistory()).find(r => r.id === id) ?? null);
  }, []);

  async function handleSaveOutcome(status: OutcomeStatus, note?: string) {
    if (!record) return;
    try {
      await setOutcome(record.id, status, note);
      await cancelVerificationReminder(record.id);
      await refreshRecord(record.id);
    } catch (e) {
      console.warn('占驗儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  async function handleSaveNote(note: string) {
    if (!record) return;
    try {
      await setRecordNote(record.id, note);
      await refreshRecord(record.id);
    } catch (e) {
      console.warn('筆記儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  async function handleClearOutcome() {
    if (!record) return;
    try {
      await clearOutcome(record.id);
      await refreshRecord(record.id);
    } catch (e) {
      console.warn('占驗清除失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]} testID="lingqi-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('lingqi.title')}</Text>
          <View style={styles.backBtn} />
        </View>

        {!oracle && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>{t('lingqi.subtitle')}</Text>
            <View style={styles.card}>
              <Text style={styles.rule}>{t('lingqi.rule')}</Text>
            </View>

            <Text style={styles.sectionLabel}>{t('draw.question')}</Text>
            <TextInput
              style={[styles.questionInput, { width: contentWidth }]}
              placeholder={t('common.questionPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <QuestionPrompts category={selectedCategory} categoryLabel={selectedCategoryLabel} onSelect={setQuestionText} />

            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === cat.key }}
                  onPress={() => handleCategorySelect(cat.key)}
                >
                  <Icon name={cat.icon} size={16} color={selectedCategory === cat.key ? theme.gold : theme.textMuted} />
                  <Text style={[styles.categoryChipLabel, selectedCategory === cat.key && styles.categoryChipLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.castBtn} testID="lingqi-cast" accessibilityRole="button" onPress={handleCast}>
              <Text style={styles.castText}>{t('lingqi.cast')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {oracle && (
          <View style={styles.content} testID="lingqi-result">
            {/* 卦目、卦名、象、斷、方位都是《靈棋經》原典的漢字資料值，三語不譯 */}
            <View style={styles.oracleHead}>
              <Text style={styles.notation}>{oracle.notation}</Text>
              <Text style={styles.oracleName}>{oracle.name}</Text>
              <Text style={styles.oracleImage}>{oracle.image}</Text>
              {oracle.stance ? (
                <Text style={styles.oracleStance}>{oracle.stance}　{oracle.direction}</Text>
              ) : null}
              {cast ? (
                <Text style={styles.countLine}>
                  {t('lingqi.countLine', { u: cast.upper, m: cast.middle, l: cast.lower })}
                </Text>
              ) : null}
            </View>

            {/* 問題回顯。與 reveal 頁同一個位置與鍵值——占卜結果要能對回當初問的事，
                尤其是從歷史記錄點回來時，光看卦辭想不起來這是問什麼的 */}
            {record?.questionText ? (
              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>{t('reveal.question')}</Text>
                <Text style={styles.questionTextValue}>{record.questionText}</Text>
              </View>
            ) : null}

            <Verse label={t('lingqi.xiang')} lines={oracle.xiang} styles={styles} />
            {oracle.xiangAlt.length > 0 && <Verse label={t('lingqi.xiangAlt')} lines={oracle.xiangAlt} styles={styles} />}
            <Verse label={t('lingqi.shi')} lines={oracle.shi} styles={styles} />
            {oracle.shiAlt.length > 0 && <Verse label={t('lingqi.shiAlt')} lines={oracle.shiAlt} styles={styles} />}

            <Text style={styles.source}>{t('lingqi.source')}</Text>

            {record && (
              <OutcomeMarker
                outcome={record.outcome}
                recordNote={record.note}
                timestamp={record.timestamp}
                onSave={handleSaveOutcome}
                onSaveNote={handleSaveNote}
                onClear={handleClearOutcome}
              />
            )}

            <TouchableOpacity style={styles.recastBtn} testID="lingqi-recast" accessibilityRole="button" onPress={handleRecast}>
              <Icon name="lingqi" size={18} color={theme.gold} />
              <Text style={styles.recastText}> {t('lingqi.recast')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** 象曰／詩曰一段。原文以標點斷句，逐句一行排，讀起來才是韻文而非一團字 */
function Verse({ label, lines, styles }: { label: string; lines: string[]; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.verse}>
      <Text style={styles.verseLabel}>{label}</Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.verseLine}>{line}</Text>
      ))}
    </View>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingVertical: Spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: Spacing.lg },
  backBtn: { minWidth: 64, paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: theme.textSecondary },
  title: { fontSize: FontSize.heading, fontWeight: '800', color: theme.textGold },
  // 只有輸入框夾到 contentWidth，其餘靠左右內距——整欄都夾的話類別膠囊
  // 一行只排得下兩個（抽棋頁是四個），而單元測試看不出這件事
  content: { alignSelf: 'stretch', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  subtitle: { fontSize: FontSize.body, lineHeight: 24, color: theme.textSecondary, textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
  rule: { fontSize: FontSize.small, lineHeight: 22, color: theme.textPrimary },
  sectionLabel: { fontSize: FontSize.body, fontWeight: '700', color: theme.textGold },
  questionInput: {
    minHeight: 88, borderWidth: 1, borderRadius: 12, padding: Spacing.md,
    fontSize: FontSize.body, backgroundColor: theme.bgDark, borderColor: theme.bgMedium, color: theme.textPrimary,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: theme.bgMedium, backgroundColor: theme.bgCard,
  },
  categoryChipActive: { borderColor: theme.gold, backgroundColor: theme.bgMedium },
  categoryChipLabel: { fontSize: FontSize.small, color: theme.textMuted },
  categoryChipLabelActive: { color: theme.textGold, fontWeight: '600' },
  castBtn: { marginTop: Spacing.sm, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.gold },
  castText: { fontSize: FontSize.body, fontWeight: '700', color: theme.textInverse },
  oracleHead: { alignItems: 'center', gap: 6, paddingVertical: Spacing.lg },
  notation: { fontSize: FontSize.body, letterSpacing: 2, color: theme.textMuted },
  oracleName: { fontSize: 34, fontWeight: '800', color: theme.textGold },
  oracleImage: { fontSize: FontSize.heading, color: theme.textPrimary },
  oracleStance: { fontSize: FontSize.small, color: theme.textSecondary },
  countLine: { fontSize: FontSize.caption, color: theme.textMuted, marginTop: Spacing.sm },
  questionBox: { borderWidth: 1, borderRadius: 12, padding: Spacing.md, backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
  questionLabel: { fontSize: FontSize.caption, fontWeight: '600', color: theme.textGold, marginBottom: 4 },
  questionTextValue: { fontSize: FontSize.body, lineHeight: 24, fontStyle: 'italic', color: theme.textSecondary },
  verse: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, gap: 4, backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
  verseLabel: { fontSize: FontSize.small, fontWeight: '700', color: theme.textGold, marginBottom: Spacing.sm },
  verseLine: { fontSize: FontSize.body, lineHeight: 28, color: theme.textPrimary, textAlign: 'center' },
  source: { fontSize: FontSize.caption, lineHeight: 19, color: theme.textMuted, textAlign: 'center' },
  recastBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: theme.gold,
  },
  recastText: { fontSize: FontSize.body, fontWeight: '700', color: theme.textGold },
});
