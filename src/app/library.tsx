// 籤詩圖鑑 - 瀏覽全部 64 首籤詩
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { ALL_POEMS, getLevelColor, POEM_LEVELS } from '@/data/poems';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LibraryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        <View style={{ width: 60 }} />
      </View>

      {/* 搜尋 */}
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium, color: theme.textPrimary }]}
        placeholder="搜尋籤詩..."
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* 等級篩選 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !levelFilter && { borderColor: '#C9A96E' }]}
          onPress={() => setLevelFilter(null)}>
          <Text style={[styles.filterText, !levelFilter && { color: '#C9A96E' }]}>全部</Text>
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

      {/* 詩歌列表 */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map(poem => (
          <TouchableOpacity key={poem.id}
            style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
            onPress={() => setExpandedId(expandedId === poem.id ? null : poem.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.levelDot, { backgroundColor: getLevelColor(poem.level) }]}>
                <Text style={styles.levelDotText}>{poem.level}</Text>
              </View>
              <Text style={[styles.cardNum, { color: theme.textMuted }]}>#{poem.number}</Text>
              <Text style={[styles.cardHex, { color: theme.textSecondary }]}>{poem.hexagramName}</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{poem.title}</Text>
            {poem.content.split('\n').map((line, i) => (
              <Text key={i} style={[styles.poemLine, { color: theme.textSecondary }]}>{line}</Text>
            ))}
            {expandedId === poem.id && (
              <View style={styles.expandedContent}>
                <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>{poem.vernacular}</Text>
                <Text style={[styles.storyText, { color: theme.textMuted }]}>{poem.story}</Text>
              </View>
            )}
            <Text style={[styles.expandHint, { color: theme.textMuted }]}>
              {expandedId === poem.id ? '▲ 收起' : '▼ 展開詳情'}
            </Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <Text style={[styles.empty, { color: theme.textMuted }]}>找不到符合的籤詩</Text>
        )}
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
  searchInput: {
    marginHorizontal: Spacing.md, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.body, marginBottom: Spacing.sm,
  },
  filterRow: { maxHeight: 36, marginBottom: Spacing.sm },
  filterContent: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 12, color: '#8A7A60' },
  count: { fontSize: 12, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  card: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelDot: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  levelDotText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  cardNum: { fontSize: FontSize.small, fontWeight: '600' },
  cardHex: { fontSize: FontSize.small },
  cardTitle: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 8 },
  poemLine: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 30, letterSpacing: 2 },
  expandedContent: { marginTop: Spacing.sm },
  divider: { height: 1, marginBottom: Spacing.sm },
  detailText: { fontSize: FontSize.small, lineHeight: 22, marginBottom: Spacing.sm },
  storyText: { fontSize: FontSize.caption, lineHeight: 20 },
  expandHint: { fontSize: 11, textAlign: 'center', marginTop: 6 },
  empty: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSize.body },
});
