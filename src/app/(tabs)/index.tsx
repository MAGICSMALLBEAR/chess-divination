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
import { getDailyFortune, saveDailyFortune, type DailyFortune } from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
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

  useEffect(() => {
    loadDaily();
  }, []);

  async function loadDaily() {
    let fortune = await getDailyFortune();
    if (!fortune) {
      fortune = generateDailyFortune();
      await saveDailyFortune(fortune);
    }
    setDailyFortune(fortune);
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
          <Text style={styles.appName}>象棋占卜</Text>
          <Text style={styles.tagline}>以棋問道 · 觀象知機</Text>
        </View>

        {/* 每日運勢卡片 */}
        {dailyFortune && (
          <View style={styles.dailyCard}>
            <Text style={styles.dailyTitle}>📍 今日棋運</Text>
            <View style={styles.dailyContent}>
              <View style={styles.dailyMain}>
                <Text style={styles.dailyLevel}>{dailyFortune.fortuneLevel}</Text>
                <Text style={styles.dailyText}>{dailyFortune.fortuneText}</Text>
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
          </View>
        )}

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
  dailyCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#1A1210', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A2F25', padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dailyTitle: {
    fontSize: FontSize.heading, fontWeight: '700', color: '#C9A96E',
    marginBottom: Spacing.md,
  },
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
});
