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
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

// 存譯文 key 而非文字：這個陣列在模組載入時就固定了，
// 存成文字會被凍結在當時的語言。
const STEPS: { icon: IconName; titleKey: string; descKey: string }[] = [
  { icon: 'dice', titleKey: 'onboarding.welcome', descKey: 'onboarding.step1desc' },
  { icon: 'chess-board', titleKey: 'onboarding.step2', descKey: 'onboarding.step2desc' },
  { icon: 'scroll', titleKey: 'onboarding.step3', descKey: 'onboarding.step3desc' },
  { icon: 'heart', titleKey: 'onboarding.step4', descKey: 'onboarding.step4desc' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
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
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        )}

        {/* 內容 */}
        <View style={styles.content}>
          <Icon name={step.icon} size={80} color={theme.gold} />
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.desc}>{t(step.descKey)}</Text>
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
              {currentStep < STEPS.length - 1 ? `${t('onboarding.next')} →` : t('onboarding.start')}
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
