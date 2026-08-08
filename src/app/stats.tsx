// 統計儀表板
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import TrendChart from '@/components/TrendChart';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGrid } from '@/hooks/useGrid';
import { getHistory, type DivinationRecord } from '@/services/storage';
import { POEM_LEVELS, getLevelColor } from '@/data/poems';
import { t } from '@/services/i18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, Layout } from '@/constants/theme';

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { onLayout, cardWidth } = useGrid();
  const [records, setRecords] = useState<DivinationRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const h = await getHistory();
    setRecords(h);
  }

  // 依日期篩選
  const filtered = (() => {
    const now = Date.now();
    if (dateFilter === 'week') return records.filter(r => now - r.timestamp < 7 * 86400000);
    if (dateFilter === 'month') return records.filter(r => now - r.timestamp < 30 * 86400000);
    return records;
  })();

  const total = filtered.length;
  const drawCount = filtered.filter(r => r.mode === 'draw').length;
  const boardCount = filtered.filter(r => r.mode === 'board').length;
  const favCount = filtered.filter(r => r.isFavorited).length;

  // 棋子統計
  const typeCounts: Record<string, number> = {};
  filtered.forEach(r => r.drawnPieceTypes.forEach(t => {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }));
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // 吉凶分佈
  const levelCounts: Record<string, number> = {};
  filtered.forEach(r => {
    levelCounts[r.poemLevel] = (levelCounts[r.poemLevel] || 0) + 1;
  });

  const maxLevel = Math.max(...Object.values(levelCounts), 1);

  // 趨勢圖資料：最近 7 天每日占卜次數與吉凶分佈
  const trendData = React.useMemo(() => {
    const days: { label: string; total: number; good: number; neutral: number; bad: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayRecords = records.filter(r => {
        const rd = new Date(r.timestamp);
        return rd.getFullYear() === d.getFullYear() &&
          rd.getMonth() === d.getMonth() &&
          rd.getDate() === d.getDate();
      });
      days.push({
        label: key,
        total: dayRecords.length,
        good: dayRecords.filter(r => r.poemLevel === '大吉' || r.poemLevel === '上吉').length,
        neutral: dayRecords.filter(r => r.poemLevel === '中吉' || r.poemLevel === '中平').length,
        bad: dayRecords.filter(r => r.poemLevel === '下下').length,
      });
    }
    return days;
  }, [records]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings.stats')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 日期篩選 */}
        <View style={styles.filterRow}>
          {(['all', 'week', 'month'] as const).map(f => (
            <TouchableOpacity key={f}
              style={[styles.filterBtn, dateFilter === f && { borderColor: theme.gold }]}
              onPress={() => setDateFilter(f)}>
              <Text style={[styles.filterText, dateFilter === f && { color: theme.textGold }]}>
                {f === 'all' ? '全部' : f === 'week' ? '本週' : '本月'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 總覽數字 */}
        <View style={styles.overviewRow}>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('stats.overview')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{drawCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('stats.draw')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{boardCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('stats.board')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{favCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>收藏</Text>
          </View>
        </View>

        {/* 趨勢圖表 */}
        <TrendChart data={trendData} title="近 7 天占卜趨勢" />

        {/* 吉凶分佈與棋子排行。寬螢幕並排，窄螢幕上下堆疊 */}
        <View testID="card-grid" style={styles.grid} onLayout={onLayout}>
        <View style={[
          styles.section,
          { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
          cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.gold }]}>吉凶分佈</Text>
          {POEM_LEVELS.map(level => {
            const count = levelCounts[level] || 0;
            const pct = total > 0 ? (count / total * 100) : 0;
            const barW = total > 0 ? (count / maxLevel * 100) : 0;
            return (
              <View key={level} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{level}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${barW}%`, backgroundColor: getLevelColor(level) }]} />
                </View>
                <Text style={[styles.barCount, { color: theme.textMuted }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* 最常抽到的棋子 */}
        <View style={[
          styles.section,
          { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
          cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
        ]}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backText: { fontSize: FontSize.body },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 40, alignItems: 'center' },
  // 網格容器：限寬置中，欄數由 useGrid 依量測到的容器寬度決定
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    alignItems: 'flex-start', alignSelf: 'center',
    width: '100%', maxWidth: Layout.maxGrid,
  },
  overviewRow: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  statBox: {
    flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statNum: { fontSize: FontSize.title, fontWeight: '900', color: t.textGold },
  statLabel: { fontSize: FontSize.caption, marginTop: 4 },
  section: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { fontSize: FontSize.small, width: 40 },
  barTrack: { flex: 1, height: 14, backgroundColor: t.bgDark, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7, minWidth: 2 },
  barCount: { fontSize: FontSize.small, width: 30, textAlign: 'right' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rankNum: { fontSize: FontSize.small, fontWeight: '700', width: 24 },
  rankType: { fontSize: FontSize.body, flex: 1 },
  rankCount: { fontSize: FontSize.small },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', paddingVertical: Spacing.md },
  filterRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  filterText: { fontSize: FontSize.small, color: t.textMuted },
});
