// 收藏與歷史記錄頁面
// 支援左右滑動切換分頁（快捷手勢 Phase 6.2）
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, RefreshControl,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import type { DivinationRecord, Folder, OutcomeStatus } from '@/services/storage';
import { getHistory, getFavorites, removeHistory, toggleFavorite, getFolders, addFolder, deleteFolder, addToFolder } from '@/services/storage';
import { localizedPoemTitle, recordMatchesSearch } from '@/services/poemList';
import { getLevelColor } from '@/data/poems';
import { confirmAction } from '@/services/dialog';
import { readableTextOn } from '@/services/contrast';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface, Layout } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import { useGrid } from '@/hooks/useGrid';
import { SPREAD_LABEL_KEYS } from '@/services/spreads';

type TabType = 'history' | 'favorites' | 'folders';
const TAB_ORDER: TabType[] = ['history', 'favorites', 'folders'];

/** 純圖示按鈕的觸控外擴。14–18pt 的圖示加上這圈約可達 44pt 建議值 */
const ICON_HIT_SLOP = { top: 13, bottom: 13, left: 13, right: 13 };

export default function CollectionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t, lang } = useI18n();

  /** 占驗三態的色調：應驗為吉、部分為平、未應驗為凶 */
  function outcomeColor(status: OutcomeStatus): string {
    if (status === 'accurate') return theme.success;
    if (status === 'partial') return theme.warning;
    return theme.danger;
  }

  const { onLayout: onGridLayout, cardWidth } = useGrid();
  const { width: windowWidth } = useWindowDimensions();
  const horizScrollRef = useRef<ScrollView>(null);
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
    const confirmed = await confirmAction({
      title: t('collection.batchDelete'),
      message: t('collection.confirmBatch', { n: selectedIds.size }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    for (const id of selectedIds) await removeHistory(id);
    setSelectedIds(new Set());
    setSelectMode(false);
    await loadData();
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
    const confirmed = await confirmAction({
      title: t('collection.deleteFolder'),
      message: t('collection.deleteFolderDesc'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    await deleteFolder(id);
    await loadData();
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
  function sortAndFilter(list: DivinationRecord[]): DivinationRecord[] {
    const sorted = list.slice().sort((a, b) => {
      if (sortOrder === 'newest') return b.timestamp - a.timestamp;
      if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
      return (levelRank[b.poemLevel] || 0) - (levelRank[a.poemLevel] || 0);
    });
    if (!search.trim()) return sorted;
    // 比對必須含「畫面上顯示的譯名」——卡片印的是 localizedPoemTitle，
    // 只比對記錄裡的中文原題會讓 en/ja 使用者搜什麼都沒有
    return sorted.filter(r => recordMatchesSearch(r, search, lang));
  }
  const historyData = sortAndFilter(history);
  const favoritesData = sortAndFilter(favorites);
  // 給排序/搜索欄用的 data（跟隨目前選中 tab）
  const data = tab === 'history' ? historyData : favoritesData;

  async function handleDelete(id: string) {
    const confirmed = await confirmAction({
      title: t('collection.confirmOne'),
      message: t('collection.confirmOneDesc'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    await removeHistory(id);
    await loadData();
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

  // 滑動手勢：偵測水平滾動結束時切換目前分頁
  const handleSwipeEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / windowWidth);
    if (idx >= 0 && idx < TAB_ORDER.length) {
      setTab(TAB_ORDER[idx]);
    }
  }, [windowWidth]);

  // 點擊標籤時同時滾動 pager
  // 參數不叫 t——會遮蔽 useI18n 的譯文函式
  const switchTab = useCallback((next: TabType) => {
    setTab(next);
    const idx = TAB_ORDER.indexOf(next);
    horizScrollRef.current?.scrollTo({ x: idx * windowWidth, animated: true });
  }, [windowWidth]);

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // 渲染單筆記錄卡片（供歷史與收藏分頁共用）
  function renderRecordCard(record: DivinationRecord) {
    return (
      <TouchableOpacity
        key={record.id}
        style={[
          styles.card,
          // 尚未量測或單欄時佔滿；多欄時以量測推得的卡片寬並排
          cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
          selectedIds.has(record.id) && { borderColor: theme.textRed },
        ]}
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
              // 同上：原本 中吉／中平／下下 三個等級共用 textMuted，
              // 清單掃過去分不出哪一筆比較好
              { backgroundColor: getLevelColor(record.poemLevel) },
            ]}>
              {/* 前景色由底色推得而非一律白字：中平那格是米黃底，配白字
                  只有約 1.9:1，這枚標籤才 11px，等於印了看不見的字 */}
              <Text style={[styles.levelMiniText, { color: readableTextOn(getLevelColor(record.poemLevel)) }]}>{record.poemLevel}</Text>
            </View>
            <View style={styles.modeRow}>
              <Icon name={record.mode === 'draw' ? 'dice' : 'chess-board'} size={12} color={theme.textMuted} />
              <Text style={styles.modeLabel}> {t(record.mode === 'draw' ? 'collection.modeDraw' : 'collection.modeBoard')}</Text>
              {record.spreadId && record.spreadId !== 'free' && (
                <View style={styles.spreadChip}>
                  <Text style={styles.spreadChipText}>{t(SPREAD_LABEL_KEYS[record.spreadId])}</Text>
                </View>
              )}
            </View>
          </View>
          {/* 記錄存的是中文原題；與 reveal 頁一致，顯示時依目前語言翻譯 */}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {localizedPoemTitle(record.poemId)}
          </Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardDate}>{formatDate(record.timestamp)}</Text>
            {/* 占驗結果。清單上只給一枚小點，讓使用者一眼看出哪些已驗、驗得如何 */}
            {record.outcome && (
              <View style={[styles.outcomeChip, { borderColor: outcomeColor(record.outcome.status) }]}>
                <Text style={[styles.outcomeChipText, { color: outcomeColor(record.outcome.status) }]}>
                  {t(`outcome.${record.outcome.status}`)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          {/* 三個純圖示按鈕：16–18pt 遠低於 44pt 建議值，且讀屏下只會被念成
              「按鈕」。hitSlop 撐開可按範圍而不動版面——三顆並排在卡片右側，
              放大實體尺寸會擠掉中間的籤詩標題。 */}
          <TouchableOpacity
            testID={`record-folder-${record.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.addToFolder')}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => setPickingFolderFor(pickingFolderFor === record.id ? null : record.id)}>
            <Icon name="folder" size={18} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`record-fav-${record.id}`}
            accessibilityRole="button"
            accessibilityLabel={t(record.isFavorited ? 'a11y.unfavoriteRecord' : 'a11y.favoriteRecord')}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => handleToggleFav(record)}>
            <Icon name={record.isFavorited ? 'heart-filled' : 'heart'} size={18} color={record.isFavorited ? theme.textRed : theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`record-delete-${record.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.deleteRecord')}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => handleDelete(record.id)}>
            <Icon name="trash" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        {pickingFolderFor === record.id && (
          <View style={styles.folderPicker}>
            <Text style={[styles.folderPickTitle, { color: theme.textSecondary }]}>{t('collection.addToFolder')}</Text>
            {folders.map(f => (
              <TouchableOpacity key={f.id} style={styles.folderPickItem}
                onPress={() => handleAddToFolder(record.id, f.id)}>
                <View style={[styles.folderPickDot, { backgroundColor: f.color }]} />
                <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{f.name}</Text>
              </TouchableOpacity>
            ))}
            {folders.length === 0 && (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('collection.noFolderYet')}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <View style={styles.header}>
        <Text style={styles.title}>{t('collection.title')}</Text>
      </View>

      {/* 控制列：分頁 / 排序 / 搜尋。統一包在有左右邊距的容器內 */}
      <View style={styles.controls}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => switchTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            {t('collection.history')} ({history.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'favorites' && styles.tabActive]}
          onPress={() => switchTab('favorites')}
        >
          <Text style={[styles.tabText, tab === 'favorites' && styles.tabTextActive]}>
            {t('collection.favorites')} ({favorites.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'folders' && styles.tabActive]}
          onPress={() => switchTab('folders')}
        >
          <Text style={[styles.tabText, tab === 'folders' && styles.tabTextActive]}>
            {t('collection.folders')} ({folders.length})
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
              <Text style={[styles.sortText, sortOrder === o && { color: theme.textGold }]}>
                {t(o === 'newest' ? 'collection.sortNewest' : o === 'oldest' ? 'collection.sortOldest' : 'collection.sortBest')}
              </Text>
            </TouchableOpacity>
          ))}
          {tab === 'history' && data.length > 0 && (
            <TouchableOpacity style={[styles.sortBtn, selectMode && { borderColor: theme.textRed }]}
              onPress={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>
              <Text style={[styles.sortText, selectMode && { color: theme.textRed }]}>
                {t(selectMode ? 'collection.deselect' : 'collection.batchDelete')}
              </Text>
            </TouchableOpacity>
          )}
          {selectMode && selectedIds.size > 0 && (
            <TouchableOpacity style={[styles.sortBtn, { borderColor: theme.textRed }]} onPress={batchDelete}>
              <Text style={[styles.sortText, { color: theme.textRed }]}>{t('common.delete')}({selectedIds.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 搜尋 */}
      <TextInput
        style={styles.searchInput}
        placeholder={t('collection.search')}
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      </View>

      {/* 水平滑動分頁器：左右滑動切換歷史/收藏/資料夾 */}
      <ScrollView
        ref={horizScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleSwipeEnd}
        scrollEventThrottle={16}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        {/* 第 1 頁：歷史記錄 */}
        <View style={[styles.page, { width: windowWidth - Spacing.md * 2 }]}>
          <ScrollView
            contentContainerStyle={styles.pageScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
          >
            {historyData.length === 0 && (
              <View style={styles.empty}>
                <Icon name="scroll" size={40} color={theme.textMuted} />
                <Text style={styles.emptyText}>{t('collection.noHistory')}</Text>
                <Text style={styles.emptyHint}>{t('collection.noHistoryDesc')}</Text>
              </View>
            )}
            <View testID="card-grid" style={styles.grid} onLayout={onGridLayout}>
              {historyData.map((record) => renderRecordCard(record))}
            </View>
          </ScrollView>
        </View>

        {/* 第 2 頁：我的收藏 */}
        <View style={[styles.page, { width: windowWidth - Spacing.md * 2 }]}>
          <ScrollView
            contentContainerStyle={styles.pageScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
          >
            {favoritesData.length === 0 && (
              <View style={styles.empty}>
                <Icon name="scroll" size={40} color={theme.textMuted} />
                <Text style={styles.emptyText}>{t('collection.noFav')}</Text>
                <Text style={styles.emptyHint}>{t('collection.noFavDesc')}</Text>
              </View>
            )}
            <View testID="card-grid" style={styles.grid} onLayout={onGridLayout}>
              {favoritesData.map((record) => renderRecordCard(record))}
            </View>
          </ScrollView>
        </View>

        {/* 第 3 頁：資料夾 */}
        <View style={[styles.page, { width: windowWidth - Spacing.md * 2 }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {showAddFolder ? (
              <View style={styles.addFolderRow}>
                <TextInput
                  style={[styles.folderInput, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium, color: theme.textPrimary }]}
                  placeholder={t('collection.folderName')}
                  placeholderTextColor={theme.textMuted}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  maxLength={20}
                  autoFocus
                />
                {/* 名稱為空時，handleAddFolder 只是 return——按鈕看起來壞掉。
                    改成明確的不可用狀態：按不下去，而且看得出按不下去 */}
                <TouchableOpacity
                  style={[styles.folderBtn, !newFolderName.trim() && styles.folderBtnDisabled]}
                  onPress={handleAddFolder}
                  disabled={!newFolderName.trim()}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !newFolderName.trim() }}
                >
                  <Text style={{ color: theme.textGold, fontWeight: '600' }}>{t('common.add')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAddFolder(false)}>
                  <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.addFolderBtn, { borderColor: theme.bgMedium }]} onPress={() => setShowAddFolder(true)}>
                <Text style={{ color: theme.textGold }}>＋ {t('collection.newFolder')}</Text>
              </TouchableOpacity>
            )}

            {folders.length === 0 && (
              <View style={styles.empty}>
                <Icon name="folder" size={40} color={theme.textMuted} />
                <Text style={styles.emptyText}>{t('collection.noFolders')}</Text>
                <Text style={styles.emptyHint}>{t('collection.noFoldersDesc')}</Text>
              </View>
            )}
            {folders.map(folder => (
              <View key={folder.id} style={[styles.folderCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
                <View style={styles.folderHeader}>
                  <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
                  <Text style={[styles.folderName, { color: theme.textPrimary }]}>{folder.name}</Text>
                  <Text style={[styles.folderCount, { color: theme.textMuted }]}>{t('collection.records', { n: folder.recordIds.length })}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.deleteFolder')}
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => handleDeleteFolder(folder.id)}>
                    <Icon name="trash" size={14} color={theme.textRed} />
                  </TouchableOpacity>
                </View>
                {folder.recordIds.slice(0, 3).map(rid => {
                  const rec = history.find(r => r.id === rid);
                  if (!rec) return null;
                  return (
                    <TouchableOpacity key={rid} style={styles.folderRecord}
                      onPress={() => router.push({ pathname: '/reveal', params: { recordId: rec.id, mode: rec.mode } })}>
                      <Text style={[styles.folderRecText, { color: theme.textSecondary }]} numberOfLines={1}>
                        {rec.drawnPieceChars.join(' ')} · {localizedPoemTitle(rec.poemId)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  controls: { paddingHorizontal: Spacing.md },
  header: {
    alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: t.textPrimary },
  // 控制列與內容網格同寬置中，否則寬螢幕上一個貼邊、一個置中
  tabRow: {
    flexDirection: 'row',
    backgroundColor: t.bgDark, borderRadius: 12, padding: 4,
    marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: t.bgCard },
  tabText: { fontSize: FontSize.small, color: t.textMuted },
  tabTextActive: { color: t.textGold, fontWeight: '600' },
  sortRow: {
    flexDirection: 'row', gap: 6, marginBottom: 8,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  sortText: { fontSize: 12, color: t.textMuted },
  searchInput: {
    marginBottom: Spacing.sm,
    // 底色與邊框拉高對比：原本 bgDark 配 bgMedium 在墨色背景上幾乎看不見輸入框
    backgroundColor: t.bgCard, borderRadius: 10, borderWidth: 1, borderColor: t.goldFaint,
    paddingHorizontal: Spacing.md, paddingVertical: 8, fontSize: 14, color: t.textPrimary,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  // 水平滑動分頁器
  pager: { flex: 1, marginHorizontal: Spacing.md },
  pagerContent: { flexGrow: 1 },
  page: { flex: 1 },
  // 網格容器置中，讓多欄內容在寬螢幕上不貼左邊
  pageScroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  // 限寬並置中；實際欄數由 useGrid 依量測到的容器寬度決定
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.sm, alignItems: 'flex-start',
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
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
    // 間距由 grid 的 gap 提供，此處不再設 marginBottom
    padding: Spacing.md,
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
  spreadChip: {
    marginLeft: 5, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 5, borderWidth: 1, borderColor: t.goldFaint, backgroundColor: t.goldSoft,
  },
  spreadChipText: { fontSize: 9, color: t.textGold, fontWeight: '600' },
  cardTitle: { fontSize: FontSize.body, fontWeight: '600', color: t.textPrimary },
  cardDate: { fontSize: FontSize.caption, color: t.textMuted, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  outcomeChip: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, marginTop: 2,
  },
  outcomeChipText: { fontSize: FontSize.overline, fontWeight: '700' },
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
  folderBtnDisabled: { opacity: 0.4 },
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
