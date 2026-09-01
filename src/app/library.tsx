// 占卜圖鑑 — 六十四籤詩與《靈棋經》125 卦目，分兩個分頁
//
// 為什麼靈棋另開分頁而不是併進同一份清單：兩者的欄位對不起來。籤詩有
// 吉凶等級與卦名（等級與五行篩選都建立在這上面），靈棋原典沒有等級，
// 有的是三才卦目與方位。混成一份清單，篩選列會對一半的資料失效。
import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import { ALL_POEMS, getLevelColor, POEM_LEVELS } from '@/data/poems';
import { LINGQI_ORACLES, type LingqiOracle } from '@/data/lingqiOracles';
import { localizePoem } from '@/services/localize';
import { poemMatchesSearch, lingqiMatchesSearch } from '@/services/poemList';
import { readableTextOn } from '@/services/contrast';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGrid } from '@/hooks/useGrid';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, PaperSurface, Layout } from '@/constants/theme';
import { parseHexagramName, TRIGRAM_ELEMENTS } from '@/services/hexagram';

/** 圖鑑的兩個分頁：六十四籤詩、《靈棋經》125 卦目 */
type LibraryTab = 'poems' | 'lingqi';

/**
 * 卡片在座標表裡的鍵。兩個分頁共用一張表，故加前綴避免
 * 籤詩 #1 與靈棋某卦互相蓋掉對方的位置。
 */
function cardKey(id: number | string): string {
  return typeof id === 'number' ? `p:${id}` : `l:${id}`;
}

