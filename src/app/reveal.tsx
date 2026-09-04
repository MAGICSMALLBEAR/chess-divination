// 籤詩展示頁面 — 完整解讀
// 包含墨滴擴散轉場與棋子飛入動畫（Phase 5.3）
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import InkSplashOverlay from '@/components/InkSplashOverlay';
import PieceEntryFlyIn from '@/components/PieceEntryFlyIn';
import ShareCardView, { type ShareCardHandle } from '@/components/ShareCardView';
import PoemCard from '@/components/PoemCard';
import LiuYaoPanel from '@/components/LiuYaoPanel';
import OutcomeMarker from '@/components/OutcomeMarker';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/icons';
import { buildLiuYaoReading } from '@/services/liuyao';
import { trigramsFromIndex } from '@/services/hexagram';
import type { DivinationRecord, OutcomeStatus } from '@/services/storage';
import {
  getHistory, toggleFavorite, isLegacyRecord, usesLegacyMovingLine, setOutcome, clearOutcome, setRecordNote, getSettings,
} from '@/services/storage';
import type { DivinerGender } from '@/services/useGod';
import { getPoemById } from '@/data/poems';
import { playRevealSound, playFavoriteSound } from '@/services/sound';
import { hapticSuccess } from '@/services/haptics';
import { cancelVerificationReminder } from '@/services/notifications';
import { useAppTheme } from '@/hooks/useAppTheme';
import { buildInterpretation } from '@/services/interpretation';
import { fetchAiInterpretation } from '@/services/aiInterpretation';
import { getSpread, spreadBriefFromSummary, SPREAD_LABEL_KEYS } from '@/services/spreads';
import { shareNative, shareToTarget, formatDivinationShareText, type ShareTarget } from '@/services/socialShare';
import ShareTargetSheet from '@/components/ShareTargetSheet';
import { notify } from '@/services/dialog';
import { useI18n } from '@/hooks/useI18n';
import { localizePoem } from '@/services/localize';
import { recordUsage, syncAchievements } from '@/services/achievements';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { SplitReading } from '@/components/SplitReading';

/**
 * 從記錄取出要給 AI 的棋盤資訊。
 *
 * 自由佈局沒有牌陣名也沒有角色段落，兩個欄位都會是 undefined，
 * 只留落子——那仍比什麼都不送好，模型至少知道盤上是哪三顆棋。
 */
function boardContext(record: DivinationRecord) {
  const brief = spreadBriefFromSummary(record.positionSummary);
  return {
    spreadName: record.spreadId && record.spreadId !== 'free'
      ? getSpread(record.spreadId).name
      : undefined,
    pieces: record.drawnPieceChars.join('、') || undefined,
    brief: brief || undefined,
  };
}

