// 水墨背景元件 v3
// Reanimated 4 遷移：粒子動畫從 JS 執行緒搬到 UI 執行緒，
// withRepeat / withSequence / withTiming 取代 legacy Animated.loop / Animated.timing。
// 漸層仍使用 expo-linear-gradient（原生元件，不在 Reanimated 範疇）。

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

const PARTICLE_COUNT = 15;

// ── 單一水墨粒子 ──
// 每個粒子獨立管理自己的 shared value 與動畫循環，
// 用 React.memo 避免不必要的 re-render。

interface ParticleProps {
  xRatio: number;
  yRatio: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  width: number;
  height: number;
  initOpacity: number;
}

const InkParticleView = React.memo(function InkParticleView({
  xRatio, yRatio, size, color, duration, delay, width, height, initOpacity,
}: ParticleProps) {
  const opacity = useSharedValue(initOpacity);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    backgroundColor: color,
    left: xRatio * width - size / 2,
    top: yRatio * height - size / 2,
    width: size,
    height: size,
    borderRadius: size / 2,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(Math.random() * 0.08 + 0.02, { duration }),
          withTiming(Math.random() * 0.06 + 0.01, { duration }),
        ),
        -1,
        true,
      );
      translateY.value = withRepeat(
        withSequence(
          withTiming(Math.random() * 40 - 20, { duration: duration * 1.5 }),
          withTiming(0, { duration: duration * 1.5 }),
        ),
        -1,
        true,
      );
    }, delay);

    return () => {
      clearTimeout(t);
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, []);

  return <Animated.View style={animStyle} />;
});

// ── 背景本體 ──

export default function InkBackground() {
  const { theme, isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => ({
      xRatio: Math.random(),
      yRatio: Math.random(),
      size: Math.random() * 120 + 40,
      duration: Math.random() * 15000 + 10000,
      delay: Math.random() * 5000,
      initOpacity: Math.random() * 0.08 + 0.02,
    }));
  }, []);

  const particleColor = isDark ? theme.gold : theme.textMuted;

  const gradientColors = isDark
    ? [theme.bgInk, theme.bgDark, theme.bgCard]
    : [theme.bgRice, theme.bgDark, theme.bgMedium];

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={gradientColors as [string, string, string]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />

      {particles.map((p, i) => (
        <InkParticleView
          key={i}
          xRatio={p.xRatio}
          yRatio={p.yRatio}
          size={p.size}
          color={particleColor}
          duration={p.duration}
          delay={p.delay}
          width={width}
          height={height}
          initOpacity={p.initOpacity}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
});
