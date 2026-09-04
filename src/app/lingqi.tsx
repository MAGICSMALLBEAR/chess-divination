// 靈棋十二子頁面
//
// 與抽棋／棋盤不同，靈棋不是六十四籤詩那一套，因此不共用 reveal 頁：
// 擲卦與卦目解讀都在本頁完成，歷史記錄點回來也回到這裡（見 services/recordLink.ts）。
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import OutcomeMarker from '@/components/OutcomeMarker';
import ShareCardView, { type ShareCardHandle } from '@/components/ShareCardView';
import QuestionPrompts from '@/components/QuestionPrompts';
import { Icon } from '@/components/icons';
import { castLingqi, lingqiOracle, lingqiOracleByKey, type LingqiCast, type LingqiOracle } from '@/services/lingqi';
import { buildLingqiInterpretation } from '@/services/lingqiInterpretation';
import {
  addHistory, getHistory, getSettings, saveSettings, toggleFavorite,
  recordFromLingqi, setOutcome, clearOutcome, setRecordNote,
  type DivinationRecord, type OutcomeStatus,
} from '@/services/storage';
import { cancelVerificationReminder, scheduleVerificationReminder } from '@/services/notifications';
import { recordUsage, syncAchievements } from '@/services/achievements';
import { notify } from '@/services/dialog';
import { formatLingqiShareText, shareNative, shareToTarget, type ShareTarget } from '@/services/socialShare';
import ShareTargetSheet from '@/components/ShareTargetSheet';
import { hapticMedium, hapticSuccess } from '@/services/haptics';
import { playFavoriteSound, playShakeSound } from '@/services/sound';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useLayout } from '@/hooks/useLayout';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { FontSize, Spacing } from '@/constants/theme';

