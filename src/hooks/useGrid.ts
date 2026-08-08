// 卡片網格版面 Hook
//
// 為什麼不直接用 useLayout()／useWindowDimensions()：
// Expo 靜態匯出的 Web 版，首次渲染（含 hydration 之後的多次 re-render）
// 都取不到視窗尺寸——`useWindowDimensions()` 回傳 0，
// 連 `globalThis.innerWidth` 都是 undefined，實測要等使用者縮放視窗才會出現值。
// 結果是所有以視窗寬推導的版面規則在已部署的 PWA 上都失效，
// 且因為 RN Web 靜默忽略無效寬度，畫面只是退回滿版拉伸，不會有任何錯誤。
//
// 改以 `onLayout` 量測容器本身：這是 RN 的原生量測管道
// （Web 端由 react-native-web 以 ResizeObserver 實作），
// 不依賴任何 window 全域，且語意上更正確——
// 網格該回應的是「容器有多寬」，而不是「視窗有多寬」。

import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Layout, Spacing } from '@/constants/theme';

/** 網格欄間距 */
export const GRID_GAP = Spacing.sm;

export interface GridInfo {
  /** 掛到網格容器上，量測其實際寬度 */
  onLayout: (e: LayoutChangeEvent) => void;
  /** 量測到的容器寬度；尚未量測時為 0 */
  containerWidth: number;
  /** 依容器寬度決定的欄數 */
  columns: number;
  /**
   * 單一卡片寬度。尚未量測到容器寬度前回傳 undefined，
   * 讓卡片先以 100% 佔滿（單欄），避免閃現錯誤的寬度。
   */
  cardWidth: number | undefined;
}

/**
 * 由容器寬度決定欄數。
 * 斷點沿用 Layout.tablet / Layout.desktop，但比較的是容器而非視窗，
 * 因此在有側邊留白的版面下也能得到合理結果。
 */
export function columnsForWidth(containerWidth: number): number {
  if (containerWidth >= Layout.desktop) return 3;
  if (containerWidth >= Layout.tablet) return 2;
  return 1;
}

/** 由容器寬度與欄數推得單張卡片寬度 */
export function cardWidthFor(containerWidth: number, columns: number): number {
  return (containerWidth - GRID_GAP * (columns - 1)) / columns;
}

/**
 * 量測自身容器的寬度。
 * 回傳的 `onLayout` 需掛到要量測的 View 上；量測前 width 為 0。
 */
export function useMeasuredWidth(): {
  onLayout: (e: LayoutChangeEvent) => void;
  width: number;
} {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // 只在變化夠大時更新，避免次像素抖動造成無限 re-render
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  return { onLayout, width };
}

export function useGrid(): GridInfo {
  const { onLayout, width: containerWidth } = useMeasuredWidth();

  const columns = columnsForWidth(containerWidth);

  return {
    onLayout,
    containerWidth,
    columns,
    // 單欄或尚未量測時不指定寬度，交給 width:'100%'
    cardWidth: containerWidth > 0 && columns > 1
      ? cardWidthFor(containerWidth, columns)
      : undefined,
  };
}
