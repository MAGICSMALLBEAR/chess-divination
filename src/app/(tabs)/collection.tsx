// 收藏與歷史記錄頁面
// 支援左右滑動切換分頁（快捷手勢 Phase 6.2）
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, RefreshControl,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon, type IconName } from '@/components/icons';
import type { DivinationMode, DivinationRecord, Folder, OutcomeStatus } from '@/services/storage';
import { getHistory, getFavorites, removeHistory, toggleFavorite, getFolders, addFolder, deleteFolder, addToFolder, removeFromFolder, recordHasLevel } from '@/services/storage';
import { recordMatchesSearch, recordTitle } from '@/services/poemList';
import { recordLink } from '@/services/recordLink';
import { getLevelColor } from '@/data/poems';
import { confirmAction } from '@/services/dialog';
import { notify } from '@/services/dialog';
import { readableTextOn } from '@/services/contrast';
import { cancelVerificationReminder } from '@/services/notifications';
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

/**
 * 記錄卡上的占卜模式標示。寫成以 DivinationMode 為鍵的完整對照表而非三元式，
 * 是為了讓日後新增模式時由 tsc 指出這裡漏改——原本的
 * `mode === 'draw' ? 'dice' : 'chess-board'` 會把新模式默默歸成棋盤。
 */
const MODE_ICONS: Record<DivinationMode, IconName> = {
  draw: 'dice', board: 'chess-board', lingqi: 'lingqi',
};
const MODE_LABEL_KEYS: Record<DivinationMode, string> = {
  draw: 'collection.modeDraw', board: 'collection.modeBoard', lingqi: 'collection.modeLingqi',
};

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
  // 不用 useWindowDimensions：Expo 靜態匯出的 web 版它在 hydration 後
  // 仍回傳 0（連 resize 也不更新），分頁器會因此整組失效（見 useLayout.ts
  // 的記錄）。useLayout 的 width 已夾到 ≥320 且 web 端走 domWidth 訂閱。
  const { width: windowWidth } = useLayout();
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
    try {
      await loadData();
    } catch (e) {
      console.warn('重新整理失敗:', e);
      notify(t('error.saveFailed'), t('collection.loadFailed'));
    } finally {
      // 讀取失敗也不能讓 RefreshControl 的 spinner 永轉
      setRefreshing(false);
    }
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
    try {
      for (const id of selectedIds) {
        await removeHistory(id);
        // 記錄刪了，14 天後的占驗提醒也該跟著刪，否則會提醒使用者
        // 回填一筆已經不存在的占卜
        void cancelVerificationReminder(id);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadData();
    } catch (e) {
      // 儲存失敗（空間滿／儲存損毀）時使用者得知道刪除沒成功，
      // 而不是按了沒反應
      console.warn('批次刪除失敗:', e);
      notify(t('error.saveFailed'), t('collection.deleteFailed'));
    }
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
    try {
      await addFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
      await loadData();
    } catch (e) {
      console.warn('建立資料夾失敗:', e);
      notify(t('error.saveFailed'), t('collection.saveFailed'));
    }
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
    try {
      await deleteFolder(id);
      await loadData();
    } catch (e) {
      console.warn('刪除資料夾失敗:', e);
      notify(t('error.saveFailed'), t('collection.deleteFailed'));
    }
  }

  /**
   * 歸檔清單上點一個資料夾：不在其中就加入，已在其中就移出。
   *
   * 原本只有加入這一半——`removeFromFolder()` 早就寫好了（含墓碑與佇列），
   * 卻沒有任何呼叫端。使用者點錯資料夾之後唯一的退路是連整個資料夾一起刪，
   * 而那會把其他記錄的歸檔一併弄丟。
   */
  async function handleToggleFolder(recordId: string, folder: Folder) {
    const filed = folder.recordIds.includes(recordId);
    try {
      if (filed) await removeFromFolder(folder.id, recordId);
      else await addToFolder(folder.id, recordId);
      setPickingFolderFor(null);
      await loadData();
    } catch (e) {
      console.warn('歸檔失敗:', e);
      notify(t('error.saveFailed'), t('collection.saveFailed'));
    }
  }

  /**
   * 所有還存在的記錄，以 id 索引。
   *
   * 歷史與收藏都要算：收藏頁的卡片也能歸檔，而收藏是另一份清單——
   * 只查 history 的話，歷史被清掉但仍在收藏裡的記錄會在資料夾中憑空消失。
   */
  const recordsById = new Map([...history, ...favorites].map(r => [r.id, r]));

  /**
   * 資料夾裡「還指得到東西」的記錄。
   *
   * 筆數也走這裡而不是 `recordIds.length`：`removeHistory` 一直沒有把
   * 被刪的 id 從資料夾裡拿掉（已於同一輪修掉），既有使用者的資料夾裡
   * 仍留著一串指不到記錄的 id。照 `recordIds.length` 印，卡片會說「5 筆」
   * 而打開只有 1 筆——修了來源仍治不了已經存下的那些。
   */
  function recordsInFolder(folder: Folder): DivinationRecord[] {
    return folder.recordIds
      .map(id => recordsById.get(id))
      .filter((r): r is DivinationRecord => r !== undefined);
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const folderRecords = selectedFolder ? recordsInFolder(selectedFolder) : [];

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
  /**
   * 空狀態要說對「為什麼是空的」。
   *
   * 三個分頁原本一律說「你還沒有任何記錄」，但搜尋框在三個分頁都看得到：
   * 打了字而沒有命中，畫面就會告訴一個存了兩百筆的人他什麼都沒有，還附上
   * 「開始占卜後記錄將顯示於此」這種對他毫無用處的指示。資料夾詳細頁最明顯
   * ——標題那行還印著「5 筆」，下面同時寫著「這個資料夾還沒有記錄」。
   *
   * 圖鑑早就分得清楚（`library.notFound`），收藏頁沒有跟上：又一次
   * 「同一件事只做到一半的頁面」。
   */
  function renderEmpty(icon: IconName, titleKey: string, hintKey: string) {
    const searching = search.trim().length > 0;
    return (
      <View style={styles.empty} testID={searching ? 'collection-no-match' : 'collection-empty'}>
        <Icon name={icon} size={40} color={theme.textMuted} />
        <Text style={styles.emptyText}>{t(searching ? 'collection.noMatch' : titleKey)}</Text>
        <Text style={styles.emptyHint}>{t(searching ? 'collection.noMatchDesc' : hintKey)}</Text>
      </View>
    );
  }

  const historyData = sortAndFilter(history);
  const favoritesData = sortAndFilter(favorites);
  // 資料夾內容也走同一套排序與搜尋：搜尋框在三個分頁都看得到，
  // 打了字卻只有前兩頁會篩，等於搜尋在這一頁壞掉
  const folderRecordsData = sortAndFilter(folderRecords);
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
    try {
      await removeHistory(id);
      void cancelVerificationReminder(id);
      await loadData();
    } catch (e) {
      console.warn('刪除記錄失敗:', e);
      notify(t('error.saveFailed'), t('collection.deleteFailed'));
    }
  }

  async function handleToggleFav(record: DivinationRecord) {
    try {
      await toggleFavorite(record);
      await loadData();
    } catch (e) {
      console.warn('收藏切換失敗:', e);
      notify(t('error.saveFailed'), t('error.saveFavoriteFailed'));
    }
  }

  function handleView(record: DivinationRecord) {
    router.push(recordLink(record));
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
        {/* 靈棋記錄沒有棋子（十二子擲出的是卦目，不落子），整格省略——
            留著就是一個沒有字的圓角色塊，與 S44 的空等級標籤同一個毛病 */}
        {record.drawnPieceChars.length > 0 && (
          <View style={styles.cardLeft}>
            <View testID="record-pieces" style={styles.piecesMini}>
              <Text style={styles.piecesText}>
                {record.drawnPieceChars.join(' ')}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.cardCenter}>
          <View style={styles.cardHeader}>
            {/* 靈棋記錄沒有吉凶等級（《靈棋經》原典未載，我們也不代為補寫），
                整枚標籤省略——留著會是一格沒有字的色塊 */}
            {recordHasLevel(record) && (
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
            )}
            <View style={styles.modeRow}>
              <Icon name={MODE_ICONS[record.mode]} size={12} color={theme.textMuted} />
              <Text style={styles.modeLabel}> {t(MODE_LABEL_KEYS[record.mode])}</Text>
              {record.spreadId && record.spreadId !== 'free' && (
                <View style={styles.spreadChip}>
                  <Text style={styles.spreadChipText}>{t(SPREAD_LABEL_KEYS[record.spreadId])}</Text>
                </View>
              )}
            </View>
          </View>
          {/* 記錄存的是中文原題；與 reveal 頁一致，顯示時依目前語言翻譯 */}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {recordTitle(record)}
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
            accessibilityLabel={t('a11y.manageFolders')}
            hitSlop={ICON_HIT_SLOP}
            onPress={() => setPickingFolderFor(pickingFolderFor === record.id ? null : record.id)}>
            {/* 已歸檔的記錄用金色標出來：否則使用者無從得知這筆進過哪裡，
                也就不會想到可以再點開來移出 */}
            <Icon
              name="folder"
              size={18}
              color={folders.some(f => f.recordIds.includes(record.id)) ? theme.gold : theme.textMuted}
            />
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
            <Text style={[styles.folderPickTitle, { color: theme.textSecondary }]}>{t('collection.folderPick')}</Text>
            {folders.map(f => {
              const filed = f.recordIds.includes(record.id);
              return (
                <TouchableOpacity
                  key={f.id}
                  testID={`folder-pick-${f.id}-${record.id}`}
                  style={styles.folderPickItem}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filed }}
                  onPress={() => handleToggleFolder(record.id, f)}>
                  <View style={[styles.folderPickDot, { backgroundColor: f.color }]} />
                  <Text style={{ color: filed ? theme.textGold : theme.textPrimary, fontSize: 13 }}>{f.name}</Text>
                  {filed && <Icon name="check" size={12} color={theme.gold} />}
                </TouchableOpacity>
              );
            })}
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
            {historyData.length === 0 && renderEmpty('scroll', 'collection.noHistory', 'collection.noHistoryDesc')}
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
            {favoritesData.length === 0 && renderEmpty('scroll', 'collection.noFav', 'collection.noFavDesc')}
            <View testID="card-grid" style={styles.grid} onLayout={onGridLayout}>
              {favoritesData.map((record) => renderRecordCard(record))}
            </View>
          </ScrollView>
        </View>

        {/* 第 3 頁：資料夾。選中一個資料夾時整頁換成該資料夾的記錄清單 */}
        <View style={[styles.page, { width: windowWidth - Spacing.md * 2 }]}>
          {selectedFolder ? (
          <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.folderDetailHeader}>
              <TouchableOpacity
                testID="folder-back"
                accessibilityRole="button"
                hitSlop={ICON_HIT_SLOP}
                onPress={() => setSelectedFolderId(null)}>
                <Text style={[styles.folderBackText, { color: theme.textGold }]}>← {t('collection.backToFolders')}</Text>
              </TouchableOpacity>
              <View style={[styles.folderDot, { backgroundColor: selectedFolder.color }]} />
              <Text style={[styles.folderName, { color: theme.textPrimary }]} numberOfLines={1}>{selectedFolder.name}</Text>
              <Text style={[styles.folderCount, { color: theme.textMuted }]}>{t('collection.records', { n: folderRecords.length })}</Text>
            </View>
            {folderRecordsData.length === 0 && renderEmpty('folder', 'collection.folderEmpty', 'collection.folderEmptyDesc')}
            <View testID="folder-grid" style={styles.grid} onLayout={onGridLayout}>
              {folderRecordsData.map((record) => renderRecordCard(record))}
            </View>
          </ScrollView>
          ) : (
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
                {/* 標題列整條可按：卡片上只列得下三筆，第四筆之後原本沒有
                    任何地方到得了——資料夾看得到數字卻打不開 */}
                <View style={styles.folderHeader}>
                  <TouchableOpacity
                    testID={`folder-open-${folder.id}`}
                    style={styles.folderOpen}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.openFolder')}
                    onPress={() => setSelectedFolderId(folder.id)}>
                    <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
                    <Text style={[styles.folderName, { color: theme.textPrimary }]} numberOfLines={1}>{folder.name}</Text>
                    <Text style={[styles.folderCount, { color: theme.textMuted }]}>{t('collection.records', { n: recordsInFolder(folder).length })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.deleteFolder')}
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => handleDeleteFolder(folder.id)}>
                    <Icon name="trash" size={14} color={theme.textRed} />
                  </TouchableOpacity>
                </View>
                {recordsInFolder(folder).slice(0, 3).map(rec => {
                  const rid = rec.id;
                  return (
                    <TouchableOpacity key={rid} style={styles.folderRecord}
                      onPress={() => router.push(recordLink(rec))}>
                      <Text style={[styles.folderRecText, { color: theme.textSecondary }]} numberOfLines={1}>
                        {/* 靈棋沒有棋子，照原樣串會印成「 · 大通卦」的前導分隔點 */}
                        {[rec.drawnPieceChars.join(' '), recordTitle(rec)].filter(Boolean).join(' · ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {recordsInFolder(folder).length > 3 && (
                  <TouchableOpacity style={styles.folderRecord} onPress={() => setSelectedFolderId(folder.id)}>
                    <Text style={[styles.folderRecText, { color: theme.textMuted }]}>
                      {t('collection.moreRecords', { n: recordsInFolder(folder).length - 3 })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          )}
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
  // 資料夾詳細頁的頁首：返回 + 色點 + 名稱 + 筆數
  folderDetailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  folderBackText: { fontSize: FontSize.small },
  // 標題列的可按區塊：吃掉刪除鈕以外的全部寬度
  folderOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderRecord: {
    marginTop: 6, paddingLeft: 18, paddingVertical: 4,
  },
  folderRecText: { fontSize: FontSize.small },
});
