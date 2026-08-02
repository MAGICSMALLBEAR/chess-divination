// 載入動畫元件
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SpinnerProps {
  text?: string;
  size?: number;
  /** 省略時使用主題的金色 */
  color?: string;
}

export default function Spinner({ text, size = 32, color }: SpinnerProps) {
  const { theme } = useAppTheme();
  const tint = color ?? theme.gold;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: tint,
            transform: [{ rotate }],
          },
        ]}
      />
      {text && <Text style={[styles.text, { color: tint }]}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
