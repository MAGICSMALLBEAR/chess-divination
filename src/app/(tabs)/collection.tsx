// 收藏與歷史記錄頁面
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import type { DivinationRecord, Folder } from '@/services/storage';
import { getHistory, getFavorites, removeHistory, toggleFavorite, getFolders, addFolder, deleteFolder, addToFolder } from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import { Spacing, FontSize } from '@/constants/theme';

type TabType = 'history' | 'favorites' | 'folders';

export default function CollectionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [tab, setTab] = useState<TabType>('history');
  const [history, setHistory] = useState<DivinationRecord[]>([]);
  const [favorites, setFavorites] = useState<DivinationRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const h = await getHistory();
    const f = await getFavorites();
    const fl = await getFolders();
    setHistory(h);
    setFavorites(f);
    setFolders(fl);
  }

  async function handleAddFolder() {
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName.trim());
    setNewFolderName('');
    setShowAddFolder(false);
    await loadData();
  }

  async function handleDeleteFolder(id: string) {
    Alert.alert('刪除資料夾', '確定要刪除嗎？記錄不會被刪除。', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: async () => { await deleteFolder(id); await loadData(); } },
    ]);
  }

  async function handleAddToFolder(recordId: string) {
    if (!selectedFolderId) return;
    await addToFolder(selectedFolderId, recordId);
    setSelectedFolderId(null);
    await loadData();
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const folderRecords = selectedFolder
    ? history.filter(r => selectedFolder.recordIds.includes(r.id))
    : [];

  const rawData = tab === 'history' ? history : favorites;
  const data = search.trim()
    ? rawData.filter(r => r.poemTitle.includes(search) || r.poemContent.includes(search) || r.drawnPieceChars.join('').includes(search))
    : rawData;

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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={styles.title}>{t('collection.title')}</Text>
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
        <TouchableOpacity
          style={[styles.tab, tab === 'folders' && styles.tabActive]}
          onPress={() => setTab('folders')}
        >
          <Text style={[styles.tabText, tab === 'folders' && styles.tabTextActive]}>
            資料夾 ({folders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 搜尋 */}
      <TextInput
        style={styles.searchInput}
        placeholder="搜尋籤詩內容..."
        placeholderTextColor="#8A7A60"
        value={search}
        onChangeText={setSearch}
      />

      {/* 資料夾管理 */}
      {tab === 'folders' && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* 新增資料夾 */}
          {showAddFolder ? (
            <View style={styles.addFolderRow}>
              <TextInput
                style={[styles.folderInput, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium, color: theme.textPrimary }]}
                placeholder="資料夾名稱"
                placeholderTextColor={theme.textMuted}
                value={newFolderName}
                onChangeText={setNewFolderName}
                autoFocus
              />
              <TouchableOpacity style={styles.folderBtn} onPress={handleAddFolder}>
                <Text style={{ color: theme.gold, fontWeight: '600' }}>新增</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddFolder(false)}>
                <Text style={{ color: theme.textMuted }}>取消</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.addFolderBtn, { borderColor: theme.bgMedium }]} onPress={() => setShowAddFolder(true)}>
              <Text style={{ color: theme.gold }}>＋ 新增資料夾</Text>
            </TouchableOpacity>
          )}

          {/* 資料夾列表 */}
          {folders.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyText}>尚無資料夾</Text>
              <Text style={styles.emptyHint}>建立資料夾來分類整理收藏</Text>
            </View>
          )}
          {folders.map(folder => (
            <View key={folder.id} style={[styles.folderCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
              <View style={styles.folderHeader}>
                <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
                <Text style={[styles.folderName, { color: theme.textPrimary }]}>{folder.name}</Text>
                <Text style={[styles.folderCount, { color: theme.textMuted }]}>{folder.recordIds.length} 筆</Text>
                <TouchableOpacity onPress={() => handleDeleteFolder(folder.id)}>
                  <Text style={{ color: '#E5746A', fontSize: 14 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
              {/* 資料夾內記錄預覽 */}
              {folder.recordIds.slice(0, 3).map(rid => {
                const rec = history.find(r => r.id === rid);
                if (!rec) return null;
                return (
                  <TouchableOpacity key={rid} style={styles.folderRecord}
                    onPress={() => router.push({ pathname: '/reveal', params: { recordId: rec.id, mode: rec.mode } })}>
                    <Text style={[styles.folderRecText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {rec.drawnPieceChars.join(' ')} · {rec.poemTitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* 歷史/收藏記錄列表 */}
      {tab !== 'folders' && (
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
      )}
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
  searchInput: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: '#1A1210', borderRadius: 10, borderWidth: 1, borderColor: '#3A2F25',
    paddingHorizontal: Spacing.md, paddingVertical: 8, fontSize: 14, color: '#F5EDE0',
  },
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
  // Folder styles
  addFolderBtn: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 10,
    padding: Spacing.md, alignItems: 'center',
  },
  addFolderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  folderInput: {
    flex: 1, borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  folderBtn: { paddingHorizontal: 8 },
  folderCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
  },
  folderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  folderDot: { width: 10, height: 10, borderRadius: 5 },
  folderName: { fontSize: FontSize.body, fontWeight: '600', flex: 1 },
  folderCount: { fontSize: FontSize.caption },
  folderRecord: {
    marginTop: 6, paddingLeft: 18, paddingVertical: 4,
  },
  folderRecText: { fontSize: FontSize.small },
});
