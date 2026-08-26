// 成就徽章展示頁面
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGrid } from '@/hooks/useGrid';
import {
  getAchievements, getStreak, syncAchievements, type Achievement,
} from '@/services/achievements';
import { localizeAchievement } from '@/services/localize';
import { getHistory } from '@/services/storage';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, Layout } from '@/constants/theme';

export default function AchievementsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { onLayout, cardWidth } = useGrid();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalDraws, setTotalDraws] = useState(0);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    // 先補算再讀取——既有使用者的歷史記錄早已滿足多項條件，
    // 但因為過去從未有畫面呼叫檢查，那些成就一直沒被解鎖。
    await syncAchievements().catch(e => console.warn(t('achievement.checkFailed'), e));

    const [ach, strk, hist] = await Promise.all([
      getAchievements(), getStreak(), getHistory(),
    ]);
    setAchievements(ach);
    setStreak(strk);
    setTotalDraws(hist.length);
  }

  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  // 資料載入完成前 total 為 0，直接相除會短暫顯示 NaN%
  const pct = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  // 成就圖示從 emoji 字串 → IconName 的對映
  function achievementIcon(emoji: string): IconName {
    const map: Record<string, IconName> = {
      '🎲': 'dice', '🔮': 'crystal-ball', '👑': 'trophy',
      '♟️': 'chess-board', '❤️': 'heart', '🔥': 'flame',
      '☯️': 'refresh', '📜': 'scroll',
      '🔍': 'lightbulb', '📖': 'scroll',
    };
    return map[emoji] || 'star';
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('achievement.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 總覽卡片 */}
        <View style={[styles.overviewCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <View style={styles.overviewTitleRow}>
            <Icon name="trophy" size={18} color={theme.gold} />
            <Text style={[styles.overviewTitle, { color: theme.textGold }]}> {t('achievement.progress')}</Text>
          </View>
          <View style={styles.progressRow}>
            {/* 進度環 */}
            <View style={styles.progressRing}>
              <View style={[styles.ringBg, { borderColor: theme.bgMedium }]} />
              <View style={[styles.ringFill, {
                borderColor: theme.gold,
                // Simple arc simulation using percentage
              }]} />
              <Text style={[styles.ringText, { color: theme.textGold }]}>{pct}%</Text>
            </View>
            <View style={styles.overviewStats}>
              <Text style={[styles.statBig, { color: theme.textPrimary }]}>{unlocked}<Text style={[styles.statSmall, { color: theme.textMuted }]}>/{total}</Text></Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('achievement.unlocked')}</Text>
              <View style={styles.statExtraRow}>
                <Icon name="flame" size={14} color={theme.textMuted} />
                <Text style={[styles.statExtra, { color: theme.textMuted }]}> {t('achievement.streakDays', { n: streak })} · </Text>
                <Icon name="scroll" size={14} color={theme.textMuted} />
                <Text style={[styles.statExtra, { color: theme.textMuted }]}> {t('achievement.totalDraws', { n: totalDraws })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 成就列表。寬螢幕改為多欄，每張成就自成一卡 */}
        <View testID="card-grid" style={styles.grid} onLayout={onLayout}>
          {achievements.map(ach => { const a = localizeAchievement(ach); return (
            <View key={a.id} style={[
              styles.achRow,
              { backgroundColor: theme.bgDark, borderColor: theme.bgMedium },
              cardWidth === undefined ? { width: '100%' } : { width: cardWidth },
              a.unlocked && styles.achUnlocked,
            ]}>
              <View style={[styles.achIcon, !a.unlocked && { opacity: 0.3 }]}>
                <Icon name={achievementIcon(a.icon)} size={28} color={a.unlocked ? theme.gold : theme.textMuted} />
              </View>
              <View style={styles.achInfo}>
                <Text style={[styles.achTitle, { color: a.unlocked ? theme.textPrimary : theme.textMuted }]}>
                  {a.title}
                </Text>
                <Text style={[styles.achDesc, { color: theme.textMuted }]}>
                  {a.desc}
                </Text>
              </View>
              <View style={[styles.achStatus, a.unlocked && { backgroundColor: theme.gold + '30' }]}>
                <Icon name={a.unlocked ? 'check' : 'lock'} size={14} color={a.unlocked ? theme.gold : theme.textMuted} />
              </View>
            </View>
          ); })}
        </View>

        {/* 回到首頁 */}
        <TouchableOpacity style={[styles.homeBtn, { borderColor: theme.bgMedium }]}
          onPress={() => router.replace('/(tabs)')}>
          <Icon name="home" size={16} color={theme.textSecondary} />
          <Text style={[styles.homeBtnText, { color: theme.textSecondary }]}> {t('reveal.home')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  overviewCard: {
    borderRadius: 16, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md,
    alignItems: 'center',
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  overviewTitle: { fontSize: FontSize.body, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  progressRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 4,
  },
  ringFill: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderTopColor: 'transparent', borderRightColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  ringText: { fontSize: 20, fontWeight: '900' },
  overviewStats: {},
  statBig: { fontSize: FontSize.subtitle, fontWeight: '900' },
  statSmall: { fontSize: FontSize.body, fontWeight: '400' },
  statLabel: { fontSize: FontSize.small, marginTop: 2 },
  statExtraRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statExtra: { fontSize: FontSize.caption },
  // 網格容器：限寬置中，欄數由 useGrid 依量測到的容器寬度決定
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    alignItems: 'flex-start', alignSelf: 'center',
    width: '100%', maxWidth: Layout.maxGrid, marginBottom: Spacing.md,
  },
  achRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: 12, borderWidth: 1,
  },
  achUnlocked: { backgroundColor: t.goldSoft },
  achIcon: { width: 44, alignItems: 'center' },
  achEmoji: { fontSize: 28 },
  achInfo: { flex: 1, marginLeft: Spacing.sm },
  achTitle: { fontSize: FontSize.body, fontWeight: '600' },
  achDesc: { fontSize: FontSize.small, marginTop: 2 },
  achStatus: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  achStatusText: { fontSize: 16, fontWeight: '700' },
  homeBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, gap: 4,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  homeBtnText: { fontSize: FontSize.body },
});
