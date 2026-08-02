// 水墨背景元件
// 墨色渲染 + 粒子動畫，營造水墨畫意境
//
// v2：三段式純色 View 改為 expo-linear-gradient 真漸層，
// 水墨粒子維持既有的 Animated API（Reanimated 遷移留待 Phase 5）。

import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

const PARTICLE_COUNT = 15;

interface InkParticle {
  xRatio: number;
  yRatio: number;
  size: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
  duration: number;
  delay: number;
}

function createParticles(): InkParticle[] {
  return Array.from({ length: PARTICLE_COUNT }).map(() => ({
    xRatio: Math.random(),
    yRatio: Math.random(),
    size: Math.random() * 120 + 40,
    opacity: new Animated.Value(Math.random() * 0.08 + 0.02),
    translateY: new Animated.Value(0),
    duration: Math.random() * 15000 + 10000,
    delay: Math.random() * 5000,
  }));
}

export default function InkBackground() {
  const { theme, isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const particles = useMemo(createParticles, []);
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    particles.forEach(p => {
      const timer = setTimeout(() => {
        const opacityLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: Math.random() * 0.08 + 0.02,
              duration: p.duration,
              useNativeDriver: true,
            }),
            Animated.timing(p.opacity, {
              toValue: Math.random() * 0.06 + 0.01,
              duration: p.duration,
              useNativeDriver: true,
            }),
          ]),
        );

        const floatLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(p.translateY, {
              toValue: Math.random() * 40 - 20,
              duration: p.duration * 1.5,
              useNativeDriver: true,
            }),
            Animated.timing(p.translateY, {
              toValue: 0,
              duration: p.duration * 1.5,
              useNativeDriver: true,
            }),
          ]),
        );

        animationsRef.current.push(opacityLoop, floatLoop);
        opacityLoop.start();
        floatLoop.start();
      }, p.delay);

      timersRef.current.push(timer);
    });

    const animations = animationsRef.current;
    const timers = timersRef.current;

    return () => {
      timers.forEach(clearTimeout);
      animations.forEach(a => a.stop());
      animationsRef.current = [];
      timersRef.current = [];
    };
  }, [particles]);

  // 暗色主題：墨色由上而下，深墨水漸層至暖褐底
  // 亮色主題：宣紙暖白由上而下，底部略帶紙紋暗色
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
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: isDark ? theme.gold : theme.textMuted,
              left: p.xRatio * width - p.size / 2,
              top: p.yRatio * height - p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              opacity: p.opacity,
              transform: [{ translateY: p.translateY }],
            },
          ]}
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
  particle: { position: 'absolute' },
});
