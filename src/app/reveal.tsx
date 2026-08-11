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
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/icons';
import { buildLiuYaoReading } from '@/services/liuyao';
import { trigramsFromIndex } from '@/services/hexagram';
import type { DivinationRecord } from '@/services/storage';
import { getHistory, toggleFavorite, isLegacyRecord } from '@/services/storage';
import { getPoemById } from '@/data/poems';
import { playRevealSound, playFavoriteSound } from '@/services/sound';
import { hapticSuccess } from '@/services/haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { buildInterpretation } from '@/services/interpretation';
import { fetchAiInterpretation } from '@/services/aiInterpretation';
import { shareNative, shareToLine, shareToFacebook, copyToClipboard, formatDivinationShareText } from '@/services/socialShare';
import { t } from '@/services/i18n';
import { localizePoem } from '@/services/localize';
import { recordUsage } from '@/services/achievements';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';

export default function RevealScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { recordId, mode } = useLocalSearchParams<{ recordId: string; mode: string }>();
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [isFav, setIsFav] = useState(false);
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
    const [upper, lower] = trigramsFromIndex(record.hexagramIndex);
    return buildLiuYaoReading(upper, lower, record.movingLine);
  }, [record]);

  useEffect(() => {
    loadRecord();
    playRevealSound();
    recordUsage();
  }, [recordId]);

  async function loadRecord() {
    const history = await getHistory();
    const found = history.find(r => r.id === recordId);
    if (found) {
      setRecord(found);
      setIsFav(found.isFavorited);
      // 記錄載入完成 → 觸發墨滴擴散轉場
      setRevealPhase('splashing');
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
            bodyUseRelation: reading.bodyUse.relation,
          }
        : undefined,
    });

    if (result.status === 'ok') setAiState({ kind: 'done', text: result.interpretation });
    else setAiState({ kind: 'failed', message: result.message });
  }

  async function handleToggleFavorite() {
    if (!record) return;
    const result = await toggleFavorite(record);
    setIsFav(result);
    playFavoriteSound();
    hapticSuccess();
    await loadRecord();
  }

  async function handleShare() {
    // 嘗試圖片分享（原生，透過 view-shot 擷取 ShareCardView）
    try {
      await shareRef.current?.share();
      return;
    } catch { /* view-shot 在 Web 端不可用，fallback 至文字分享 */ }

    // Web fallback
    if (poem && record) {
      const shareText = formatDivinationShareText({
        poemTitle: poem.title,
        poemLevel: poem.level,
        hexagramName: poem.hexagramName,
        lines: poem.content.split('\n'),
        vernacular: poem.vernacular,
        pieceChars: record.drawnPieceChars,
        reading: reading ? {
          primaryName: reading.primary.name,
          changedName: reading.changed.name,
          movingLineName: reading.movingLineName,
          relation: reading.bodyUse.relation,
          level: reading.bodyUse.level,
        } : undefined,
      });

      // 優先使用原生分享選單
      const nativeOk = await shareNative({ title: '象棋占卜結果', text: shareText });
      if (nativeOk) return;

      // 降級：LINE / FB / 複製
      if (typeof window !== 'undefined' && window.confirm('分享到 LINE？\n(取消則複製到剪貼簿)')) {
        shareToLine({ title: '象棋占卜結果', text: shareText });
      } else {
        const ok = await copyToClipboard(shareText);
        if (typeof window !== 'undefined') {
          window.alert(ok ? '已複製到剪貼簿' : '複製失敗，請手動選取文字複製');
        }
      }
    }
  }

  function handleNewDraw() {
    if (mode === 'board') {
      router.replace('/board');
    } else {
      router.replace('/draw');
    }
  }

  if (!record || !poem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Spinner text="載入中..." />
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
       <View style={[styles.inner, { width: contentWidth }]}>

        {/* 墨滴擴散轉場：覆蓋在內容之上的墨滴遮罩 */}
        <InkSplashOverlay
          visible={showSplash}
          onComplete={handleSplashComplete}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('reveal.title')}</Text>
          <View style={styles.backBtn} />
        </View>

        {/* 舊版卦法記錄提示 */}
        {isLegacyRecord(record) && (
          <View style={[styles.legacyBox, { borderColor: theme.warning, backgroundColor: theme.bgDark }]}>
            <Text style={[styles.legacyText, { color: theme.textMuted }]}>
              ⓘ 此記錄以舊版卦法產生。舊版的卦序對應有誤（先天序誤作文王序），
              籤詩與卦象可能不符。為保留原始占卜結果，此記錄維持原樣不予改寫；
              重新占卜即採用修正後的卦法。
            </Text>
          </View>
        )}

        {/* 卦例推演：本卦／互卦／變卦 + 體用 */}
        {reading ? (
          <View style={styles.panelWrap}>
            <LiuYaoPanel reading={reading} hourBranch={record.hourBranch} />
          </View>
        ) : record.hexagramName ? (
          <View style={[styles.hexBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.hexLabel, { color: theme.textMuted }]}>本卦</Text>
            <Text style={[styles.hexName, { color: theme.gold }]}>{record.hexagramName}</Text>
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
            <Text style={[styles.positionTitle, { color: theme.gold }]}>▎棋盤佈局解讀</Text>
            <Text style={[styles.positionText, { color: theme.textSecondary }]}>{record.positionSummary}</Text>
          </View>
        ) : null}

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
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>▎AI 深度解讀</Text>

          {aiState.kind === 'idle' && (
            <TouchableOpacity
              style={[styles.aiBtn, { borderColor: theme.gold }]}
              onPress={handleAiInterpret}
              accessibilityRole="button"
              accessibilityLabel="請 AI 為這支籤詩提供深度解讀"
            >
              <Icon name="crystal-ball" size={16} color={theme.gold} />
              <Text style={[styles.aiBtnText, { color: theme.gold }]}> 請 AI 解讀此卦</Text>
            </TouchableOpacity>
          )}

          {aiState.kind === 'loading' && (
            <View style={styles.aiLoading}>
              <Spinner text="解讀中..." />
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
                accessibilityLabel="重新嘗試 AI 解讀"
              >
                <Icon name="refresh" size={14} color={theme.textMuted} />
                <Text style={[styles.aiBtnText, { color: theme.textMuted }]}> 重試</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 規則式深度解讀 */}
        <View style={[styles.aiBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>▎深度解讀</Text>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            {deepReading.interpretation}
          </Text>
          {deepReading.actionPlan.length > 0 && (
            <View style={styles.actionList}>
              <Text style={[styles.actionTitle, { color: theme.gold }]}>建議行動</Text>
              {deepReading.actionPlan.map((step, i) => (
                <Text key={i} style={[styles.actionItem, { color: theme.textSecondary }]}>
                  {i + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* 再次占卜 */}
        <TouchableOpacity style={styles.newBtn} onPress={handleNewDraw}>
          <Icon name={mode === 'board' ? 'chess-board' : 'dice'} size={18} color={theme.gold} />
          <Text style={styles.newBtnText}>
            {mode === 'board' ? ' 重新佈局' : ' 再次抽棋'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Icon name="home" size={16} color={theme.textSecondary} />
          <Text style={styles.homeBtnText}> 回首頁</Text>
        </TouchableOpacity>
       </View>
      </ScrollView>

      {/* 隱藏的分享卡片（用於生成圖片） */}
      <View style={styles.shareHidden}>
        <ShareCardView
          ref={shareRef}
          poemTitle={poem.title}
          poemContent={poem.content}
          poemLevel={poem.level}
          poemHexagram={poem.hexagramName}
          pieceChars={record.drawnPieceChars}
          pieceColors={record.drawnPieceColors}
          mode={record.mode}
          timestamp={record.timestamp}
          hexagramIndex={record.hexagramIndex}
          movingLine={record.movingLine}
          changedName={reading?.changed.name}
          bodyUseRelation={reading ? `${reading.bodyUse.relation} · ${reading.bodyUse.level}` : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  scroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  // 內容以 contentWidth 限寬並置中，避免在平板／桌面被撐成整個視窗寬
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
  shareHidden: {
    position: 'absolute', top: -9999, left: -9999,
    opacity: 0, pointerEvents: 'none',
  },
});