export default function RevealScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { recordId, mode } = useLocalSearchParams<{ recordId: string; mode: string }>();
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [isFav, setIsFav] = useState(false);
  // recordId 在歷史中找不到時（深連結、他機分享、記錄已刪）——
  // 過去這裡永遠停在 Spinner，現在明確進入 missing 狀態
  const [missing, setMissing] = useState(false);
  // 感情問事的用神取法取決於占者性別；設定讀不到就不出斷語
  const [divinerGender, setDivinerGender] = useState<DivinerGender | undefined>(undefined);
  /** 待分享的文字。非 null 時分享去處選單就是開著的——選單本身沒有狀態 */
  const [pendingShareText, setPendingShareText] = useState<string | null>(null);
  const shareRef = useRef<ShareCardHandle>(null);

  // AI 深度解讀。這是加值內容——取不到時保留下方的規則式解讀，
  // 不讓籤詩頁因為外部服務而壞掉。
  const [aiState, setAiState] = useState<
    { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; text: string } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  // 轉場階段：loading → splashing → revealed
  const [revealPhase, setRevealPhase] = useState<'loading' | 'splashing' | 'revealed'>('loading');

  const poem = record ? localizePoem(getPoemById(record.poemId)) : null;

  // 有完整卦象資料才能推演三卦與體用（v3 以前的記錄沒有）
  const reading = useMemo(() => {
    if (!record || record.hexagramIndex === undefined || record.movingLine === undefined) {
      return null;
    }
    // 與 verification.ts 相同的範圍檢查：備份還原可能寫入越界或損毀的
    // 卦象資料——越界 index 會顯示亂文；無效 timestamp 會讓 najja 的
    // 旬空查表拿到 undefined，解卦直接紅屏。
    if (
      record.hexagramIndex < 0 || record.hexagramIndex > 63 ||
      record.movingLine < 1 || record.movingLine > 6 ||
      !Number.isFinite(record.timestamp)
    ) {
      return null;
    }
    const [upper, lower] = trigramsFromIndex(record.hexagramIndex);
    // 帶入記錄的 timestamp，讓月建旺衰還原成「起卦當時」的時令。
    // 用現在時間會讓同一筆舊記錄每個月重看都得到不同斷語。
    return buildLiuYaoReading(upper, lower, record.movingLine, new Date(record.timestamp));
  }, [record]);

  useEffect(() => {
    loadRecord();
    getSettings().then(s => setDivinerGender(s.divinerGender));
    playRevealSound();
    recordUsage();
    // 每次看到籤詩就重算成就。先前沒有任何畫面呼叫 checkAchievements，
    // 除了「七日問道」之外的成就對所有使用者永遠是鎖住的。
    syncAchievements().catch(e => console.warn(t('achievement.checkFailed'), e));
  }, [recordId]);

  async function loadRecord() {
    const history = await getHistory();
    const found = history.find(r => r.id === recordId);
    if (found) {
      setRecord(found);
      setIsFav(found.isFavorited);
      // 記錄載入完成 → 觸發墨滴擴散轉場
      setRevealPhase('splashing');
    } else {
      setMissing(true);
    }
  }

  const handleSplashComplete = useCallback(() => {
    setRevealPhase('revealed');
  }, []);

  async function handleAiInterpret() {
    if (!poem) return;
    setAiState({ kind: 'loading' });

    const result = await fetchAiInterpretation({
      poem: {
        title: poem.title,
        content: poem.content,
        level: poem.level,
        hexagramName: poem.hexagramName,
        vernacular: poem.vernacular,
      },
      question: record?.questionText,
      questionCategory: record?.questionCategory,
      hexagram: reading
        ? {
            primaryName: reading.primary.name,
            changedName: reading.changed.name,
            movingLineName: reading.movingLineName,
            bodyUseRelation: `${reading.bodyUse.relation} · ${reading.finalLevel}`,
            seasonalStrength:
              `${reading.strength.monthBranchName}（${reading.strength.season}）令` +
              `${reading.strength.seasonElement}當權，體屬${reading.strength.bodyElement}為${reading.strength.state}`,
          }
        : undefined,
      // 棋盤佈局。記錄裡本來就有牌陣與盤面，只是從沒送出去過——
      // 使用者挑了牌陣、把棋放在哪個角色，對 AI 一直是不存在的。
      board: record?.mode === 'board' ? boardContext(record) : undefined,
    });

    if (result.status === 'ok') setAiState({ kind: 'done', text: result.interpretation });
    else setAiState({ kind: 'failed', message: result.message });
  }

  // 這三個處理器原本都沒有 try/catch。AsyncStorage 寫入失敗時是
  // unhandled rejection，而畫面上的表現是「按了完全沒有反應」——
  // 使用者不會知道回填沒存進去，只會以為按鈕壞了，下次再回來看
  // 才發現占驗不見了。至少要講一聲。
  async function handleSaveOutcome(status: OutcomeStatus, note?: string) {
    if (!record) return;
    try {
      await setOutcome(record.id, status, note);
      await cancelVerificationReminder(record.id);
      hapticSuccess();
      await loadRecord();
    } catch (e) {
      console.warn('占驗回填儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  async function handleClearOutcome() {
    if (!record) return;
    try {
      await clearOutcome(record.id);
      await loadRecord();
    } catch (e) {
      console.warn('占驗清除失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  async function handleSaveNote(note: string) {
    if (!record) return;
    try {
      await setRecordNote(record.id, note);
      await loadRecord();
    } catch (e) {
      console.warn('籤詩筆記儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveOutcomeFailed'));
    }
  }

  async function handleToggleFavorite() {
    if (!record) return;
    try {
      const result = await toggleFavorite(record);
      setIsFav(result);
      playFavoriteSound();
      hapticSuccess();
      await loadRecord();
    } catch (e) {
      // 收藏失敗時不動 isFav：讓畫面維持真實狀態，
      // 否則星星亮著但資料沒存，重進頁面又變回去，更難理解
      console.warn('收藏狀態儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveFavoriteFailed'));
    }
  }

  /**
   * 這次占卜用的牌陣名，已譯。自由佈局與非棋盤模式回 undefined——
   * 「自由佈局」印在卡片上只是雜訊，收藏頁的牌陣晶片也是同一個判斷。
   */
  const spreadName = record?.mode === 'board' && record.spreadId && record.spreadId !== 'free'
    ? t(SPREAD_LABEL_KEYS[record.spreadId])
    : undefined;

  async function handleShare() {
    // 嘗試圖片分享（原生，透過 view-shot 擷取 ShareCardView）。
    // share() 回傳是否真的分享出去；Web 端擷取或系統分享不可用時為 false。
    const shared = await shareRef.current?.share();
    if (shared) return;

    // Web fallback
    if (poem && record) {
      const shareText = formatDivinationShareText({
        poemTitle: poem.title,
        poemLevel: poem.level,
        hexagramName: poem.hexagramName,
        lines: poem.content.split('\n'),
        vernacular: poem.vernacular,
        pieceChars: record.drawnPieceChars,
        spreadName,
        reading: reading ? {
          primaryName: reading.primary.name,
          changedName: reading.changed.name,
          movingLineName: reading.movingLineName,
          relation: reading.bodyUse.relation,
          level: reading.finalLevel,
        } : undefined,
      });

      // 優先使用原生分享選單
      const nativeOk = await shareNative({ title: t('reveal.shareTitle'), text: shareText });
      if (nativeOk) return;

      // 降級：讓使用者自己挑去處。
      // 原本這裡是一個二選一的確認框（確認＝LINE、取消＝複製），
      // 於是 `shareToFacebook()` 寫好了卻永遠沒有入口，而「取消」實際上
      // 是一個動作而不是取消——按下去會偷偷覆寫剪貼簿。
      setPendingShareText(shareText);
    }
  }

  /** 使用者在分享選單挑了去處。訊息由服務層決定，這裡只負責說出來 */
  async function handleShareTarget(target: ShareTarget) {
    const text = pendingShareText;
    setPendingShareText(null);
    if (!text) return;
    const messageKey = await shareToTarget(target, { title: t('reveal.shareTitle'), text });
    if (messageKey) notify(t(messageKey));
  }

  function handleNewDraw() {
    if (mode === 'board') {
      router.replace('/board');
    } else {
      router.replace('/draw');
    }
  }

  if (missing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('reveal.missing')}</Text>
          <Text style={[styles.legacyText, { color: theme.textMuted }]}>{t('reveal.missingDesc')}</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.replace('/(tabs)')}>
            <Icon name="home" size={16} color={theme.textGold} />
            <Text style={styles.newBtnText}> {t('reveal.home')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!record || !poem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Spinner text={t('common.loading')} />
        </View>
      </SafeAreaView>
    );
  }

  const showSplash = revealPhase === 'splashing';
  const piecesRevealed = revealPhase === 'revealed';

  const deepReading = buildInterpretation({
    poem,
    questionText: record.questionText,
    questionCategory: record.questionCategory,
    reading,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
       <View style={styles.inner}>

        {/* 墨滴擴散轉場：覆蓋在內容之上的墨滴遮罩 */}
        <InkSplashOverlay
          visible={showSplash}
          onComplete={handleSplashComplete}
        />

        <SplitReading
         head={<>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('reveal.title')}</Text>
          <View style={styles.backBtn} />
        </View>

        {/* 舊版卦法記錄提示。兩種情況互斥：v1 是卦序整個錯，
            v2–v3 只是動爻算法與古法差 2，不該掛同一面旗子 */}
        {isLegacyRecord(record) && (
          <View style={[styles.legacyBox, { borderColor: theme.warning, backgroundColor: theme.bgDark }]}>
            <Text style={[styles.legacyText, { color: theme.textMuted }]}>
              {t('reveal.legacyNotice')}
            </Text>
          </View>
        )}
        {usesLegacyMovingLine(record) && (
          <View style={[styles.legacyBox, { borderColor: theme.warning, backgroundColor: theme.bgDark }]}>
            <Text style={[styles.legacyText, { color: theme.textMuted }]}>
              {t('reveal.legacyMovingLineNotice')}
            </Text>
          </View>
        )}
         </>}
         rail={<>
        {/* 卦例推演：本卦／互卦／變卦 + 體用 */}
        {reading ? (
          <View style={styles.panelWrap}>
            <LiuYaoPanel
              reading={reading}
              hourBranch={record.hourBranch}
              castAt={new Date(record.timestamp)}
              questionCategory={record.questionCategory}
              divinerGender={divinerGender}
            />
          </View>
        ) : record.hexagramName ? (
          <View style={[styles.hexBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.hexLabel, { color: theme.textMuted }]}>{t('reveal.hexPrimary')}</Text>
            <Text style={[styles.hexName, { color: theme.textGold }]}>{record.hexagramName}</Text>
          </View>
        ) : null}

        {/* 用戶問題 */}
        {record.questionText ? (
          <View style={styles.questionBox}>
            <Text style={styles.questionLabel}>{t('reveal.question')}</Text>
            <Text style={styles.questionText}>{record.questionText}</Text>
          </View>
        ) : null}

        {/* 棋盤位置解讀 */}
        {record.positionSummary ? (
          <View style={[styles.positionBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.positionTitle, { color: theme.textGold }]}>▎{t('reveal.position')}</Text>
            <Text style={[styles.positionText, { color: theme.textSecondary }]}>{record.positionSummary}</Text>
          </View>
        ) : null}
         </>}
         main={<>
        {/* 棋子飛入動畫 */}
        {record.drawnPieceChars.length > 0 && (
          <PieceEntryFlyIn
            pieceChars={record.drawnPieceChars}
            pieceColors={(record.drawnPieceColors || []) as string[]}
            visible={piecesRevealed}
          />
        )}

        {/* PoemCard：棋子 + 籤詩 + 詳解 */}
        <PoemCard
          poem={poem}
          drawnPieceChars={record.drawnPieceChars}
          isFavorited={isFav}
          highlightedCategory={record.questionCategory || 'general'}
          onToggleFavorite={handleToggleFavorite}
          onShare={handleShare}
        />

        {/* AI 深度解讀。取不到時不影響下方的規則式解讀 */}
        <View style={[styles.aiBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.textGold }]}>▎{t('reveal.aiTitle')}</Text>

          {aiState.kind === 'idle' && (
            <TouchableOpacity
              style={[styles.aiBtn, { borderColor: theme.gold }]}
              onPress={handleAiInterpret}
              accessibilityRole="button"
              accessibilityLabel={t('reveal.aiPrompt')}
            >
              <Icon name="crystal-ball" size={16} color={theme.gold} />
              <Text style={[styles.aiBtnText, { color: theme.textGold }]}> {t('reveal.aiAsk')}</Text>
            </TouchableOpacity>
          )}

          {aiState.kind === 'loading' && (
            <View style={styles.aiLoading}>
              <Spinner text={t('reveal.aiLoading')} />
            </View>
          )}

          {aiState.kind === 'done' && (
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
              {aiState.text}
            </Text>
          )}

          {aiState.kind === 'failed' && (
            <View>
              <Text style={[styles.aiNotice, { color: theme.textMuted }]}>
                {aiState.message}
              </Text>
              <TouchableOpacity
                style={[styles.aiBtn, { borderColor: theme.bgMedium }]}
                onPress={handleAiInterpret}
                accessibilityRole="button"
                accessibilityLabel={t('reveal.aiRetryLabel')}
              >
                <Icon name="refresh" size={14} color={theme.textMuted} />
                <Text style={[styles.aiBtnText, { color: theme.textMuted }]}> {t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 規則式深度解讀 */}
        <View style={[styles.aiBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.textGold }]}>▎{t('reveal.deepTitle')}</Text>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            {deepReading.interpretation}
          </Text>
          {deepReading.actionPlan.length > 0 && (
            <View style={styles.actionList}>
              <Text style={[styles.actionTitle, { color: theme.textGold }]}>{t('reveal.deepActions')}</Text>
              {deepReading.actionPlan.map((step, i) => (
                <Text key={i} style={[styles.actionItem, { color: theme.textSecondary }]}>
                  {i + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* 占驗回填。放在解讀之後——剛揭曉時結果還沒發生，先問「準不準」只會困惑 */}
        <OutcomeMarker
          outcome={record.outcome}
          recordNote={record.note}
          timestamp={record.timestamp}
          onSave={handleSaveOutcome}
          onSaveNote={handleSaveNote}
          onClear={handleClearOutcome}
        />

        {/* 再次占卜 */}
        <TouchableOpacity style={styles.newBtn} onPress={handleNewDraw}>
          <Icon name={mode === 'board' ? 'chess-board' : 'dice'} size={18} color={theme.gold} />
          <Text style={styles.newBtnText}>
            {' '}{t(mode === 'board' ? 'reveal.retryBoard' : 'reveal.retry')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Icon name="home" size={16} color={theme.textSecondary} />
          <Text style={styles.homeBtnText}> {t('reveal.home')}</Text>
        </TouchableOpacity>
         </>}
        />
       </View>
      </ScrollView>

      {/* 隱藏的分享卡片（用於生成圖片）。
          只靠離屏定位隱藏，刻意不加 opacity: 0——view-shot 的 iOS 端是
          drawViewHierarchyInRect（照螢幕上的樣子重畫），alpha 為 0 的子樹
          截出空白 PNG 是有回報的行為，而我們沒有實機可以排除它。
          少了 opacity 之後改用 aria-hidden 把整張卡擋在無障礙樹外——
          RN 的 View 會把它轉成 iOS 的 accessibilityElementsHidden 與
          Android 的 importantForAccessibility="no-hide-descendants"，
          web 端則原樣傳給 DOM。否則報讀器會把整首籤詩再念一遍。 */}
      <View style={styles.shareHidden} aria-hidden>
        <ShareCardView
          ref={shareRef}
          poemTitle={poem.title}
          poemContent={poem.content}
          poemLevel={poem.level}
          poemHexagram={poem.hexagramName}
          pieceChars={record.drawnPieceChars}
          pieceColors={record.drawnPieceColors}
          mode={record.mode}
          spreadName={spreadName}
          timestamp={record.timestamp}
          hexagramIndex={record.hexagramIndex}
          movingLine={record.movingLine}
          changedName={reading?.changed.name}
          bodyUseRelation={reading ? `${reading.bodyUse.relation} · ${reading.finalLevel}` : undefined}
        />
      </View>

      <ShareTargetSheet
        visible={pendingShareText !== null}
        onSelect={handleShareTarget}
        onDismiss={() => setPendingShareText(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  scroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  // 限寬與分欄由 SplitReading 決定；這裡只負責置中
  inner: { alignItems: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.body, color: t.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    width: '100%',
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, color: t.textSecondary },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: t.textPrimary },
  piecesRow: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  questionBox: {
    width: '100%',
    backgroundColor: t.bgDark, borderRadius: 12,
    borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  questionLabel: {
    fontSize: FontSize.caption, color: t.textGold,
    marginBottom: 4, fontWeight: '600',
  },
  questionText: {
    fontSize: FontSize.body, color: t.textSecondary,
    fontStyle: 'italic', lineHeight: 24,
  },
  legacyBox: {
    width: '100%',
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  legacyText: {
    fontSize: FontSize.caption, lineHeight: 20,
  },
  panelWrap: {
    width: '100%',
  },
  hexBox: {
    width: '100%',
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  hexLabel: {
    fontSize: FontSize.caption,
  },
  hexName: {
    fontSize: FontSize.subtitle, fontWeight: '700',
    marginVertical: 4, letterSpacing: 2,
  },
  positionBox: {
    width: '100%',
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  positionTitle: {
    fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm,
  },
  positionText: {
    fontSize: FontSize.small, lineHeight: 22,
  },
  pieceDisplay: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: t.pieceBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: t.gold,
  },
  pieceChar: { fontSize: 32, fontWeight: '900' },
  levelBadge: {
    paddingHorizontal: 20, paddingVertical: 6, borderRadius: 14, marginBottom: Spacing.sm,
  },
  levelText: { fontSize: FontSize.body, fontWeight: '700', color: PaperSurface.onLevel },
  hexagramName: {
    fontSize: FontSize.small, color: t.textSecondary, marginBottom: Spacing.sm,
  },
  poemTitle: {
    fontSize: FontSize.subtitle, fontWeight: '700', color: t.textPrimary,
    marginBottom: Spacing.lg,
  },
  poemBox: {
    width: '100%',
    backgroundColor: t.bgDark, borderRadius: 16,
    borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  poemLine: {
    fontSize: FontSize.poem, color: t.textPrimary, textAlign: 'center',
    lineHeight: 38, letterSpacing: 3,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: t.bgMedium,
  },
  dividerText: {
    fontSize: 18, color: t.textGold, marginHorizontal: Spacing.md,
  },
  section: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.body, fontWeight: '600', color: t.textGold,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    fontSize: FontSize.body, color: t.textSecondary, lineHeight: 26,
  },
  catScroll: { marginBottom: Spacing.sm },
  catContent: { gap: 6 },
  catTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
    gap: 4,
  },
  catTabActive: {
    borderColor: t.gold, backgroundColor: t.bgMedium,
  },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: FontSize.small, color: t.textMuted },
  catLabelActive: { color: t.textGold, fontWeight: '600' },
  catContentBox: {
    backgroundColor: t.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.md,
  },
  actions: {
    flexDirection: 'row', gap: Spacing.sm,
    width: '100%', marginTop: Spacing.md,
  },
  favBtn: {
    flex: 1, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  favBtnText: { fontSize: FontSize.body, color: t.textSecondary },
  shareBtn: {
    flex: 1, backgroundColor: t.gold,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  shareBtnText: { fontSize: FontSize.body, fontWeight: '600', color: t.textInverse },
  newBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    width: '100%', borderWidth: 1, borderColor: t.bgMedium,
    paddingVertical: 12, borderRadius: 12, marginTop: Spacing.sm, gap: 4,
  },
  newBtnText: { fontSize: FontSize.body, color: t.textGold },
  homeBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    width: '100%',
    paddingVertical: 12, borderRadius: 12, marginTop: 4, gap: 4,
  },
  homeBtnText: { fontSize: FontSize.body, color: t.textMuted },
  aiBox: {
    width: '100%',
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginTop: Spacing.sm,
  },
  aiBtnText: { fontSize: FontSize.small, fontWeight: '600' },
  aiLoading: { paddingVertical: Spacing.md, alignItems: 'center' },
  aiNotice: { fontSize: FontSize.small, lineHeight: 20 },
  actionList: { marginTop: Spacing.md },
  actionTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.sm },
  actionItem: { fontSize: FontSize.body, lineHeight: 26, marginBottom: 4 },
  // 400×680 的卡片挪到畫面外 9999pt，任何裝置都碰不到；
  // 不要再加 opacity（理由見上方 aria-hidden 處的註解）
  shareHidden: {
    position: 'absolute', top: -9999, left: -9999,
    pointerEvents: 'none',
  },
});
