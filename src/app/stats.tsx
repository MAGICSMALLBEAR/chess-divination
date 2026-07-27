// 統計儀表板
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getHistory, type DivinationRecord } from '@/services/storage';
import { POEM_LEVELS } from '@/data/poems';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [records, setRecords] = useState<DivinationRecord[]>([]);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const h = await getHistory();
    setRecords(h);
  }

  const total = records.length;
  const drawCount = records.filter(r => r.mode === 'draw').length;
  const boardCount = records.filter(r => r.mode === 'board').length;
  const favCount = records.filter(r => r.isFavorited).length;

  // 棋子統計
  const typeCounts: Record<string, number> = {};
  records.forEach(r => r.drawnPieceTypes.forEach(t => {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }));
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // 吉凶分佈
  const levelCounts: Record<string, number> = {};
  records.forEach(r => {
    levelCounts[r.poemLevel] = (levelCounts[r.poemLevel] || 0) + 1;
  });

  const maxLevel = Math.max(...Object.values(levelCounts), 1);

  const levelColors: Record<string, string> = {
    '大吉': '#C9A96E', '上吉': '#E5746A', '中吉': '#6B9B6B',
    '中平': '#C9B99A', '下下': '#8A7A60',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>占卜統計</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 總覽數字 */}
        <View style={styles.overviewRow}>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>總次數</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{drawCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>抽棋</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{boardCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>佈局</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{favCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>收藏</Text>
          </View>
        </View>

        {/* 吉凶分佈 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>吉凶分佈</Text>
          {POEM_LEVELS.map(level => {
            const count = levelCounts[level] || 0;
            const pct = total > 0 ? (count / total * 100) : 0;
            const barW = total > 0 ? (count / maxLevel * 100) : 0;
            return (
              <View key={level} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{level}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${barW}%`, backgroundColor: levelColors[level] || '#666' }]} />
                </View>
                <Text style={[styles.barCount, { color: theme.textMuted }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* 最常抽到的棋子 */}
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>最常抽到棋子類型</Text>
          {sortedTypes.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>尚無資料</Text>
          )}
          {sortedTypes.slice(0, 7).map(([type, count], i) => (
            <View key={type} style={styles.rankRow}>
              <Text style={[styles.rankNum, { color: theme.gold }]}>#{i + 1}</Text>
              <Text style={[styles.rankType, { color: theme.textPrimary }]}>{type}</Text>
              <Text style={[styles.rankCount, { color: theme.textMuted }]}>{count} 次</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backText: { fontSize: FontSize.body },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  overviewRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statBox: {
    flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statNum: { fontSize: FontSize.title, fontWeight: '900', color: '#C9A96E' },
  statLabel: { fontSize: FontSize.caption, marginTop: 4 },
  section: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { fontSize: FontSize.small, width: 40 },
  barTrack: { flex: 1, height: 14, backgroundColor: '#1A1210', borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7, minWidth: 2 },
  barCount: { fontSize: FontSize.small, width: 30, textAlign: 'right' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rankNum: { fontSize: FontSize.small, fontWeight: '700', width: 24 },
  rankType: { fontSize: FontSize.body, flex: 1 },
  rankCount: { fontSize: FontSize.small },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', paddingVertical: Spacing.md },
});
