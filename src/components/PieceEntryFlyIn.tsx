// 棋子飛入動畫元件
// 籤詩揭露後，棋子從上方飛入並落定位，每個棋子獨立動畫並錯開時序。
// Reanimated 4 驅動：useSharedValue + useAnimatedStyle + withSpring

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationSpeed } from '@/hooks/useAnimationSpeed';

interface Props {
  pieceChars: string[];
  pieceColors: string[];
  visible: boolean;
}

/** 彈簧參數：落下時略有回彈，模擬棋子落在棋盤上的感覺 */
const SPRING_CONFIG = {
  damping: 10,
  stiffness: 150,
  mass: 0.8,
};

const PieceItem = React.memo(function PieceItem({
  char, color, index, total, visible,
}: {
  char: string; color: string; index: number; total: number; visible: boolean;
}) {
  const translateY = useSharedValue(-120);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  // 初始旋轉由 index 決定性推導（不用 Math.random）：
  // 靜態預渲染與客戶端首渲必須一致，否則 hydration mismatch
  const rotateZ = useSharedValue(Math.sin(index * 12.9898) * 30);

  useEffect(() => {
    if (!visible) {
      translateY.value = -120;
      scale.value = 0.3;
      opacity.value = 0;
      return;
    }

    const delay = index * 120;
    const t = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.15, { duration: 200 }),
        withSpring(1, SPRING_CONFIG),
      );
      translateY.value = withSequence(
        withTiming(-15, { duration: 280 }),
        withSpring(0, SPRING_CONFIG),
      );
      rotateZ.value = withSpring(0, { damping: 8, stiffness: 120 });
    }, delay);

    return () => {
      clearTimeout(t);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(rotateZ);
    };
  }, [visible, index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const isRed = color === 'red';

  return (
    <Animated.View style={[styles.pieceWrap, animStyle]}>
      <View style={[styles.pieceBody, {
        borderColor: isRed ? '#C1292E' : '#1A1A2E',
      }]}>
        <View style={[styles.pieceShine, {
          backgroundColor: isRed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
        }]} />
        <Animated.Text style={[styles.pieceChar, {
          color: isRed ? '#C1292E' : '#1A1A2E',
        }]}>
          {char}
        </Animated.Text>
      </View>
    </Animated.View>
  );
});

export default function PieceEntryFlyIn({ pieceChars, pieceColors, visible }: Props) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    // 簡化模式：直接顯示
    return (
      <View style={styles.container}>
        {pieceChars.map((char, i) => {
          const isRed = pieceColors[i] === 'red';
          return (
            <View key={i} style={styles.pieceWrap}>
              <View style={[styles.pieceBody, {
                borderColor: isRed ? '#C1292E' : '#1A1A2E',
              }]}>
                <View style={[styles.pieceShine, {
                  backgroundColor: isRed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                }]} />
                <Animated.Text style={[styles.pieceChar, {
                  color: isRed ? '#C1292E' : '#1A1A2E',
                }]}>
                  {char}
                </Animated.Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pieceChars.map((char, i) => (
        <PieceItem
          key={`${char}-${i}`}
          char={char}
          color={pieceColors[i] || 'red'}
          index={i}
          total={pieceChars.length}
          visible={visible}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 12,
    height: 64,
    alignItems: 'center',
  },
  pieceWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceBody: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5E6D3',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  pieceShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 26,
    height: 52,
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
  },
  pieceChar: {
    fontSize: 26,
    fontWeight: '900',
  },
});
