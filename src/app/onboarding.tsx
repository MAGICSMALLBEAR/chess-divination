// 首次引導頁面
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import { saveSettings } from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'dice', title: '歡迎來到象棋占卜',
    desc: '以棋問道，觀象知機。\n從古老的象棋智慧中，\n尋找人生的方向與啟發。' },
  { icon: 'chess-board', title: '雙重占卜模式',
    desc: '抽棋占卜：從32顆棋子中\n隨機抽取，快速獲得指引。\n\n棋盤佈局：親手擺放棋子，\n深入探索心中的疑問。' },
  { icon: 'scroll', title: '64首原創籤詩',
    desc: '每首籤詩對應易經64卦，\n融入象棋意象，\n七言絕句搭配全方位解讀。' },
  { icon: 'heart', title: '記錄與收藏',
    desc: '每次占卜結果都會自動儲存，\n方便回顧與反思。\n喜歡的結果可以加入收藏。' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const styles = useThemedStyles(makeStyles);

  async function handleFinish() {
    await saveSettings({ hasCompletedOnboarding: true });
    router.replace('/(tabs)');
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  }

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.container}>
        {/* 跳過按鈕 */}
        {currentStep < STEPS.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
            <Text style={styles.skipText}>跳過</Text>
          </TouchableOpacity>
        )}

        {/* 內容 */}
        <View style={styles.content}>
          <Icon name={step.icon} size={80} color={theme.gold} />
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.desc}>{step.desc}</Text>
        </View>

        {/* 進度指示器 */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>

        {/* 按鈕 */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            <Text style={styles.nextBtnText}>
              {currentStep < STEPS.length - 1 ? '下一步 →' : '開始占卜'}
            </Text>
            {currentStep === STEPS.length - 1 && (
              <Icon name="crystal-ball" size={18} color={theme.textInverse} />
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  container: {
    flex: 1, paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between', paddingVertical: Spacing.xxl,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  skipText: { fontSize: FontSize.small, color: t.textMuted },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  icon: { fontSize: 80, marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize.title, fontWeight: '700', color: t.textPrimary,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  desc: {
    fontSize: FontSize.body, color: t.textSecondary, textAlign: 'center',
    lineHeight: 28,
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginBottom: Spacing.lg,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: t.bgMedium,
  },
  dotActive: {
    backgroundColor: t.gold, width: 24,
  },
  nextBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: t.gold, paddingVertical: 16,
    borderRadius: 16, gap: 4,
  },
  nextBtnText: { fontSize: FontSize.body, fontWeight: '700', color: t.textInverse },
});