export default function LingqiScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();

  const [cast, setCast] = useState<LingqiCast | null>(null);
  const [oracle, setOracle] = useState<LingqiOracle | null>(null);
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [isFav, setIsFav] = useState(false);
  const shareRef = useRef<ShareCardHandle>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  /** 待分享的文字。非 null 時分享去處選單就是開著的（同 reveal.tsx） */
  const [pendingShareText, setPendingShareText] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');

  // 規則式深度解讀。在 render 時取語言（localizeProse 讀 getLang），
  // 本頁有 useI18n 訂閱，切語言會重算。分類取記錄上存的那份——
  // 歷史記錄還原時 record 與 oracle 同批 setState，不會先閃一下 general 的鏡頭。
  const lingqiReading = oracle
    ? buildLingqiInterpretation({ oracle, questionCategory: record?.questionCategory ?? selectedCategory })
    : null;

  // in-flight 防護：連點會讓 addHistory 的 read-modify-write 互相覆蓋
  // （與 useDrawDivination 同一個理由）
  const savingRef = useRef(false);

  /**
   * 記一次使用日並重算成就。
   *
   * 抽棋與棋盤都會走到 reveal 頁，這兩件事就掛在那一頁的 mount 上；
   * 靈棋自成一頁，於是只擲靈棋的使用者從來沒有一天被記進 usageDates——
   * 首頁的「連續 N 天」與「七日問道」永遠是 0，Session 47 為靈棋補的
   * 成就也要等使用者自己翻開成就頁才補算得到。
   *
   * 與 reveal.tsx 同樣的時機：看到卦目就算一次使用（擲出來的、或從
   * 歷史記錄點回來的都算），單純打開本頁還沒擲則不算。
   */
  function markUsage() {
    recordUsage().catch(e => console.warn('使用日記錄失敗:', e));
    syncAchievements().catch(e => console.warn(t('achievement.checkFailed'), e));
  }

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
      setIsFav(found.isFavorited);
      setOracle(saved);
      setCast(null);
      if (found.questionText) setQuestionText(found.questionText);
      if (found.questionCategory) setSelectedCategory(found.questionCategory);
      markUsage();
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
      // 三種模式裡只有靈棋一聲不響：抽棋落子有 drawPiece、棋盤有 placePiece、
      // 揭曉頁有 reveal，設定頁的音效開關對只擲靈棋的人等於沒有作用。
      // shake（搖籤筒）本來就是為「搖了再擲」寫的音色，自六個音效寫成起無人呼叫。
      hapticMedium();
      playShakeSound();
      const thrown = castLingqi();
      const result = lingqiOracle(thrown);
      setCast(thrown);
      setOracle(result);

      const saved = await addHistory(recordFromLingqi(result, selectedCategory, questionText.trim() || undefined));
      setRecord(saved);
      setIsFav(saved.isFavorited);
      void scheduleVerificationReminder(saved);
      markUsage();
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
    setIsFav(false);
  }

  async function handleToggleFavorite() {
    if (!record) return;
    try {
      const result = await toggleFavorite(record);
      setIsFav(result);
      playFavoriteSound();
      hapticSuccess();
      await refreshRecord(record.id);
    } catch (e) {
      // 失敗時不動 isFav：讓畫面維持真實狀態，否則星星亮著但資料沒存，
      // 重進頁面又變回去（與 reveal.tsx 同一個理由）
      console.warn('收藏狀態儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveFavoriteFailed'));
    }
  }

  async function handleShare() {
    if (!oracle) return;
    // 先試圖片卡（原生走 view-shot 擷取離屏的 ShareCardView）。
    // 回傳 false 代表擷取或系統分享不可用（Web 端即是），改走文字分享。
    if (await shareRef.current?.share()) return;

    const text = formatLingqiShareText({
      notation: oracle.notation,
      name: oracle.name,
      image: oracle.image,
      cast: cast ?? undefined,
      xiang: oracle.xiang,
      shi: oracle.shi,
      question: record?.questionText,
    });

    // 只有「沒有分享功能」才降級，取消不算（與 reveal.tsx 同一套）
    if (await shareNative({ title: t('reveal.shareTitle'), text }) !== 'unavailable') return;

    // 降級：讓使用者自己挑去處（與 reveal.tsx 同一套，見那裡的說明）
    setPendingShareText(text);
  }

  /** 使用者在分享選單挑了去處。複製成功與否都要說一聲，否則按了像是沒反應 */
  async function handleShareTarget(target: ShareTarget) {
    const text = pendingShareText;
    setPendingShareText(null);
    if (!text) return;
    const messageKey = await shareToTarget(target, { title: t('reveal.shareTitle'), text });
    if (messageKey) notify(t(messageKey));
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
            <QuestionPrompts
              category={selectedCategory}
              onCategoryChange={handleCategorySelect}
              onSelect={setQuestionText}
            />

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

            {/* 規則式深度解讀。放在原典出處之後——先讀原文，再讀我們的導讀。
                與 reveal.tsx 的「規則式深度解讀」同一標題鍵與同一誠實邊界：
                只說三才結構與閱讀方向，不編造卦辭沒有的話。 */}
            {lingqiReading && (
              <View style={styles.deepBox} testID="lingqi-deep">
                <Text style={styles.deepTitle}>▎{t('reveal.deepTitle')}</Text>
                <Text style={styles.deepText}>{lingqiReading.interpretation}</Text>
                <View style={styles.deepActions}>
                  <Text style={styles.deepActionTitle}>{t('reveal.deepActions')}</Text>
                  {lingqiReading.actionPlan.map((step, i) => (
                    <Text key={i} style={styles.deepActionItem}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                </View>
              </View>
            )}

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

            {/* 收藏與分享。與 PoemCard 底部同一組動作，靈棋沒有 PoemCard，
                故在此自行排一列 */}
            {record && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.favBtn}
                  testID="lingqi-favorite"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFav }}
                  accessibilityLabel={t(isFav ? 'common.unfavorite' : 'common.favorite')}
                  onPress={handleToggleFavorite}
                >
                  <Icon name={isFav ? 'heart-filled' : 'heart'} size={16} color={isFav ? theme.textRed : theme.textSecondary} />
                  <Text style={styles.favBtnText}> {t(isFav ? 'common.unfavorite' : 'common.favorite')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareBtn}
                  testID="lingqi-share"
                  accessibilityRole="button"
                  accessibilityLabel={t('common.share')}
                  onPress={handleShare}
                >
                  <Icon name="share" size={16} color={theme.textInverse} />
                  <Text style={styles.shareBtnText}> {t('common.share')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.recastBtn} testID="lingqi-recast" accessibilityRole="button" onPress={handleRecast}>
              <Icon name="lingqi" size={18} color={theme.gold} />
              <Text style={styles.recastText}> {t('lingqi.recast')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 隱藏的分享卡片。隱藏手法與理由同 reveal.tsx：只靠離屏定位，
          刻意不加 opacity: 0（view-shot 的 iOS 端會截出空白 PNG），
          改以 aria-hidden 把整張卡擋在無障礙樹外，免得報讀器再念一遍卦辭。 */}
      {oracle && record && (
        <View style={styles.shareHidden} aria-hidden>
          <ShareCardView
            ref={shareRef}
            poemTitle={oracle.name}
            poemContent={oracle.shi.join('\n')}
            // 靈棋沒有吉凶等級——傳空字串，分享卡會整枚略過那格標籤
            poemLevel=""
            poemHexagram={`${oracle.notation}　${oracle.image}`}
            pieceChars={[]}
            pieceColors={[]}
            mode={record.mode}
            timestamp={record.timestamp}
          />
        </View>
      )}

      <ShareTargetSheet
        visible={pendingShareText !== null}
        onSelect={handleShareTarget}
        onDismiss={() => setPendingShareText(null)}
      />
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
  deepBox: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, gap: Spacing.sm, backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
  deepTitle: { fontSize: FontSize.small, fontWeight: '700', color: theme.textGold },
  deepText: { fontSize: FontSize.body, lineHeight: 26, color: theme.textSecondary },
  deepActions: { marginTop: Spacing.sm },
  deepActionTitle: { fontSize: FontSize.small, fontWeight: '600', color: theme.textGold, marginBottom: Spacing.sm },
  deepActionItem: { fontSize: FontSize.body, lineHeight: 26, color: theme.textSecondary, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  favBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: theme.bgMedium, backgroundColor: theme.bgCard,
  },
  favBtnText: { fontSize: FontSize.small, fontWeight: '600', color: theme.textSecondary },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 12, backgroundColor: theme.gold,
  },
  shareBtnText: { fontSize: FontSize.small, fontWeight: '700', color: theme.textInverse },
  shareHidden: { position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none' },
  recastBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: theme.gold,
  },
  recastText: { fontSize: FontSize.body, fontWeight: '700', color: theme.textGold },
});
