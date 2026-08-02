// 響應式版面 Hook
//
// 全 App 原本在模組載入時取一次 Dimensions.get('window')，導致：
//   - 手機旋轉後版面不重算，卡片寬度與棋盤位置全部錯位
//   - Web 視窗縮放完全無效（本 App 已部署為 Web PWA，桌面縮放是常見操作）
//   - 平板與桌面上卡片被撐成整個視窗寬，行寬過長難以閱讀
// useWindowDimensions 會在尺寸變化時觸發 re-render，是官方建議的作法。

import { useWindowDimensions } from 'react-native';
import { Layout, Spacing } from '@/constants/theme';

export interface LayoutInfo {
  width: number;
  height: number;
  /** 是否為平板以上的寬螢幕 */
  isWide: boolean;
  isDesktop: boolean;
  /** 內容區建議寬度，已套用左右邊距與最大寬度上限 */
  contentWidth: number;
  /** 寬螢幕時建議的欄數 */
  columns: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  const isWide = width >= Layout.tablet;
  const isDesktop = width >= Layout.desktop;
  const contentWidth = Math.min(width - Spacing.xl * 2, Layout.maxContent);

  return {
    width,
    height,
    isWide,
    isDesktop,
    contentWidth,
    columns: isDesktop ? 3 : isWide ? 2 : 1,
  };
}
