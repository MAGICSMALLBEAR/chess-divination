// 收藏與歷史記錄頁面
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import type { DivinationRecord, Folder } from '@/services/storage';
import { getHistory, getFavorites, removeHistory, toggleFavorite, getFolders, addFolder, deleteFolder, addToFolder } from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface, Layout } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';

type TabType = 'history' | 'favorites' | 'folders';

export default function CollectionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const [tab, setTab] = useState<TabType>('history');
  const [history, setHistory] = useState<DivinationRecord[]>([]);
  const [favorites, setFavorites] = useState<DivinationRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [pickingFolderFor, setPickingFolderFor] = useState<string | null>(null); // record id
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'best'>('newest');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  async function batchDelete() {
    Alert.alert('批量刪除', `確定要刪除 ${selectedIds.size} 筆記錄嗎？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: async () => {
        for (const id of selectedIds) await removeHistory(id);
        setSelectedIds(new Set());
        setSelectMode(false);
        await loadData();
      }},
    ]);
  }

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

  async function handleAddToFolder(recordId: string, folderId: string) {
    await addToFolder(folderId, recordId);
    setPickingFolderFor(null);
    await loadData();
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const folderRecords = selectedFolder
    ? history.filter(r => selectedFolder.recordIds.includes(r.id))
    : [];

  const levelRank: Record<string, number> = { '大吉': 5, '上吉': 4, '中吉': 3, '中平': 2, '下下': 1 };
  const rawData = (tab === 'history' ? history : favorites)
    .slice().sort((a, b) => {
      if (sortOrder === 'newest') return b.timestamp - a.timestamp;
      if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
      return (levelRank[b.poemLevel] || 0) - (levelRank[a.poemLevel] || 0);
    });
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

      {/* 排序 + 批量 */}
      {tab !== 'folders' && (
        <View style={styles.sortRow}>
          {(['newest', 'oldest', 'best'] as const).map(o => (
            <TouchableOpacity key={o}
              style={[styles.sortBtn, sortOrder === o && { borderColor: theme.gold }]}
              onPress={() => setSortOrder(o)}>
              <Text style={[styles.sortText, sortOrder === o && { color: theme.gold }]}>
                {o === 'newest' ? '最新' : o === 'oldest' ? '最早' : '最佳'}
              </Text>
            </TouchableOpacity>
          ))}
          {tab === 'history' && data.length > 0 && (
            <TouchableOpacity style={[styles.sortBtn, selectMode && { borderColor: theme.textRed }]}
              onPress={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>
              <Text style={[styles.sortText, selectMode && { color: theme.textRed }]}>
                {selectMode ? '取消選擇' : '批量刪除'}
              </Text>
            </TouchableOpacity>
          )}
          {selectMode && selectedIds.size > 0 && (
            <TouchableOpacity style={[styles.sortBtn, { borderColor: theme.textRed }]} onPress={batchDelete}>
              <Text style={[styles.sortText, { color: theme.textRed }]}>刪除({selectedIds.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 搜尋 */}
      <TextInput
        style={styles.searchInput}
        placeholder="搜尋籤詩內容..."
        placeholderTextColor={theme.textMuted}
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
              <Icon name="folder" size={40} color={theme.textMuted} />
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
                  <Icon name="trash" size={14} color={theme.textRed} />
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}>
        {data.length === 0 && (
          <View style={styles.empty}>
            <Icon name="scroll" size={40} color={theme.textMuted} />
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
            style={[styles.card, selectedIds.has(record.id) && { borderColor: theme.textRed }]}
            onPress={() => selectMode ? toggleSelect(record.id) : handleView(record)}
            activeOpacity={0.8}
          >
            {selectMode && (
              <View style={[styles.checkbox, selectedIds.has(record.id) && { backgroundColor: theme.textRed }]}>
                {selectedIds.has(record.id) && <Text style={{ color: PaperSurface.onLevel, fontSize: 12 }}>✓</Text>}
              </View>
            )}
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
                  { backgroundColor: record.poemLevel === '大吉' ? theme.gold : record.poemLevel === '上吉' ? theme.textRed : theme.textMuted },
                ]}>
                  <Text style={styles.levelMiniText}>{record.poemLevel}</Text>
                </View>
                <View style={styles.modeRow}>
                  <Icon name={record.mode === 'draw' ? 'dice' : 'chess-board'} size={12} color={theme.textMuted} />
                  <Text style={styles.modeLabel}> {record.mode === 'draw' ? '抽棋' : '佈局'}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {record.poemTitle}
              </Text>
              <Text style={styles.cardDate}>{formatDate(record.timestamp)}</Text>
            </View>
            <View style={styles.cardRight}>
              <TouchableOpacity onPress={() => setPickingFolderFor(pickingFolderFor === record.id ? null : record.id)}>
                <Icon name="folder" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleToggleFav(record)}>
                <Icon name={record.isFavorited ? 'heart-filled' : 'heart'} size={18} color={record.isFavorited ? theme.textRed : theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(record.id)}>
                <Icon name="trash" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {/* 資料夾選擇器 */}
            {pickingFolderFor === record.id && (
              <View style={styles.folderPicker}>
                <Text style={[styles.folderPickTitle, { color: theme.textSecondary }]}>加到資料夾：</Text>
                {folders.map(f => (
                  <TouchableOpacity key={f.id} style={styles.folderPickItem}
                    onPress={() => handleAddToFolder(record.id, f.id)}>
                    <View style={[styles.folderPickDot, { backgroundColor: f.color }]} />
                    <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
                {folders.length === 0 && (
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>尚無資料夾，請先建立</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  header: {
    alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: t.textPrimary },
  tabRow: {
    flexDirection: 'row', marginHorizontal: Spacing.md,
    backgroundColor: t.bgDark, borderRadius: 12, padding: 4,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: t.bgCard },
  tabText: { fontSize: FontSize.small, color: t.textMuted },
  tabTextActive: { color: t.textGold, fontWeight: '600' },
  sortRow: {
    flexDirection: 'row', gap: 6, marginHorizontal: Spacing.md, marginBottom: 8,
  },
  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  sortText: { fontSize: 12, color: t.textMuted },
  searchInput: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: t.bgDark, borderRadius: 10, borderWidth: 1, borderColor: t.bgMedium,
    paddingHorizontal: Spacing.md, paddingVertical: 8, fontSize: 14, color: t.textPrimary,
  },
  // 限寬並置中，避免在平板／桌面被撐成整個視窗寬而出現超長行寬
  scroll: {
    flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: 40,
    width: '100%', maxWidth: Layout.maxContent, alignSelf: 'center',
  },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.body, color: t.textSecondary, marginBottom: Spacing.sm },
  emptyHint: { fontSize: FontSize.small, color: t.textMuted, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.bgDark, borderRadius: 12,
    borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.textMuted,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  cardLeft: { marginRight: Spacing.sm },
  piecesMini: {
    backgroundColor: t.bgCard, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  piecesText: { fontSize: 18, fontWeight: '700', color: t.textGold, letterSpacing: 4 },
  cardCenter: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  levelMini: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelMiniText: { fontSize: 11, fontWeight: '700', color: PaperSurface.onLevel },
  modeRow: { flexDirection: 'row', alignItems: 'center' },
  modeLabel: { fontSize: 11, color: t.textMuted },
  cardTitle: { fontSize: FontSize.body, fontWeight: '600', color: t.textPrimary },
  cardDate: { fontSize: FontSize.caption, color: t.textMuted, marginTop: 2 },
  cardRight: { gap: Spacing.sm, alignItems: 'center' },
  favIcon: { fontSize: 22 },
  folderIcon: { fontSize: 18, marginBottom: 2 },
  folderPicker: {
    backgroundColor: t.bgCard, borderRadius: 8, padding: 8, marginTop: 4,
  },
  folderPickTitle: { fontSize: 11, marginBottom: 4 },
  folderPickItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4,
  },
  folderPickDot: { width: 8, height: 8, borderRadius: 4 },
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
