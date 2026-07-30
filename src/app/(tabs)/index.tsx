// 首頁：模式選擇 + 每日運勢
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ModeSelector from '@/components/ModeSelector';
import { generateDailyFortune } from '@/services/divination';
import { getDailyFortune, saveDailyFortune, getHistory, type DailyFortune, type DivinationRecord } from '@/services/storage';
import { getStreak } from '@/services/achievements';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import { Spacing, FontSize } from '@/constants/theme';

const PIECE_EMOJIS: Record<string, string> = {
  king: '👑', advisor: '🎓', elephant: '🐘',
  chariot: '🏰', horse: '🐴', cannon: '💣', pawn: '⚔️',
};
const PIECE_NAMES: Record<string, string> = {
  king: '帥/將', advisor: '仕/士', elephant: '相/象',
  chariot: '車', horse: '馬', cannon: '炮/砲', pawn: '兵/卒',
};

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  const [recentRecords, setRecentRecords] = useState<DivinationRecord[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadDaily();
    loadRecent();
    loadStreak();
  }, []);

  async function loadStreak() { setStreak(await getStreak()); }

  async function loadDaily() {
    let fortune = await getDailyFortune();
    if (!fortune) {
      fortune = generateDailyFortune();
      await saveDailyFortune(fortune);
    }
    setDailyFortune(fortune);
  }
  async function loadRecent() {
    const h = await getHistory();
    setRecentRecords(h.slice(0, 3));
  }

  function handleSelectMode(mode: 'draw' | 'board') {
    if (mode === 'draw') {
      router.push('/draw');
    } else {
      router.push('/board');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 頂部標題 */}
        <View style={styles.header}>
          <Text style={styles.appName}>{t('home.title')}</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
          {streak > 1 && (
            <Text style={[styles.streakText, { color: theme.gold }]}>
              🔥 連續 {streak} 天
            </Text>
          )}
        </View>

        {/* 每日運勢卡片 */}
        {dailyFortune && (
          <TouchableOpacity
            style={[styles.dailyCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
            onPress={() => router.push('/draw')}
            activeOpacity={0.8}
          >
            <View style={styles.dailyHeaderRow}>
              <Text style={[styles.dailyTitle, { color: theme.gold }]}>📍 {t('home.daily')}</Text>
              <TouchableOpacity onPress={() => {
                if (!dailyFortune) return;
                const text = `🏮 今日棋運：${dailyFortune.fortuneLevel}\n\n${dailyFortune.fortuneText}\n\n幸運棋子：${PIECE_NAMES[dailyFortune.luckyPiece]}\n幸運方位：${dailyFortune.luckyDirection}\n幸運數字：${dailyFortune.luckyNumber}\n幸運色：${dailyFortune.luckyColor}\n\nchess-divination-app.vercel.app`;
                try { navigator.share?.({ title: '象棋占卜 - 今日運勢', text }); } catch {}
                try { navigator.clipboard?.writeText(text); } catch {}
              }}>
                <Text style={{ fontSize: 16 }}>📤</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dailyContent}>
              <View style={styles.dailyMain}>
                <Text style={styles.dailyLevel}>{dailyFortune.fortuneLevel}</Text>
                <Text style={[styles.dailyText, { color: theme.textSecondary }]}>{dailyFortune.fortuneText}</Text>
              </View>
              <View style={styles.dailyDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>幸運棋子</Text>
                  <Text style={styles.detailValue}>
                    {PIECE_EMOJIS[dailyFortune.luckyPiece] || '🎯'}{' '}
                    {PIECE_NAMES[dailyFortune.luckyPiece]}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>幸運方位</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyDirection}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>幸運數字</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyNumber}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>幸運色</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyColor}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 最近紀錄 */}
        {recentRecords.length > 0 && (
          <View style={[styles.recentSection, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.recentTitle, { color: theme.gold }]}>📜 最近占卜</Text>
            {recentRecords.map(r => (
              <TouchableOpacity key={r.id} style={styles.recentRow}
                onPress={() => router.push({ pathname: '/reveal', params: { recordId: r.id, mode: r.mode } })}>
                <Text style={[styles.recentPieces, { color: theme.textPrimary }]}>{r.drawnPieceChars.join(' ')}</Text>
                <Text style={[styles.recentPoem, { color: theme.textSecondary }]} numberOfLines={1}>{r.poemTitle}</Text>
                <Text style={[styles.recentLevel, { color: r.poemLevel === '大吉' ? '#C9A96E' : r.poemLevel === '下下' ? '#8A7A60' : theme.textMuted }]}>{r.poemLevel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 快速抽棋 */}
        <TouchableOpacity
          style={[styles.quickDraw, { backgroundColor: theme.gold, borderColor: theme.gold }]}
          onPress={() => router.push('/draw')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickDrawText}>🎲 快速抽一籤</Text>
          <Text style={styles.quickDrawSub}>直接抽取 2 顆棋子獲得指引</Text>
        </TouchableOpacity>

        {/* 模式選擇 */}
        <ModeSelector onSelectMode={handleSelectMode} />

        {/* 棋道箴言 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quote}>
            「棋局如人生，落子無悔。{'\n'}觀棋不語真君子，起手無回大丈夫。」
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0A08' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize.hero, fontWeight: '900', color: '#C9A96E',
    letterSpacing: 4, marginBottom: Spacing.xs,
  },
  tagline: { fontSize: FontSize.body, color: '#C9B99A', letterSpacing: 2 },
  streakText: { fontSize: FontSize.small, fontWeight: '600', marginTop: 4 },
  dailyCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#1A1210', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A2F25', padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dailyHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dailyTitle: { fontSize: FontSize.heading, fontWeight: '700' },
  dailyContent: { gap: Spacing.md },
  dailyMain: { alignItems: 'center' },
  dailyLevel: {
    fontSize: FontSize.subtitle, fontWeight: '900', color: '#E5746A',
    marginBottom: Spacing.xs,
  },
  dailyText: {
    fontSize: FontSize.body, color: '#C9B99A', textAlign: 'center',
    lineHeight: 26,
  },
  dailyDetails: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: Spacing.sm,
  },
  detailItem: {
    alignItems: 'center',
    backgroundColor: '#231A14', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 70,
  },
  detailLabel: { fontSize: 11, color: '#8A7A60', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#F5EDE0' },
  quoteCard: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.md,
    padding: Spacing.md, alignItems: 'center',
  },
  quote: {
    fontSize: FontSize.small, color: '#8A7A60', textAlign: 'center',
    lineHeight: 24, fontStyle: 'italic',
  },
  quickDraw: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },
  quickDrawText: {
    fontSize: FontSize.body, fontWeight: '700', color: '#1A1210',
  },
  quickDrawSub: {
    fontSize: FontSize.caption, color: '#5A4A38', marginTop: 2,
  },
  recentSection: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
  },
  recentTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.sm },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#2A1F18',
  },
  recentPieces: { fontSize: 18, fontWeight: '700', letterSpacing: 3, width: 60 },
  recentPoem: { flex: 1, fontSize: FontSize.small },
  recentLevel: { fontSize: FontSize.caption, fontWeight: '600' },
});
