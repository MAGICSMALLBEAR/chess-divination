// 統計儀表板
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { PIECE_CHINESE_NAMES } from '@/components/icons';
import TrendChart from '@/components/TrendChart';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getHistory, recordHasLevel, type DivinationRecord } from '@/services/storage';
import { startOfLocalWeek, startOfLocalMonth } from '@/services/date';
import {
  computeAccuracy, accuracyByLevel, accuracyByCategory,
  accuracyByBodyUse, accuracyByMovingLine, accuracyBySeason, accuracyByMode,
  accuracyBySpread,
  bestCategory, medianVerifyDelay, pendingVerification,
  type AccuracyBreakdown,
} from '@/services/verification';
import { POEM_LEVELS, getLevelColor } from '@/data/poems';
import { categoryLabel } from '@/services/i18n';
import { useI18n } from '@/hooks/useI18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, Layout } from '@/constants/theme';
import { SPREAD_LABEL_KEYS, type SpreadId } from '@/services/spreads';

/** 統計頁的模式短標，與上方總覽磚同一組字 */
const STATS_MODE_KEYS: Record<string, string> = {
  draw: 'stats.draw', board: 'stats.board', lingqi: 'stats.lingqi',
};

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useI18n();
  const [records, setRecords] = useState<DivinationRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const h = await getHistory();
    setRecords(h);
  }

  // 依日期篩選。
  //
  // 用日曆週期而非滾動視窗：舊寫法是 `now - timestamp < 7/30 天`，
  // 週一早上點「本週」會把上週三四的占卜算進來，與標籤講的不是同一件事。
  // 同時夾住未來的時間戳——時鐘偏移或手改過的備份會產生未來時間，
  // 滾動視窗的減法對它們永遠成立，那些記錄會賴在每一個區間裡。
  const filtered = (() => {
    const now = Date.now();
    if (dateFilter === 'all') return records;
    const start = (dateFilter === 'week' ? startOfLocalWeek() : startOfLocalMonth()).getTime();
    return records.filter(r => r.timestamp >= start && r.timestamp <= now);
  })();

  const total = filtered.length;
  const drawCount = filtered.filter(r => r.mode === 'draw').length;
  const boardCount = filtered.filter(r => r.mode === 'board').length;
  const lingqiCount = filtered.filter(r => r.mode === 'lingqi').length;
  const favCount = filtered.filter(r => r.isFavorited).length;

  // 棋子統計
  const typeCounts: Record<string, number> = {};
  // 迴圈變數不叫 t——會遮蔽 useI18n 的譯文函式
  filtered.forEach(r => r.drawnPieceTypes.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }));
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // 吉凶分佈。靈棋走《靈棋經》原典，原文未載吉凶等級，我們也不代為補寫——
  // 不濾掉的話會多出一條以空字串為名的長條。
  const levelCounts: Record<string, number> = {};
  filtered.filter(recordHasLevel).forEach(r => {
    levelCounts[r.poemLevel] = (levelCounts[r.poemLevel] || 0) + 1;
  });

  const maxLevel = Math.max(...Object.values(levelCounts), 1);

  // 占驗統計。分母只算已回填的記錄——把未驗的當成不準，
  // 應驗率會隨占卜次數單調下降，反映的是回填勤勞度而非準確度。
  const accuracy = React.useMemo(() => computeAccuracy(filtered), [filtered]);
  const byLevel = React.useMemo(() => accuracyByLevel(filtered), [filtered]);
  const byBodyUse = React.useMemo(() => accuracyByBodyUse(filtered), [filtered]);
  // 模式名沿用總覽磚的短標（抽棋／佈局／靈棋），讓上下兩處對得起來；
  // 分享卡與收藏卡各有自己的用字，故不共用一張鍵表
  const byMode = React.useMemo(
    () => accuracyByMode(filtered, key => t(STATS_MODE_KEYS[key] ?? key)), [filtered, t]);
  const byMovingLine = React.useMemo(
    () => accuracyByMovingLine(filtered, n => t('stats.movingLine', { n })), [filtered, t]);
  const bySeason = React.useMemo(
    () => accuracyBySeason(filtered, season => t(`stats.season${season}`)), [filtered, t]);
  // 類別標籤依語言而定，故 lang 必須是依賴之一，否則切換語言後仍是舊譯文
  const byCategory = React.useMemo(
    () => accuracyByCategory(filtered, categoryLabel), [filtered, lang]);
  const best = React.useMemo(
    () => bestCategory(filtered, undefined, categoryLabel), [filtered, lang]);
  const medianDelay = React.useMemo(() => medianVerifyDelay(filtered), [filtered]);
  const bySpread = React.useMemo(
    () => accuracyBySpread(filtered, id => t(SPREAD_LABEL_KEYS[id as SpreadId])), [filtered, t, lang]);
  // 提醒用未經日期篩選的完整清單：待回填的多半是較舊的記錄，
  // 若跟著「本週」篩選會整批消失，正好漏掉最該提醒的那些。
  const pending = React.useMemo(() => pendingVerification(records), [records]);

  /** 應驗率的色調：七成以上為吉、四成以下為凶 */
  function rateColor(rate: number) {
    if (rate >= 70) return theme.success;
    if (rate >= 40) return theme.warning;
    return theme.danger;
  }

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
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← {t('common.back')}</Text>
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
                {t(f === 'all' ? 'stats.filterAll' : f === 'week' ? 'stats.filterWeek' : 'stats.filterMonth')}
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
            <Text style={styles.statNum}>{lingqiCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('stats.lingqi')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={styles.statNum}>{favCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('stats.fav')}</Text>
          </View>
        </View>

        {/* 占驗總覽 */}
        <View style={[styles.accuracyCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.textGold }]}>▎{t('stats.journal')}</Text>

          {accuracy.rate === null ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {t('stats.journalEmpty')}
            </Text>
          ) : (
            <>
              <View style={styles.accuracyTop}>
                <View style={styles.rateBlock}>
                  <Text style={[styles.rateNum, { color: rateColor(accuracy.rate) }]}>
                    {accuracy.rate}
                    <Text style={[styles.ratePct, { color: theme.textMuted }]}>%</Text>
                  </Text>
                  <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>{t('stats.rate')}</Text>
                </View>

                <View style={styles.tallyBlock}>
                  {([
                    ['stats.tallyAccurate', accuracy.accurate, theme.success],
                    ['stats.tallyPartial', accuracy.partial, theme.warning],
                    ['stats.tallyInaccurate', accuracy.inaccurate, theme.danger],
                  ] as const).map(([labelKey, count, color]) => (
                    <View key={labelKey} style={styles.tallyRow}>
                      <View style={[styles.tallyDot, { backgroundColor: color }]} />
                      <Text style={[styles.tallyLabel, { color: theme.textSecondary }]}>{t(labelKey)}</Text>
                      <Text style={[styles.tallyCount, { color: theme.textPrimary }]}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={[styles.accuracyMeta, { color: theme.textMuted }]}>
                {t('stats.verifiedMeta', { v: accuracy.verified, u: accuracy.unverified })}
                {medianDelay !== null ? t('stats.medianDelay', { n: medianDelay }) : ''}
              </Text>

              {/* 部分應驗計半分，說明清楚以免使用者對不上數字 */}
              <Text style={[styles.accuracyNote, { color: theme.textMuted }]}>
                {t('stats.rateNote')}
              </Text>

              {best && (
                <View style={[styles.insight, { borderColor: theme.goldFaint, backgroundColor: theme.bgCard }]}>
                  <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                    {t('stats.insight', {
                      label: best.label,
                      n: best.stats.verified,
                      rate: best.stats.rate ?? 0,
                    })}
                  </Text>
                </View>
              )}
            </>
          )}

          {pending.length > 0 && (
            <Text style={[styles.pendingText, { color: theme.textMuted }]}>
              {t('stats.pending', { n: pending.length })}
            </Text>
          )}
        </View>

        {/* 趨勢圖表 */}
        <TrendChart data={trendData} title={t('stats.trend')} />

        {/* 吉凶分佈與棋子排行。寬螢幕並排，窄螢幕上下堆疊 */}
        <View testID="card-grid" style={styles.grid}>
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.textGold }]}>{t('stats.levelDist')}</Text>
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
        <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.sectionTitle, { color: theme.textGold }]}>{t('stats.topPieces')}</Text>
          {sortedTypes.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('stats.noData')}</Text>
          )}
          {sortedTypes.slice(0, 7).map(([type, count], i) => (
            <View key={type} style={styles.rankRow}>
              <Text style={[styles.rankNum, { color: theme.textGold }]}>#{i + 1}</Text>
              <Text style={[styles.rankType, { color: theme.textPrimary }]}>
                {PIECE_CHINESE_NAMES[type] ?? type}
              </Text>
              <Text style={[styles.rankCount, { color: theme.textMuted }]}>{t('stats.times', { n: count })}</Text>
            </View>
          ))}
        </View>

        {/* 應驗率分項。只在有回填資料時出現，空表格沒有閱讀價值 */}
        {byCategory.length > 0 && (
          <AccuracySection
            title={t('stats.byCategory')}
            testID="accuracy-by-category"
            rows={byCategory}
            theme={theme}
            styles={styles}
            // 依應驗率上色，凸顯自己在哪類問題上判得準
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        {byLevel.length > 0 && (
          <AccuracySection
            title={t('stats.byLevel')}
            testID="accuracy-by-level"
            rows={byLevel}
            theme={theme}
            styles={styles}
            // 依籤詩等級本身的色系上色，與吉凶分佈圖對得起來
            colorOf={row => getLevelColor(row.key)}
          />
        )}
        {byMode.length > 0 && (
          <AccuracySection
            title={t('stats.byMode')}
            testID="accuracy-by-mode"
            rows={byMode}
            theme={theme}
            styles={styles}
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        {bySpread.length > 0 && (
          <AccuracySection
            title={t('stats.bySpread')}
            testID="accuracy-by-spread"
            rows={bySpread}
            theme={theme}
            styles={styles}
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        {byBodyUse.length > 0 && (
          <AccuracySection
            title={t('stats.byBodyUse')}
            testID="accuracy-by-bodyuse"
            rows={byBodyUse}
            theme={theme}
            styles={styles}
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        {byMovingLine.length > 0 && (
          <AccuracySection
            title={t('stats.byMovingLine')}
            testID="accuracy-by-movingline"
            rows={byMovingLine}
            theme={theme}
            styles={styles}
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        {bySeason.length > 0 && (
          <AccuracySection
            title={t('stats.bySeason')}
            rows={bySeason}
            theme={theme}
            styles={styles}
            colorOf={row => rateColor(row.stats.rate ?? 0)}
          />
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 應驗率分項表。
 * 每列一個分組，長條寬度即為應驗率，右側標註已驗則數——
 * 只給百分比會讓「1 則全中 = 100%」和「20 則 100%」看起來一樣可信。
 */
function AccuracySection({ title, rows, theme, styles, colorOf, testID }: {
  title: string;
  rows: AccuracyBreakdown[];
  theme: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  colorOf: (row: AccuracyBreakdown) => string;
  /** 給 e2e 定位整節用；沒有它就只能靠 DOM 形狀猜，而那會隨排版改動而碎 */
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <Text style={[styles.sectionTitle, { color: theme.textGold }]}>{title}</Text>
      {rows.map(row => (
        <View key={row.key} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{row.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {
              width: `${row.stats.rate ?? 0}%`,
              backgroundColor: colorOf(row),
            }]} />
          </View>
          <Text style={[styles.ratePill, { color: theme.textPrimary }]}>
            {row.stats.rate}%
          </Text>
          <Text style={[styles.rateSample, { color: theme.textMuted }]}>
            /{row.stats.verified}
          </Text>
        </View>
      ))}
    </View>
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
  // flexBasis 320：寬到放得下兩張就並排均分，放不下自動換行成單欄
  section: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
    flexGrow: 1, flexBasis: 320,
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

  // ── 占驗簿 ──
  accuracyCard: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  accuracyTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.lg, marginBottom: Spacing.md,
  },
  rateBlock: { alignItems: 'center', minWidth: 96 },
  rateNum: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  ratePct: { fontSize: FontSize.body, fontWeight: '400' },
  rateLabel: { fontSize: FontSize.caption, marginTop: 2 },
  tallyBlock: { flex: 1, gap: 4 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tallyDot: { width: 8, height: 8, borderRadius: 4 },
  tallyLabel: { fontSize: FontSize.small, flex: 1 },
  tallyCount: { fontSize: FontSize.small, fontWeight: '700' },
  accuracyMeta: { fontSize: FontSize.caption, marginBottom: 4 },
  accuracyNote: { fontSize: FontSize.overline, lineHeight: 16 },
  insight: {
    borderWidth: 1, borderRadius: 10, padding: Spacing.sm, marginTop: Spacing.md,
  },
  insightText: { fontSize: FontSize.small, lineHeight: 20 },
  pendingText: { fontSize: FontSize.caption, marginTop: Spacing.md, lineHeight: 18 },
  // 應驗率列比吉凶分佈多兩欄（百分比 + 樣本數），沿用同一組 barRow/barTrack
  ratePill: { fontSize: FontSize.small, fontWeight: '700', width: 38, textAlign: 'right' },
  rateSample: { fontSize: FontSize.caption, width: 26 },
});
