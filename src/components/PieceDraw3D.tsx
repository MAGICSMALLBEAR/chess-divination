// 立體象棋占卜動畫
// 3D 翻轉透視 + 漂浮特效

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';
import { getPieceTrigramName, getPieceTrigramGlyph } from '@/data/pieces';
import { useAnimationSpeed } from '@/hooks/useAnimationSpeed';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  drawnPieces: ChessPieceType[];
  drawSummary: string;
  onReveal: () => void;
  onRedraw: () => void;
}

export default function PieceDraw3D({ drawnPieces, drawSummary, onReveal, onRedraw }: Props) {
  const speed = useAnimationSpeed();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'shaking' | 'flying' | 'landed'>('shaking');

  // 3D 動畫值
  const bowlRotateY = useRef(new Animated.Value(0)).current;
  const bowlFloat = useRef(new Animated.Value(0)).current;
  const bowlShake = useRef(new Animated.Value(0)).current;

  // 每個棋子的動畫
  const pieceAnimations = useRef(
    drawnPieces.map(() => ({
      fly: new Animated.Value(0),       // 飛行 0→1
      rotateY: new Animated.Value(0),    // 3D 翻轉
      scale: new Animated.Value(0),      // 縮放出現
      opacity: new Animated.Value(0),    // 淡入
      landX: new Animated.Value(0),      // 橫向偏移
      landY: new Animated.Value(0),      // 縱向偏移
    }))
  ).current;

  // 粒子效果
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // 光環效果
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // 背景暗化
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // 底部陰影容器
  const shadowScale = useRef(new Animated.Value(0)).current;

  // 結果區（摘要卡 + 按鈕）的淡入。必須與光環 ringOpacity 分開，
  // 否則會繼承光環的最終值 0.15，導致按鈕幾乎看不見。
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // 注意：useAnimationSpeed / useReducedMotion 都是掛載後才非同步取得值，
  // 因此本 effect 必須依賴兩者，否則永遠只會用到預設值（設定形同無效）。
  useEffect(() => {
    // 追蹤所有啟動中的動畫與計時器，unmount 時完整清除
    const running: Animated.CompositeAnimation[] = [];
    let landedTimer: ReturnType<typeof setTimeout> | undefined;

    const start = (anim: Animated.CompositeAnimation, onEnd?: Animated.EndCallback) => {
      running.push(anim);
      anim.start(onEnd);
    };

    // 設定載入完成會重跑本 effect，先把所有動畫值歸零避免殘留狀態
    bowlRotateY.setValue(0);
    bowlFloat.setValue(0);
    bowlShake.setValue(0);
    overlayOpacity.setValue(0);
    ringScale.setValue(0);
    ringOpacity.setValue(0);
    shadowScale.setValue(0);
    contentOpacity.setValue(0);
    pieceAnimations.forEach(a => {
      a.fly.setValue(0); a.rotateY.setValue(0); a.scale.setValue(0);
      a.opacity.setValue(0); a.landX.setValue(0); a.landY.setValue(0);
    });
    particleAnims.forEach(p => {
      p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0);
    });

    if (reducedMotion) {
      // 簡化動畫直接展示
      pieceAnimations.forEach(anim => {
        anim.fly.setValue(1);
        anim.scale.setValue(1);
        anim.opacity.setValue(1);
      });
      ringScale.setValue(1);
      ringOpacity.setValue(0.15);
      shadowScale.setValue(1);
      contentOpacity.setValue(1);
      setPhase('landed');
      return;
    }

    setPhase('shaking');

    // Phase 1: 搖晃
    const shakeSeq = Animated.sequence([
      Animated.timing(bowlShake, { toValue: 1, duration: 120 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: -1, duration: 100 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: 0.6, duration: 90 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: -0.6, duration: 80 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: 0.3, duration: 70 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: -0.3, duration: 60 * speed, useNativeDriver: true }),
      Animated.timing(bowlShake, { toValue: 0, duration: 50 * speed, useNativeDriver: true }),
    ]);

    // Phase 2: 3D 轉動 + 漂浮
    const bowl3D = Animated.parallel([
      Animated.timing(bowlRotateY, { toValue: 1, duration: 800 * speed, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(bowlFloat, { toValue: -30, duration: 400 * speed, useNativeDriver: true }),
        Animated.timing(bowlFloat, { toValue: 0, duration: 400 * speed, useNativeDriver: true }),
      ]),
      Animated.timing(overlayOpacity, { toValue: 0.4, duration: 400 * speed, useNativeDriver: true }),
    ]);

    start(shakeSeq, () => {
      setPhase('flying');
      start(bowl3D, () => {
        // Phase 3: 棋子飛出
        const staggerDelay = 350 * speed;
        pieceAnimations.forEach((anim, i) => {
          const delay = i * staggerDelay;
          start(Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.spring(anim.fly, {
                toValue: 1, friction: 4, tension: 80,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.rotateY, {
                  toValue: 1, duration: 400 * speed, useNativeDriver: true,
                }),
                Animated.timing(anim.rotateY, {
                  toValue: 0, duration: 200 * speed, useNativeDriver: true,
                }),
              ]),
              Animated.spring(anim.scale, {
                toValue: 1, friction: 3, tension: 100,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1, duration: 300 * speed, useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.delay(100 * speed),
                Animated.spring(anim.landX, {
                  toValue: (Math.random() - 0.5) * 8,
                  friction: 5, useNativeDriver: true,
                }),
                Animated.spring(anim.landY, {
                  toValue: (Math.random() - 0.5) * 6,
                  friction: 5, useNativeDriver: true,
                }),
              ]),
            ]),
          ]));
        });

        // 粒子爆散
        particleAnims.forEach((p, i) => {
          const angle = (i / particleAnims.length) * Math.PI * 2;
          const dist = 60 + Math.random() * 80;
          start(Animated.sequence([
            Animated.delay(600 * speed + i * 80),
            Animated.parallel([
              Animated.timing(p.x, {
                toValue: Math.cos(angle) * dist,
                duration: 500 * speed, useNativeDriver: true,
              }),
              Animated.timing(p.y, {
                toValue: Math.sin(angle) * dist - 30,
                duration: 500 * speed, useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(p.opacity, {
                  toValue: 1, duration: 100 * speed, useNativeDriver: true,
                }),
                Animated.timing(p.opacity, {
                  toValue: 0, duration: 400 * speed, useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.spring(p.scale, {
                  toValue: 1, friction: 3, useNativeDriver: true,
                }),
                Animated.timing(p.scale, {
                  toValue: 0, duration: 200 * speed, useNativeDriver: true,
                }),
              ]),
            ]),
          ]));
        });

        // 光環擴散
        start(Animated.sequence([
          Animated.delay(500 * speed),
          Animated.parallel([
            Animated.spring(ringScale, {
              toValue: 1, friction: 4, tension: 60, useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(ringOpacity, {
                toValue: 0.4, duration: 200 * speed, useNativeDriver: true,
              }),
              Animated.timing(ringOpacity, {
                toValue: 0.15, duration: 500 * speed, useNativeDriver: true,
              }),
            ]),
            Animated.spring(shadowScale, {
              toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
            }),
          ]),
        ]));

        // 完成：淡出遮罩，並將結果卡與按鈕淡入到完全不透明
        landedTimer = setTimeout(() => {
          setPhase('landed');
          start(Animated.parallel([
            Animated.timing(overlayOpacity, {
              toValue: 0, duration: 300 * speed, useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
              toValue: 1, duration: 400 * speed, useNativeDriver: true,
            }),
          ]));
        }, drawnPieces.length * staggerDelay + 300 * speed);
      });
    });

    return () => {
      if (landedTimer !== undefined) clearTimeout(landedTimer);
      running.forEach(anim => anim.stop());
    };
  }, [speed, reducedMotion]);

  // 搖晃位移
  const shakeX = bowlShake.interpolate({
    inputRange: [-1, 1], outputRange: [-18, 18],
  });
  // 3D 旋轉
  const bowlRotation = bowlRotateY.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  // 棋子 3D 旋轉
  const getPieceRotation = (anim: typeof pieceAnimations[0]) =>
    anim.rotateY.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

  return (
    <View style={styles.container}>
      {/* 背景暗化層 */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

      {/* 3D 場景 */}
      <View style={styles.scene}>
        {/* 光環 */}
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [
                { scale: ringScale },
                { perspective: 400 },
              ],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* 粒子 */}
        {particleAnims.map((p, i) => (
          <Animated.View
            key={`p-${i}`}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        ))}

        {/* 棋筒（搖晃階段） */}
        {phase === 'shaking' && (
          <Animated.View
            style={[
              styles.bowl,
              {
                transform: [
                  { translateX: shakeX },
                  { perspective: 600 },
                ],
              },
            ]}
          >
            <View style={styles.bowlBody}>
              <View style={styles.bowlRim} />
              <View style={styles.bowlContent}>
                <Text style={styles.bowlEmoji}>🏺</Text>
                <Text style={styles.bowlText}>誠心問道</Text>
              </View>
              <View style={styles.bowlBase} />
            </View>
            {/* 底部陰影 */}
            <View style={styles.bowlShadow} />
          </Animated.View>
        )}

        {/* 飛出階段 */}
        {phase === 'flying' && (
          <Animated.View
            style={[
              styles.bowl,
              {
                transform: [
                  { translateY: bowlFloat },
                  { rotateY: bowlRotation },
                  { perspective: 600 },
                ],
                opacity: bowlRotateY.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [1, 1, 0],
                }),
              },
            ]}
          >
            <View style={styles.bowlBody}>
              <Text style={styles.bowlEmoji}>🏺</Text>
            </View>
          </Animated.View>
        )}

        {/* 棋子展示區 */}
        <View style={styles.piecesStage}>
          {drawnPieces.map((piece, i) => {
            const anim = pieceAnimations[i];
            const isRed = piece.color === 'red';
            return (
              <Animated.View
                // 抽棋為「抽出後放回」，同一顆棋可能重複出現，故 key 需帶上位置
                key={`${piece.id}-${i}`}
                style={[
                  styles.piece3D,
                  {
                    transform: [
                      { translateY: anim.fly.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [80, -20, 0],
                      }) },
                      { translateX: anim.landX },
                      { rotateY: getPieceRotation(anim) },
                      { scale: anim.scale },
                      { perspective: 800 },
                    ],
                    opacity: anim.opacity,
                    zIndex: 10 - i,
                  },
                ]}
              >
                {/* 棋子3D本體 */}
                <View style={[
                  styles.piece3DBody,
                  {
                    borderColor: phase === 'landed' ? '#C9A96E' : isRed ? '#C0392B' : '#1A1210',
                  },
                ]}>
                  {/* 亮面（模擬3D光線） */}
                  <View style={[styles.piece3DShine, {
                    backgroundColor: isRed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                  }]} />
                  <Text style={[
                    styles.piece3DChar,
                    { color: isRed ? '#C0392B' : '#1A1210' },
                  ]}>
                    {piece.displayChar}
                  </Text>
                </View>
                {/* 地面陰影 */}
                <Animated.View
                  style={[
                    styles.pieceShadow,
                    {
                      transform: [{ scaleX: anim.scale }],
                      opacity: anim.opacity.interpolate({
                        inputRange: [0, 1], outputRange: [0, 0.3],
                      }),
                    },
                  ]}
                />
                {/* 名稱 */}
                {phase === 'landed' && (
                  <Animated.View
                    style={{
                      opacity: anim.opacity,
                      transform: [{ scale: anim.scale }],
                    }}
                  >
                    <Text style={styles.pieceName}>{piece.chineseName}</Text>
                    <Text style={styles.pieceColor}>
                      {isRed ? '紅方' : '黑方'} · {getPieceTrigramName(piece)}
                      {getPieceTrigramGlyph(piece)} {piece.guaElement}
                    </Text>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* 地面陰影容器 */}
      <Animated.View style={[styles.groundShadow, {
        transform: [{ scaleX: shadowScale }],
        opacity: shadowScale.interpolate({
          inputRange: [0, 1], outputRange: [0, 0.15],
        }),
      }]} />

      {/* 摘要 */}
      {phase === 'landed' && (
        <Animated.View
          style={[
            styles.summaryCard,
            {
              opacity: contentOpacity,
            },
          ]}
        >
          <Text style={styles.summaryText}>{drawSummary}</Text>
        </Animated.View>
      )}

      {/* 按鈕 */}
      {phase === 'landed' && (
        <Animated.View
          style={[
            styles.actions,
            { opacity: contentOpacity },
          ]}
        >
          <TouchableOpacity style={styles.revealBtn} onPress={onReveal}>
            <Text style={styles.revealBtnText}>🔮 揭露籤詩</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.redrawBtn} onPress={onRedraw}>
            <Text style={styles.redrawBtnText}>🔄 重新抽取</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', paddingTop: 20, paddingBottom: 40,
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
  },
  scene: {
    width: SCREEN_WIDTH,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // 光環
  ring: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, borderColor: '#C9A96E',
    top: 60, left: SCREEN_WIDTH / 2 - 100,
  },
  // 粒子
  particle: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#C9A96E',
    top: 160, left: SCREEN_WIDTH / 2 - 3,
  },
  // 棋筒
  bowl: {
    alignItems: 'center',
    position: 'absolute', top: 80,
  },
  bowlBody: {
    alignItems: 'center', justifyContent: 'center',
  },
  bowlRim: {
    width: 90, height: 14,
    backgroundColor: '#6B4F10',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  bowlContent: {
    width: 78, height: 70,
    backgroundColor: '#8B6914',
    alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 4, borderRightWidth: 4,
    borderColor: '#6B4F10',
  },
  bowlBase: {
    width: 90, height: 10,
    backgroundColor: '#5A3E0E',
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  bowlEmoji: { fontSize: 36 },
  bowlText: { fontSize: 12, color: '#F5EDE0', marginTop: 4 },
  bowlShadow: {
    width: 80, height: 8, borderRadius: 40,
    backgroundColor: '#000', opacity: 0.3, marginTop: 2,
  },
  // 棋子展示
  piecesStage: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 24, flexWrap: 'wrap', paddingTop: 120,
  },
  piece3D: {
    alignItems: 'center', width: 80,
  },
  piece3DBody: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F5EDE0',
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    // 立體陰影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  piece3DShine: {
    position: 'absolute', top: 0, left: 0,
    width: 32, height: 64,
    borderTopLeftRadius: 32, borderBottomLeftRadius: 32,
  },
  piece3DChar: {
    fontSize: 30, fontWeight: '900',
  },
  pieceShadow: {
    width: 50, height: 8, borderRadius: 25,
    backgroundColor: '#000', marginTop: 4,
  },
  pieceName: {
    fontSize: 14, fontWeight: '700', color: '#F5EDE0',
    marginTop: 10, textAlign: 'center',
  },
  pieceColor: {
    fontSize: 11, color: '#C9B99A', marginTop: 2, textAlign: 'center',
  },
  // 地面陰影
  groundShadow: {
    width: SCREEN_WIDTH * 0.6, height: 12, borderRadius: 200,
    backgroundColor: '#000',
    marginTop: 40,
  },
  // 摘要
  summaryCard: {
    backgroundColor: '#231A14', borderRadius: 12,
    borderWidth: 1, borderColor: '#3A2F25',
    padding: Spacing.lg, marginHorizontal: Spacing.xl,
    marginTop: 20, width: SCREEN_WIDTH - Spacing.xl * 2,
  },
  summaryText: {
    fontSize: FontSize.body, color: '#C9B99A',
    textAlign: 'center', lineHeight: 26,
  },
  // 按鈕
  actions: {
    gap: Spacing.sm, marginTop: 20,
    width: SCREEN_WIDTH - Spacing.xl * 2,
  },
  revealBtn: {
    backgroundColor: '#C9A96E', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  revealBtnText: {
    fontSize: FontSize.body, fontWeight: '700', color: '#1A1210',
  },
  redrawBtn: {
    borderWidth: 1, borderColor: '#3A2F25',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  redrawBtnText: { fontSize: FontSize.body, color: '#8A7A60' },
});
