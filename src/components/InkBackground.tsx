// 水墨背景元件
// 墨色渲染 + 粒子動畫，營造水墨畫意境
//
// 本元件每一頁都會用到，原本三段背景色與粒子色全部硬編為深色，
// 是亮色主題整片維持黑底的主因；尺寸也在模組載入時取一次，
// 旋轉與視窗縮放皆不重算。現改為跟隨主題並使用 useWindowDimensions。

import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

const PARTICLE_COUNT = 15;

interface InkParticle {
  /** 相對位置 0–1，實際座標依當前視窗尺寸換算，故縮放時不需重建粒子 */
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
    // 舊版以遞迴 start() 無限循環且從未在卸載時停止，
    // 多頁堆疊時會累積多份循環持續佔用 JS 執行緒。
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

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 三段式底色。亮色主題由淺至深、暗色主題由深至淺，方向相反 */}
      <View style={styles.gradient}>
        <View style={[styles.gradientTop, { backgroundColor: theme.bgInk }]} />
        <View style={[styles.gradientMiddle, { backgroundColor: theme.bgDark }]} />
        <View style={[styles.gradientBottom, { backgroundColor: theme.bgCard }]} />
      </View>

      {/* 水墨粒子。亮色主題下墨點才看得見，金色會糊成一片 */}
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
  gradientTop: { flex: 1 },
  gradientMiddle: { flex: 1 },
  gradientBottom: { flex: 2 },
  particle: { position: 'absolute' },
});
