// 收藏與歷史記錄頁面
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import type { DivinationRecord } from '@/services/storage';
import { getHistory, getFavorites, removeHistory, toggleFavorite } from '@/services/storage';
import { Spacing, FontSize } from '@/constants/theme';

type TabType = 'history' | 'favorites';

export default function CollectionScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('history');
  const [history, setHistory] = useState<DivinationRecord[]>([]);
  const [favorites, setFavorites] = useState<DivinationRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const h = await getHistory();
    const f = await getFavorites();
    setHistory(h);
    setFavorites(f);
  }

  const data = tab === 'history' ? history : favorites;

  async function handleDelete(id: string) {
    Alert.alert('確認刪除', '確定要刪除此記錄嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: async () => {
          await removeHistory(id);
          await loadData();
        },
      },
    ]);
  }

  async function handleToggleFav(record: DivinationRecord) {
    await toggleFavorite(record);
    await loadData();
  }

  function handleView(record: DivinationRecord) {
    router.push({
      pathname: '/reveal',
      params: { recordId: record.id, mode: record.mode },
    });
  }

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={styles.title}>收藏記錄</Text>
      </View>

      {/* Tab 切換 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            歷史記錄 ({history.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'favorites' && styles.tabActive]}
          onPress={() => setTab('favorites')}
        >
          <Text style={[styles.tabText, tab === 'favorites' && styles.tabTextActive]}>
            我的收藏 ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {data.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyText}>
              {tab === 'history' ? '尚無占卜記錄' : '尚無收藏記錄'}
            </Text>
            <Text style={styles.emptyHint}>
              {tab === 'history' ? '開始占卜後記錄將顯示於此' : '在占卜結果中點擊收藏即可加入'}
            </Text>
          </View>
        )}

        {data.map((record) => (
          <TouchableOpacity
            key={record.id}
            style={styles.card}
            onPress={() => handleView(record)}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <View style={styles.piecesMini}>
                <Text style={styles.piecesText}>
                  {record.drawnPieceChars.join(' ')}
                </Text>
              </View>
            </View>
            <View style={styles.cardCenter}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.levelMini,
                  { backgroundColor: record.poemLevel === '大吉' ? '#C9A96E' : record.poemLevel === '上吉' ? '#E5746A' : '#8A7A60' },
                ]}>
                  <Text style={styles.levelMiniText}>{record.poemLevel}</Text>
                </View>
                <Text style={styles.modeLabel}>
                  {record.mode === 'draw' ? '🎲 抽棋' : '♟️ 佈局'}
                </Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {record.poemTitle}
              </Text>
              <Text style={styles.cardDate}>{formatDate(record.timestamp)}</Text>
            </View>
            <View style={styles.cardRight}>
              <TouchableOpacity onPress={() => handleToggleFav(record)}>
                <Text style={styles.favIcon}>
                  {record.isFavorited ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(record.id)}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0A08' },
  header: {
    alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: '#F5EDE0' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: Spacing.md,
    backgroundColor: '#1A1210', borderRadius: 12, padding: 4,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#231A14' },
  tabText: { fontSize: FontSize.small, color: '#8A7A60' },
  tabTextActive: { color: '#C9A96E', fontWeight: '600' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.body, color: '#C9B99A', marginBottom: Spacing.sm },
  emptyHint: { fontSize: FontSize.small, color: '#8A7A60', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1210', borderRadius: 12,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardLeft: { marginRight: Spacing.sm },
  piecesMini: {
    backgroundColor: '#231A14', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  piecesText: { fontSize: 18, fontWeight: '700', color: '#C9A96E', letterSpacing: 4 },
  cardCenter: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  levelMini: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelMiniText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  modeLabel: { fontSize: 11, color: '#8A7A60' },
  cardTitle: { fontSize: FontSize.body, fontWeight: '600', color: '#F5EDE0' },
  cardDate: { fontSize: FontSize.caption, color: '#8A7A60', marginTop: 2 },
  cardRight: { gap: Spacing.sm, alignItems: 'center' },
  favIcon: { fontSize: 22 },
  deleteIcon: { fontSize: 18 },
});