export default function LibraryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useI18n();
  const { onLayout, cardWidth } = useGrid();
  const [tab, setTab] = useState<LibraryTab>('poems');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [elementFilter, setElementFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  /**
   * 每張卡片在網格內的 y 座標，由 onLayout 填入（見 handleRandomScroll）。
   * 鍵是帶前綴的字串而非籤詩 id：兩個分頁的卡片共用這一份座標表，
   * 而靈棋的識別是 `上-中-下` 卦目鍵值，與籤詩編號不同型。
   */
  const cardOffsets = useRef(new Map<string, number>());

  /**
   * 隨機展開一首籤詩，並捲到它的位置。
   *
   * 原本只設 expandedId 就結束了——函式名字裡的 Scroll 從來沒有發生。
   * 64 張卡片裡隨機挑一張，多半落在畫面外，使用者按了骰子看不到任何
   * 變化，只會以為按鈕壞了。
   *
   * 卡片高度不一（籤詩行數不同）且多欄時並排，算不出可靠的位置，
   * 所以改在卡片的 onLayout 記下實際 y 座標再捲過去。
   */
  function handleRandomScroll() {
    // 隨機的對象是「目前這個分頁上看得到的東西」——在靈棋分頁按骰子卻
    // 展開一首籤詩，等於這顆按鈕在半數情況下答非所問
    const pool: (string | undefined)[] = tab === 'poems'
      ? filtered.map(p => cardKey(p.id))
      : lingqiFiltered.map(o => cardKey(o.key));
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (!picked) return;

    if (tab === 'poems') {
      setExpandedId(Number(picked.slice(2)));
    } else {
      setExpandedKey(picked.slice(2));
    }

    const y = cardOffsets.current.get(picked);
    if (y !== undefined) {
      // 留一點上緣空隙，讓卡片不會緊貼著篩選列
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }

  /** 切分頁時收起展開中的卡片：另一個分頁的展開狀態留著只會在切回來時突然出現 */
  function switchTab(next: LibraryTab) {
    if (next === tab) return;
    setTab(next);
    setExpandedId(null);
    setExpandedKey(null);
  }

  const filtered = useMemo(() => {
    let poems = ALL_POEMS;
    if (levelFilter) poems = poems.filter(p => p.level === levelFilter);
    if (elementFilter) poems = poems.filter(p => {
      const trigrams = parseHexagramName(p.hexagramName);
      return !!trigrams && trigrams.some(index => TRIGRAM_ELEMENTS[index] === elementFilter);
    });
    // 搜尋比對的是 localizePoem 之後、卡片上實際顯示的字（見 poemList.ts），
    // 否則 en/ja 介面下輸入螢幕上看得到的字永遠零結果
    const q = search.trim();
    if (q) poems = poems.filter(p => poemMatchesSearch(p, q, lang));
    return poems;
    // lang 列入相依：切換語言後篩選結果必須跟著重算
  }, [search, levelFilter, elementFilter, lang]);

  // 靈棋不吃等級與五行篩選：原典沒有等級，卦目也不對應八卦五行。
  // 搜尋不帶 lang——原典三語都顯示漢字原文（見 lingqiMatchesSearch）
  const lingqiFiltered = useMemo(() => {
    const q = search.trim();
    return q ? LINGQI_ORACLES.filter(o => lingqiMatchesSearch(o, q)) : LINGQI_ORACLES;
  }, [search]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('library.title')}</Text>
        <TouchableOpacity
          testID="library-random"
          accessibilityRole="button"
          accessibilityLabel={t('a11y.randomPoem')}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
          onPress={handleRandomScroll}>
          <Icon name="dice" size={22} color={theme.gold} />
        </TouchableOpacity>
      </View>

      {/* 搜尋與篩選。包在限寬容器內，與下方內容網格對齊 */}
      <View style={styles.controls}>
      <View testID="library-tabs" style={styles.tabRow}>
        {(['poems', 'lingqi'] as const).map(id => (
          <TouchableOpacity
            key={id}
            testID={`library-tab-${id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            style={[styles.tabChip, tab === id && { borderColor: theme.gold, backgroundColor: theme.bgDark }]}
            onPress={() => switchTab(id)}>
            <Icon
              name={id === 'poems' ? 'scroll' : 'lingqi'}
              size={14}
              color={tab === id ? theme.gold : theme.textMuted}
            />
            <Text style={[styles.tabText, tab === id && { color: theme.textGold }]}>
              {' '}{t(id === 'poems' ? 'library.tabPoems' : 'library.tabLingqi')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.bgCard, borderColor: theme.goldFaint, color: theme.textPrimary }]}
        placeholder={t(tab === 'poems' ? 'library.search' : 'library.searchLingqi')}
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* 等級與五行篩選只給籤詩：靈棋原典沒有吉凶等級，卦目也不對應八卦五行 */}
      {tab === 'poems' && <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !levelFilter && { borderColor: theme.gold }]}
          onPress={() => setLevelFilter(null)}>
          <Text style={[styles.filterText, !levelFilter && { color: theme.textGold }]}>{t('library.all')}</Text>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>{t('library.element')}</Text>
        {[...new Set(TRIGRAM_ELEMENTS)].map(element => (
          <TouchableOpacity key={element} style={[styles.filterChip, elementFilter === element && { borderColor: theme.gold }]} onPress={() => setElementFilter(element === elementFilter ? null : element)}>
            <Text style={[styles.filterText, elementFilter === element && { color: theme.textGold }]}>{element}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      </>}

      <Text testID="library-count" style={[styles.count, { color: theme.textMuted }]}>
        {tab === 'poems'
          ? t('library.count', { n: filtered.length })
          : t('library.countLingqi', { n: lingqiFiltered.length })}
      </Text>
      </View>

      {/* 詩歌列表。寬螢幕改為多欄網格，避免卡片被撐成整個視窗寬 */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View testID="card-grid" style={styles.grid} onLayout={onLayout}>
        {tab === 'poems' && filtered.map(poem => { const p = localizePoem(poem); return (
          <TouchableOpacity key={p.id}
            style={[
              styles.card,
              { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
              // 單欄時佔滿容器；多欄時以計算出的卡片寬並排
              cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
            ]}
            onPress={() => setExpandedId(expandedId === p.id ? null : p.id)}
            onLayout={e => cardOffsets.current.set(cardKey(p.id), e.nativeEvent.layout.y)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.levelDot, { backgroundColor: getLevelColor(p.level) }]}>
                {/* 與收藏頁同理：一律白字在米黃／灰褐底上讀不出來 */}
                <Text style={[styles.levelDotText, { color: readableTextOn(getLevelColor(p.level)) }]}>{p.level}</Text>
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
                <Text style={[styles.drawBtnText, { color: theme.textGold }]}> {t('library.divineWith')}</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.expandHint, { color: theme.textMuted }]}>
              {expandedId === p.id ? `▲ ${t('library.collapse')}` : `▼ ${t('library.expand')}`}
            </Text>
          </TouchableOpacity>
        ); })}

        {tab === 'lingqi' && lingqiFiltered.map(oracle => (
          <LingqiCard
            key={oracle.key}
            oracle={oracle}
            expanded={expandedKey === oracle.key}
            onPress={() => setExpandedKey(expandedKey === oracle.key ? null : oracle.key)}
            onLayout={y => cardOffsets.current.set(cardKey(oracle.key), y)}
            onDivine={() => router.push('/lingqi')}
            width={cardWidth}
            theme={theme}
            styles={styles}
            t={t}
          />
        ))}
        </View>
        {(tab === 'poems' ? filtered.length : lingqiFiltered.length) === 0 && (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            {t(tab === 'poems' ? 'library.notFound' : 'library.notFoundLingqi')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 一張靈棋卦目卡。
 *
 * 收合時只印卦目、象與詩曰——與籤詩卡的資訊密度對齊（等級／編號／卦名
 * ＋詩句）。展開後才給斷、方位、象曰與原典附的第二首，避免 125 張卡片
 * 一次把整本《靈棋經》倒在畫面上。
 *
 * 卦名、卦目、象曰、詩曰一律漢字原文，三語皆然——原典逐字保留不翻譯，
 * 理由見 data/lingqiOracles.ts 的檔頭。此處只有標籤走 t()。
 */
function LingqiCard({ oracle, expanded, onPress, onLayout, onDivine, width, theme, styles, t }: {
  oracle: LingqiOracle;
  expanded: boolean;
  onPress: () => void;
  onLayout: (y: number) => void;
  onDivine: () => void;
  width: number | undefined;
  theme: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <TouchableOpacity
      testID="lingqi-card"
      style={[
        styles.card,
        { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
        width === undefined ? { width: '100%' } : { width },
      ]}
      onPress={onPress}
      onLayout={e => onLayout(e.nativeEvent.layout.y)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardNum, { color: theme.textMuted }]}>{oracle.notation}</Text>
        <Text style={[styles.cardHex, { color: theme.textSecondary }]}>{oracle.image}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{oracle.name}</Text>
      {oracle.shi.map((line, i) => (
        <Text key={i} style={[styles.poemLine, { color: theme.textSecondary }]}>{line}</Text>
      ))}

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
          {/* 純陰饅一卦的斷與方位在原典中從缺，不補寫 */}
          {oracle.stance ? (
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {oracle.stance}　{oracle.direction}
            </Text>
          ) : null}
          <LibraryVerse label={t('lingqi.xiang')} lines={oracle.xiang} theme={theme} styles={styles} />
          {oracle.xiangAlt.length > 0 && (
            <LibraryVerse label={t('lingqi.xiangAlt')} lines={oracle.xiangAlt} theme={theme} styles={styles} />
          )}
          {oracle.shiAlt.length > 0 && (
            <LibraryVerse label={t('lingqi.shiAlt')} lines={oracle.shiAlt} theme={theme} styles={styles} />
          )}
          <Text style={[styles.storyText, { color: theme.textMuted }]}>{t('lingqi.source')}</Text>
          <TouchableOpacity style={[styles.drawBtn, { borderColor: theme.gold }]} onPress={onDivine}>
            <Icon name="lingqi" size={16} color={theme.gold} />
            <Text style={[styles.drawBtnText, { color: theme.textGold }]}> {t('library.divineWithLingqi')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.expandHint, { color: theme.textMuted }]}>
        {expanded ? `▲ ${t('library.collapse')}` : `▼ ${t('library.expand')}`}
      </Text>
    </TouchableOpacity>
  );
}

/** 卦辭一段：標籤加逐行原文。與靈棋頁的 Verse 同型，樣式取自圖鑑卡片 */
function LibraryVerse({ label, lines, theme, styles }: {
  label: string;
  lines: string[];
  theme: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.verseBlock}>
      <Text style={[styles.verseLabel, { color: theme.textGold }]}>{label}</Text>
      {lines.map((line, i) => (
        <Text key={i} style={[styles.verseLine, { color: theme.textSecondary }]}>{line}</Text>
      ))}
    </View>
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
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.sm,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  tabChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  tabText: { fontSize: FontSize.small, fontWeight: '600', color: t.textMuted },
  verseBlock: { marginBottom: Spacing.sm },
  verseLabel: { fontSize: FontSize.caption, fontWeight: '700', marginBottom: 2 },
  verseLine: { fontSize: FontSize.small, lineHeight: 24, letterSpacing: 1 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: FontSize.caption, color: t.textMuted },
  filterLabel: { fontSize: FontSize.caption, fontWeight: '600' },
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
