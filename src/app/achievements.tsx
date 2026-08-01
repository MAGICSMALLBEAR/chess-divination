// 成就徽章展示頁面
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getAchievements, getStreak, type Achievement } from '@/services/achievements';
import { getHistory } from '@/services/storage';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AchievementsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalDraws, setTotalDraws] = useState(0);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const [ach, strk, hist] = await Promise.all([
      getAchievements(), getStreak(), getHistory(),
    ]);
    setAchievements(ach);
    setStreak(strk);
    setTotalDraws(hist.length);
  }

  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const pct = Math.round((unlocked / total) * 100);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>成就徽章</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 總覽卡片 */}
        <View style={[styles.overviewCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.overviewTitle, { color: theme.gold }]}>🏆 成就進度</Text>
          <View style={styles.progressRow}>
            {/* 進度環 */}
            <View style={styles.progressRing}>
              <View style={[styles.ringBg, { borderColor: theme.bgMedium }]} />
              <View style={[styles.ringFill, {
                borderColor: theme.gold,
                // Simple arc simulation using percentage
              }]} />
              <Text style={[styles.ringText, { color: theme.gold }]}>{pct}%</Text>
            </View>
            <View style={styles.overviewStats}>
              <Text style={[styles.statBig, { color: theme.textPrimary }]}>{unlocked}<Text style={[styles.statSmall, { color: theme.textMuted }]}>/{total}</Text></Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>已解鎖</Text>
              <Text style={[styles.statExtra, { color: theme.textMuted }]}>🔥 連續 {streak} 天 · 📜 {totalDraws} 次占卜</Text>
            </View>
          </View>
        </View>

        {/* 成就列表 */}
        <View style={[styles.listCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          {achievements.map(ach => (
            <View key={ach.id} style={[styles.achRow, ach.unlocked && styles.achUnlocked]}>
              <View style={[styles.achIcon, !ach.unlocked && { opacity: 0.3 }]}>
                <Text style={styles.achEmoji}>{ach.icon}</Text>
              </View>
              <View style={styles.achInfo}>
                <Text style={[styles.achTitle, { color: ach.unlocked ? theme.textPrimary : theme.textMuted }]}>
                  {ach.title}
                </Text>
                <Text style={[styles.achDesc, { color: theme.textMuted }]}>
                  {ach.desc}
                </Text>
              </View>
              <View style={[styles.achStatus, ach.unlocked && { backgroundColor: theme.gold + '30' }]}>
                <Text style={[styles.achStatusText, { color: ach.unlocked ? theme.gold : theme.textMuted }]}>
                  {ach.unlocked ? '✓' : '🔒'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 回到首頁 */}
        <TouchableOpacity style={[styles.homeBtn, { borderColor: theme.bgMedium }]}
          onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={[styles.homeBtnText, { color: theme.textSecondary }]}>🏠 回首頁</Text>
        </TouchableOpacity>
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
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  overviewCard: {
    borderRadius: 16, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md,
    alignItems: 'center',
  },
  overviewTitle: { fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.md },
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
  statExtra: { fontSize: FontSize.caption, marginTop: 6 },
  listCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md,
  },
  achRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#2A1F18',
  },
  achUnlocked: { backgroundColor: 'rgba(201,169,110,0.05)' },
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
    borderWidth: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  homeBtnText: { fontSize: FontSize.body },
});
