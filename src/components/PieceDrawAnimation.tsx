// 抽棋動畫元件
// 搖筒 → 棋子跳出 → 金光照耀

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';
import ChessPiece from './ChessPiece';
import { Spacing, FontSize, Duration } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PieceDrawAnimationProps {
  drawnPieces: ChessPieceType[];
  drawSummary: string;
  onReveal: () => void;
  onRedraw: () => void;
}

export default function PieceDrawAnimation({
  drawnPieces,
  drawSummary,
  onReveal,
  onRedraw,
}: PieceDrawAnimationProps) {
  const [phase, setPhase] = useState<'shaking' | 'emerging' | 'landed'>('shaking');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pieceScales = useRef(drawnPieces.map(() => new Animated.Value(0))).current;
  const pieceOpacities = useRef(drawnPieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Phase 1: 搖晃動畫
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0.5,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -0.5,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 6 },
    );

    shakeLoop.start(() => {
      setPhase('emerging');

      // Phase 2: 棋子逐一出現（staggered）
      const staggerDelay = 400;
      drawnPieces.forEach((_, i) => {
        Animated.sequence([
          Animated.delay(i * staggerDelay),
          Animated.parallel([
            Animated.spring(pieceScales[i], {
              toValue: 1,
              friction: 4,
              tension: 100,
              useNativeDriver: true,
            }),
            Animated.timing(pieceOpacities[i], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      // 光輝閃現
      Animated.sequence([
        Animated.delay(drawnPieces.length * staggerDelay - 200),
        Animated.spring(glowAnim, {
          toValue: 1,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPhase('landed');
      });
    });

    return () => {
      shakeLoop.stop();
    };
  }, []);

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-15, 15],
  });

  return (
    <View style={styles.container}>
      {/* 搖筒（搖晃階段） */}
      {phase === 'shaking' && (
        <Animated.View
          style={[
            styles.bowl,
            { transform: [{ translateX: shakeTranslate }] },
          ]}
        >
          <Text style={styles.bowlText}>🪔</Text>
          <Text style={styles.bowlLabel}>搖晃中...</Text>
        </Animated.View>
      )}

      {/* 棋子展示 */}
      <View style={styles.piecesContainer}>
        {drawnPieces.map((piece, i) => (
          <Animated.View
            key={piece.id}
            style={[
              styles.pieceWrap,
              {
                transform: [{ scale: pieceScales[i] }],
                opacity: pieceOpacities[i],
              },
            ]}
          >
            {/* 金光照耀 */}
            {phase === 'emerging' && (
              <Animated.View
                style={[
                  styles.glow,
                  { opacity: glowAnim },
                ]}
              />
            )}
            <ChessPiece piece={piece} size={64} />
            <Text style={styles.pieceName}>{piece.chineseName}</Text>
            <Text style={styles.pieceColor}>
              {piece.color === 'red' ? '紅方' : '黑方'}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* 摘要 */}
      {phase === 'landed' && (
        <Animated.View
          style={[
            styles.summaryCard,
            { opacity: glowAnim, transform: [{ scale: glowAnim }] },
          ]}
        >
          <Text style={styles.summaryText}>{drawSummary}</Text>
        </Animated.View>
      )}

      {/* 操作按鈕 */}
      {phase === 'landed' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.revealBtn} onPress={onReveal}>
            <Text style={styles.revealBtnText}>🔮 揭露籤詩</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.redrawBtn} onPress={onRedraw}>
            <Text style={styles.redrawBtnText}>🔄 重新抽取</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  bowl: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  bowlText: {
    fontSize: 80,
  },
  bowlLabel: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    marginTop: Spacing.sm,
  },
  piecesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    flexWrap: 'wrap',
    marginBottom: Spacing.xl,
  },
  pieceWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201, 169, 110, 0.3)',
    top: -18,
    left: -18,
  },
  pieceName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#F5EDE0',
    marginTop: Spacing.sm,
  },
  pieceColor: {
    fontSize: FontSize.caption,
    color: '#C9B99A',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#231A14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A2F25',
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    width: SCREEN_WIDTH - Spacing.xl * 2,
  },
  summaryText: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    textAlign: 'center',
    lineHeight: 26,
  },
  actions: {
    gap: Spacing.sm,
    width: SCREEN_WIDTH - Spacing.xl * 2,
  },
  revealBtn: {
    backgroundColor: '#C9A96E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  revealBtnText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#1A1210',
  },
  redrawBtn: {
    borderWidth: 1,
    borderColor: '#3A2F25',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  redrawBtnText: {
    fontSize: FontSize.body,
    color: '#8A7A60',
  },
});
