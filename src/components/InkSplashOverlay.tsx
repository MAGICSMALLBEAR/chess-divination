// 墨滴擴散遮罩轉場元件
// 多層圓形 View 從畫面中心向外擴散，模擬墨滴滴落宣紙的視覺效果。
// 每個墨滴斑點是獨立元件，各自控制 Reanimated shared value。
// 擴散完成後整體淡出，揭露下方內容。

import React, { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── 墨滴斑點定義 ──
interface DropConfig {
  cxRatio: number;   // 相對畫面中心的 x 偏移（0 = 正中）
  cyRatio: number;   // 相對畫面中心的 y 偏移
  size: number;       // 擴散後的最終半徑比例（相對於畫面對角線）
  opacity: number;    // 該斑點的不透明度
  delay: number;      // 擴散延遲（ms）
}

// 預先定義墨滴斑點群：主墨滴 + 次要斑點 + 周邊濺射
const DROPS: DropConfig[] = [
  // 主墨滴（占據最大面積）
  { cxRatio: 0, cyRatio: 0, size: 1.05, opacity: 0.92, delay: 0 },
  { cxRatio: -0.02, cyRatio: 0.01, size: 0.9, opacity: 0.75, delay: 50 },
  // 略偏的次要墨滴（製造不規則邊緣）
  { cxRatio: -0.12, cyRatio: -0.08, size: 0.72, opacity: 0.6, delay: 100 },
  { cxRatio: 0.1, cyRatio: 0.06, size: 0.68, opacity: 0.55, delay: 140 },
  // 周邊濺射斑點
  { cxRatio: -0.25, cyRatio: 0.12, size: 0.28, opacity: 0.4, delay: 220 },
  { cxRatio: 0.24, cyRatio: -0.14, size: 0.26, opacity: 0.38, delay: 260 },
  { cxRatio: 0.04, cyRatio: -0.26, size: 0.32, opacity: 0.35, delay: 200 },
  { cxRatio: -0.2, cyRatio: -0.24, size: 0.2, opacity: 0.33, delay: 300 },
  { cxRatio: 0.28, cyRatio: 0.2, size: 0.22, opacity: 0.3, delay: 280 },
  // 飛濺微點
  { cxRatio: -0.34, cyRatio: 0.28, size: 0.14, opacity: 0.25, delay: 350 },
  { cxRatio: 0.33, cyRatio: -0.3, size: 0.12, opacity: 0.22, delay: 380 },
  { cxRatio: 0.16, cyRatio: 0.32, size: 0.16, opacity: 0.2, delay: 340 },
  { cxRatio: -0.3, cyRatio: -0.32, size: 0.15, opacity: 0.18, delay: 400 },
  { cxRatio: 0.38, cyRatio: 0.08, size: 0.1, opacity: 0.15, delay: 420 },
  { cxRatio: -0.08, cyRatio: 0.36, size: 0.11, opacity: 0.16, delay: 390 },
];

// ── 擴散動畫參數 ──
const EXPAND_DURATION = 750;   // 主擴散持續時間
const HOLD_DURATION = 150;     // 鋪滿後的停留
const FADE_DURATION = 350;     // 淡出持續時間
const INK_COLOR = '#1a0f0a';   // 墨色（深棕黑，非純黑）

// ── 單一墨滴斑點 ──
interface DropProps {
  drop: DropConfig;
  width: number;
  height: number;
  diagonal: number;
}

const InkDropView = React.memo(function InkDropView({
  drop, width, height, diagonal,
}: DropProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withTiming(1, { duration: EXPAND_DURATION });
    }, drop.delay);
    return () => {
      clearTimeout(t);
      cancelAnimation(scale);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const size = drop.size * diagonal;
    const cx = width / 2 + drop.cxRatio * width;
    const cy = height / 2 + drop.cyRatio * height;

    return {
      position: 'absolute' as const,
      backgroundColor: INK_COLOR,
      width: size,
      height: size,
      borderRadius: size / 2,
      left: cx - size / 2,
      top: cy - size / 2,
      opacity: drop.opacity,
      transform: [{ scale: scale.value }],
    };
  });

  return <Animated.View style={animStyle} />;
});

// ── 墨滴擴散本體 ──
interface Props {
  visible: boolean;
  onComplete?: () => void;
}

export default function InkSplashOverlay({ visible, onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const diagonal = Math.sqrt(width * width + height * height);
  const reducedMotion = useReducedMotion();

  const overlayOpacity = useSharedValue(1);

  // onComplete 存在 ref 中，讓計時器永遠拿到最新的回呼，
  // 又不必把它放進 effect 依賴而重啟整段動畫。
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // 減少動態效果：墨滴轉場是純視覺裝飾，整段跳過（PieceEntryFlyIn
    // 與 PieceDraw3D 都接了 useReducedMotion，這裡是漏接而非政策）。
    // 但仍要通知父層完成——不然狀態機停在轉場中，籤詩頁的內容
    // 永遠等不到「轉場結束」這一步。
    if (reducedMotion && visible) {
      onCompleteRef.current?.();
      return;
    }

    if (!visible) {
      overlayOpacity.value = 1;
      return;
    }

    const totalExpand = EXPAND_DURATION + 450;  // 最晚斑點的 delay + 擴散時間

    // 擴散 → 停留 → 淡出
    const fadeTimer = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: FADE_DURATION });
    }, totalExpand + HOLD_DURATION);

    // 完成通知一律由 JS 計時器發出，不掛在 withTiming 的回呼上。
    // withTiming 的回呼跑在 UI thread（worklet），要呼叫 JS 閉包必須經 runOnJS；
    // 直接呼叫會靜默失效，父層的狀態機就永遠停在轉場中——
    // 遮罩不卸載，整個籤詩頁被 15 層墨色圓形蓋住。
    const doneTimer = setTimeout(() => {
      onCompleteRef.current?.();
    }, totalExpand + HOLD_DURATION + FADE_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      cancelAnimation(overlayOpacity);
    };
  }, [visible, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible || reducedMotion) return null;

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents="none"
    >
      {DROPS.map((drop, i) => (
        <InkDropView
          key={i}
          drop={drop}
          width={width}
          height={height}
          diagonal={diagonal}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    overflow: 'hidden',
  },
});
