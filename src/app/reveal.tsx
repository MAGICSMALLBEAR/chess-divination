// 籤詩展示頁面 — 完整解讀
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ShareCardView, { type ShareCardHandle } from '@/components/ShareCardView';
import PoemCard from '@/components/PoemCard';
import type { DivinationRecord } from '@/services/storage';
import { getHistory, toggleFavorite } from '@/services/storage';
import { getPoemById } from '@/data/poems';
import { playRevealSound, playFavoriteSound } from '@/services/sound';
import { hapticSuccess } from '@/services/haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getAIInterpretation } from '@/services/ai';
import { t } from '@/services/i18n';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RevealScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { recordId, mode } = useLocalSearchParams<{ recordId: string; mode: string }>();
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [aiResult, setAiResult] = useState<{ interpretation: string; actionPlan: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const shareRef = useRef<ShareCardHandle>(null);

  useEffect(() => {
    loadRecord();
    playRevealSound();
  }, [recordId]);

  async function loadRecord() {
    const history = await getHistory();
    const found = history.find(r => r.id === recordId);
    if (found) {
      setRecord(found);
      setIsFav(found.isFavorited);
      // 載入 AI 解讀
      const poem = getPoemById(found.poemId);
      setAiLoading(true);
      try {
        const result = await getAIInterpretation(poem, found.questionText);
        setAiResult(result);
      } catch {}
      setAiLoading(false);
    }
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
    // 嘗試圖片分享（原生）
    try {
      await shareRef.current?.share();
      return;
    } catch {}

    // Web fallback: 使用 Web Share API 或複製到剪貼簿
    if (poem) {
      const shareText = `【象棋占卜】${poem.level} · ${poem.title}\n\n${poem.content.replace(/\n/g, ' ')}\n\n${poem.vernacular}\n\n以棋問道 · 觀象知機`;
      try {
        if (navigator.share) {
          await navigator.share({ title: '象棋占卜結果', text: shareText });
          return;
        }
      } catch {}
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          alert('已複製到剪貼簿');
        }
      } catch {}
    }
  }

  function handleNewDraw() {
    if (mode === 'board') {
      router.replace('/board');
    } else {
      router.replace('/draw');
    }
  }

  if (!record) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load full poem data
  const poem = getPoemById(record.poemId);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('reveal.title')}</Text>
          <View style={styles.backBtn} />
        </View>

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

        {/* PoemCard：棋子 + 籤詩 + 詳解 */}
        <PoemCard
          poem={poem}
          drawnPieceChars={record.drawnPieceChars}
          isFavorited={isFav}
          highlightedCategory={record.questionCategory || 'general'}
          onToggleFavorite={handleToggleFavorite}
          onShare={handleShare}
        />

        {/* AI 解讀 */}
        {aiLoading && (
          <View style={[styles.aiBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.sectionTitle, { color: theme.gold }]}>🤖 AI 解讀中...</Text>
          </View>
        )}
        {aiResult && !aiLoading && (
          <View style={[styles.aiBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.sectionTitle, { color: theme.gold }]}>🤖 AI 智慧解讀</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{aiResult.interpretation}</Text>
            {aiResult.actionPlan.length > 0 && (
              <View style={styles.actionList}>
                <Text style={[styles.actionTitle, { color: theme.gold }]}>建議行動</Text>
                {aiResult.actionPlan.map((step, i) => (
                  <Text key={i} style={[styles.actionItem, { color: theme.textSecondary }]}>
                    {i + 1}. {step}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 再次占卜 */}
        <TouchableOpacity style={styles.newBtn} onPress={handleNewDraw}>
          <Text style={styles.newBtnText}>
            {mode === 'board' ? '♟️ 重新佈局' : '🎲 再次抽棋'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text style={styles.homeBtnText}>🏠 回首頁</Text>
        </TouchableOpacity>
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
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0A08' },
  scroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.body, color: '#C9B99A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    width: '100%',
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, color: '#C9B99A' },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: '#F5EDE0' },
  piecesRow: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  questionBox: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    backgroundColor: '#1A1210', borderRadius: 12,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  questionLabel: {
    fontSize: FontSize.caption, color: '#C9A96E',
    marginBottom: 4, fontWeight: '600',
  },
  questionText: {
    fontSize: FontSize.body, color: '#C9B99A',
    fontStyle: 'italic', lineHeight: 24,
  },
  positionBox: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
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
    backgroundColor: '#F5EDE0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#C9A96E',
  },
  pieceChar: { fontSize: 32, fontWeight: '900' },
  levelBadge: {
    paddingHorizontal: 20, paddingVertical: 6, borderRadius: 14, marginBottom: Spacing.sm,
  },
  levelText: { fontSize: FontSize.body, fontWeight: '700', color: '#FFFFFF' },
  hexagramName: {
    fontSize: FontSize.small, color: '#C9B99A', marginBottom: Spacing.sm,
  },
  poemTitle: {
    fontSize: FontSize.subtitle, fontWeight: '700', color: '#F5EDE0',
    marginBottom: Spacing.lg,
  },
  poemBox: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    backgroundColor: '#1A1210', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  poemLine: {
    fontSize: FontSize.poem, color: '#F5EDE0', textAlign: 'center',
    lineHeight: 38, letterSpacing: 3,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    width: SCREEN_WIDTH - Spacing.xl * 2, marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: '#3A2F25',
  },
  dividerText: {
    fontSize: 18, color: '#C9A96E', marginHorizontal: Spacing.md,
  },
  section: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.body, fontWeight: '600', color: '#C9A96E',
    marginBottom: Spacing.sm,
  },
  bodyText: {
    fontSize: FontSize.body, color: '#C9B99A', lineHeight: 26,
  },
  catScroll: { marginBottom: Spacing.sm },
  catContent: { gap: 6 },
  catTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
    gap: 4,
  },
  catTabActive: {
    borderColor: '#C9A96E', backgroundColor: '#2A1F18',
  },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: FontSize.small, color: '#8A7A60' },
  catLabelActive: { color: '#C9A96E', fontWeight: '600' },
  catContentBox: {
    backgroundColor: '#231A14', borderRadius: 12,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.md,
  },
  actions: {
    flexDirection: 'row', gap: Spacing.sm,
    width: SCREEN_WIDTH - Spacing.xl * 2, marginTop: Spacing.md,
  },
  favBtn: {
    flex: 1, backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  favBtnText: { fontSize: FontSize.body, color: '#C9B99A' },
  shareBtn: {
    flex: 1, backgroundColor: '#C9A96E',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  shareBtnText: { fontSize: FontSize.body, fontWeight: '600', color: '#1A1210' },
  newBtn: {
    width: SCREEN_WIDTH - Spacing.xl * 2, borderWidth: 1, borderColor: '#3A2F25',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: Spacing.sm,
  },
  newBtnText: { fontSize: FontSize.body, color: '#C9A96E' },
  homeBtn: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  homeBtnText: { fontSize: FontSize.body, color: '#8A7A60' },
  aiBox: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  actionList: { marginTop: Spacing.md },
  actionTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.sm },
  actionItem: { fontSize: FontSize.body, lineHeight: 26, marginBottom: 4 },
  shareHidden: {
    position: 'absolute', top: -9999, left: -9999,
    opacity: 0, pointerEvents: 'none',
  },
});
