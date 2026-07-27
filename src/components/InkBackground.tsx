// 水墨背景元件
// 墨色渲染 + 粒子動畫，營造水墨畫意境

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InkParticle {
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
  duration: number;
  delay: number;
}

export default function InkBackground() {
  const particles = useRef<InkParticle[]>([]);

  useEffect(() => {
    // 生成水墨粒子
    const count = 15;
    particles.current = Array.from({ length: count }).map(() => {
      const size = Math.random() * 120 + 40;
      return {
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size,
        opacity: new Animated.Value(Math.random() * 0.08 + 0.02),
        translateY: new Animated.Value(0),
        duration: Math.random() * 15000 + 10000,
        delay: Math.random() * 5000,
      };
    });

    // 啟動動畫
    particles.current.forEach((p) => {
      const animateOpacity = () => {
        const targetOpacity = Math.random() * 0.08 + 0.02;
        Animated.timing(p.opacity, {
          toValue: targetOpacity,
          duration: p.duration,
          useNativeDriver: true,
        }).start(() => {
          p.opacity.setValue(Math.random() * 0.06 + 0.01);
          animateOpacity();
        });
      };

      const animateFloat = () => {
        const targetY = Math.random() * 40 - 20;
        Animated.timing(p.translateY, {
          toValue: targetY,
          duration: p.duration * 1.5,
          useNativeDriver: true,
        }).start(() => {
          p.translateY.setValue(0);
          animateFloat();
        });
      };

      setTimeout(() => {
        animateOpacity();
        animateFloat();
      }, p.delay);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* 漸層背景 */}
      <View style={styles.gradient}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientMiddle} />
        <View style={styles.gradientBottom} />
      </View>

      {/* 水墨粒子 */}
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
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
  gradientTop: {
    flex: 1,
    backgroundColor: '#0D0A08',
  },
  gradientMiddle: {
    flex: 1,
    backgroundColor: '#1A1210',
  },
  gradientBottom: {
    flex: 2,
    backgroundColor: '#231A14',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#C9A96E',
  },
});
