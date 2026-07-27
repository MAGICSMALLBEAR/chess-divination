// 籤詩展示頁面 — 完整解讀
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ShareCardView, { type ShareCardHandle } from '@/components/ShareCardView';
import type { DivinationRecord } from '@/services/storage';
import { getHistory, toggleFavorite } from '@/services/storage';
import { getPoemById, getLevelColor, type JieYue } from '@/data/poems';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES: { key: keyof JieYue; label: string; icon: string }[] = [
  { key: 'general', label: '綜合', icon: '🔮' },
  { key: 'marriage', label: '感情', icon: '💕' },
  { key: 'career', label: '事業', icon: '💼' },
  { key: 'wealth', label: '財運', icon: '💰' },
  { key: 'health', label: '健康', icon: '💪' },
  { key: 'study', label: '學業', icon: '📚' },
  { key: 'travel', label: '出行', icon: '✈️' },
];

export default function RevealScreen() {
  const router = useRouter();
  const { recordId, mode } = useLocalSearchParams<{ recordId: string; mode: string }>();
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [expandedCat, setExpandedCat] = useState<keyof JieYue>('general');
  const [revealed, setRevealed] = useState(false);
  const shareRef = useRef<ShareCardHandle>(null);

  useEffect(() => {
    loadRecord();
    // Trigger reveal animation
    const timer = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(timer);
  }, [recordId]);

  async function loadRecord() {
    const history = await getHistory();
    const found = history.find(r => r.id === recordId);
    if (found) {
      setRecord(found);
      setIsFav(found.isFavorited);
    }
  }

  async function handleToggleFavorite() {
    if (!record) return;
    const result = await toggleFavorite(record);
    setIsFav(result);
    await loadRecord();
  }

  function handleShare() {
    shareRef.current?.share();
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
      <SafeAreaView style={styles.safe}>
        <InkBackground />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load full poem data
  const poem = getPoemById(record.poemId);
  const levelColor = getLevelColor(poem.level);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>占卜結果</Text>
          <View style={styles.backBtn} />
        </View>

        {/* 抽到的棋子 */}
        <View style={styles.piecesRow}>
          {record.drawnPieceChars.map((char, i) => (
            <View key={i} style={styles.pieceDisplay}>
              <Text style={[
                styles.pieceChar,
                { color: record.drawnPieceColors[i] === 'red' ? '#C0392B' : '#1A1210' },
              ]}>
                {char}
              </Text>
            </View>
          ))}
        </View>

        {/* 吉凶等級 */}
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>{poem.level}</Text>
        </View>

        {/* 卦名 */}
        <Text style={styles.hexagramName}>
          第{poem.number}籤 · {poem.hexagramName}
        </Text>

        {/* 籤題 */}
        <Text style={styles.poemTitle}>{poem.title}</Text>

        {/* 籤詩本文 */}
        <View style={styles.poemBox}>
          {poem.content.split('\n').map((line, i) => (
            <Text key={i} style={[
              styles.poemLine,
              {
                opacity: revealed ? 1 : 0,
                transform: [{ translateY: revealed ? 0 : 15 }],
              },
            ]}>
              {line}
            </Text>
          ))}
        </View>

        {/* 裝飾線 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>✦</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 白話解釋 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>▎白話解釋</Text>
          <Text style={styles.bodyText}>{poem.vernacular}</Text>
        </View>

        {/* 典故 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>▎典故參考</Text>
          <Text style={styles.bodyText}>{poem.story}</Text>
        </View>

        {/* 各面向詳解 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>▎各面向詳解</Text>
          {/* 分類選擇 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.catScroll} contentContainerStyle={styles.catContent}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.catTab,
                  expandedCat === cat.key && styles.catTabActive,
                ]}
                onPress={() => setExpandedCat(cat.key)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.catLabel,
                  expandedCat === cat.key && styles.catLabelActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* 解讀內容 */}
          <View style={styles.catContentBox}>
            <Text style={styles.bodyText}>{poem.jieYue[expandedCat]}</Text>
          </View>
        </View>

        {/* 操作按鈕 */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.favBtn} onPress={handleToggleFavorite}>
            <Text style={styles.favBtnText}>
              {isFav ? '❤️ 已收藏' : '🤍 收藏'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 分享</Text>
          </TouchableOpacity>
        </View>

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
  shareHidden: {
    position: 'absolute', top: -9999, left: -9999,
    opacity: 0, pointerEvents: 'none',
  },
});
