// 籤詩圖鑑 - 瀏覽全部 64 首籤詩
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import { ALL_POEMS, getLevelColor, POEM_LEVELS } from '@/data/poems';
import { localizePoem } from '@/services/localize';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGrid } from '@/hooks/useGrid';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface, Layout } from '@/constants/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { onLayout, cardWidth } = useGrid();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function handleRandomScroll() {
    const randIdx = Math.floor(Math.random() * filtered.length);
    const poem = filtered[randIdx];
    if (poem) setExpandedId(poem.id);
  }

  const filtered = useMemo(() => {
    let poems = ALL_POEMS;
    if (levelFilter) poems = poems.filter(p => p.level === levelFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      poems = poems.filter(p =>
        p.title.includes(q) || p.content.includes(q) ||
        p.hexagramName.includes(q) || p.vernacular.includes(q)
      );
    }
    return poems;
  }, [search, levelFilter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>籤詩圖鑑</Text>
        <TouchableOpacity onPress={handleRandomScroll}>
          <Icon name="dice" size={22} color={theme.gold} />
        </TouchableOpacity>
      </View>

      {/* 搜尋與篩選。包在限寬容器內，與下方內容網格對齊 */}
      <View style={styles.controls}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgCard, borderColor: theme.goldFaint, color: theme.textPrimary }]}
        placeholder="搜尋籤詩..."
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* 等級篩選 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !levelFilter && { borderColor: theme.gold }]}
          onPress={() => setLevelFilter(null)}>
          <Text style={[styles.filterText, !levelFilter && { color: theme.textGold }]}>全部</Text>
        </TouchableOpacity>
        {POEM_LEVELS.map(level => (
          <TouchableOpacity key={level}
            style={[styles.filterChip, levelFilter === level && { borderColor: getLevelColor(level) }]}
            onPress={() => setLevelFilter(level === levelFilter ? null : level)}>
            <View style={[styles.filterDot, { backgroundColor: getLevelColor(level) }]} />
            <Text style={[styles.filterText, levelFilter === level && { color: getLevelColor(level) }]}>
              {level} ({ALL_POEMS.filter(p => p.level === level).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.count, { color: theme.textMuted }]}>
        共 {filtered.length} 首
      </Text>
      </View>

      {/* 詩歌列表。寬螢幕改為多欄網格，避免卡片被撐成整個視窗寬 */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View testID="card-grid" style={styles.grid} onLayout={onLayout}>
        {filtered.map(poem => { const p = localizePoem(poem); return (
          <TouchableOpacity key={p.id}
            style={[
              styles.card,
              { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
              // 單欄時佔滿容器；多欄時以計算出的卡片寬並排
              cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
            ]}
            onPress={() => setExpandedId(expandedId === p.id ? null : p.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.levelDot, { backgroundColor: getLevelColor(p.level) }]}>
                <Text style={styles.levelDotText}>{p.level}</Text>
              </View>
              <Text style={[styles.cardNum, { color: theme.textMuted }]}>#{p.number}</Text>
              <Text style={[styles.cardHex, { color: theme.textSecondary }]}>{p.hexagramName}</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{p.title}</Text>
            {p.content.split('\n').map((line, i) => (
              <Text key={i} style={[styles.poemLine, { color: theme.textSecondary }]}>{line}</Text>
            ))}
            {expandedId === p.id && (
              <View style={styles.expandedContent}>
                <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>{p.vernacular}</Text>
                <Text style={[styles.storyText, { color: theme.textMuted }]}>{p.story}</Text>
              </View>
            )}
            {expandedId === poem.id && (
              <TouchableOpacity
                style={[styles.drawBtn, { borderColor: theme.gold }]}
                onPress={() => router.push('/draw')}
              >
                <Icon name="dice" size={16} color={theme.gold} />
                <Text style={[styles.drawBtnText, { color: theme.gold }]}> 以此卦占卜</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.expandHint, { color: theme.textMuted }]}>
              {expandedId === p.id ? '▲ 收起' : '▼ 展開詳情'}
            </Text>
          </TouchableOpacity>
        ); })}
        </View>
        {filtered.length === 0 && (
          <Text style={[styles.empty, { color: theme.textMuted }]}>找不到符合的籤詩</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1 },
  controls: { paddingHorizontal: Spacing.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backText: { fontSize: FontSize.body },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  // 控制列與內容網格同寬置中，否則寬螢幕上會一個貼左、一個置中
  searchInput: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.body, marginBottom: Spacing.sm,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  // 用固定 height 而非 maxHeight：水平 ScrollView 在 Web 上沒有明確高度時
  // 會塌陷成幾像素，等級篩選整排變成無法點擊的細線。
  filterRow: {
    height: 40, marginBottom: Spacing.sm, flexGrow: 0,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  filterContent: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: FontSize.caption, color: t.textMuted },
  count: {
    fontSize: 12, marginBottom: Spacing.sm,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  // 網格容器置中，讓多欄內容在寬螢幕上不貼左邊
  list: { paddingHorizontal: Spacing.md, paddingBottom: 40, alignItems: 'center' },
  // 限寬並置中；實際欄數由 useGrid 依量測到的容器寬度決定
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.sm, alignItems: 'flex-start',
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  card: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelDot: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  levelDotText: { fontSize: 11, fontWeight: '700', color: PaperSurface.onLevel },
  cardNum: { fontSize: FontSize.small, fontWeight: '600' },
  cardHex: { fontSize: FontSize.small },
  cardTitle: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 8 },
  poemLine: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 30, letterSpacing: 2 },
  expandedContent: { marginTop: Spacing.sm },
  divider: { height: 1, marginBottom: Spacing.sm },
  detailText: { fontSize: FontSize.small, lineHeight: 22, marginBottom: Spacing.sm },
  storyText: { fontSize: FontSize.caption, lineHeight: 20 },
  expandHint: { fontSize: 11, textAlign: 'center', marginTop: 6 },
  drawBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, paddingVertical: 8,
    marginTop: 8, gap: 4,
  },
  drawBtnText: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSize.body },
});
