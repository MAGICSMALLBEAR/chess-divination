// 響應式版面 Hook
//
// 全 App 原本在模組載入時取一次 Dimensions.get('window')，導致：
//   - 手機旋轉後版面不重算，卡片寬度與棋盤位置全部錯位
//   - Web 視窗縮放完全無效（本 App 已部署為 Web PWA，桌面縮放是常見操作）
//   - 平板與桌面上卡片被撐成整個視窗寬，行寬過長難以閱讀
// useWindowDimensions 會在尺寸變化時觸發 re-render，是官方建議的作法。

import { useSyncExternalStore } from 'react';
import { useWindowDimensions } from 'react-native';
import { Layout, Spacing } from '@/constants/theme';

/** 視窗寬度的下限。低於此值多半是尚未量測到的無效值，而非真實裝置寬度 */
const MIN_VIEWPORT_WIDTH = 320;

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
  /**
   * 卡片網格的容器寬度。
   * 單欄時等同 contentWidth；多欄時放寬上限，讓並排的卡片各自維持
   * 可讀行寬，而非把單欄的 560px 硬切成兩半（那會讓每欄只剩 270px）。
   */
  gridWidth: number;
  /** 網格中單一卡片的寬度，已扣除欄間距 */
  cardWidth: number;
}

/** 網格欄間距 */
export const GRID_GAP = Spacing.sm;

/**
 * 由視窗尺寸推導版面資訊。
 * 抽為純函式讓斷點與寬度計算可直接單元測試，
 * hook 本身只負責接上 useWindowDimensions。
 */
export function computeLayout(rawWidth: number, height: number): LayoutInfo {
  // 尚未量測到尺寸時（SSR／hydration 前）會拿到 0，
  // 直接扣邊距會得到負寬度，讓所有版面計算失效。先夾到合理下限。
  const width = Math.max(rawWidth, MIN_VIEWPORT_WIDTH);

  const isWide = width >= Layout.tablet;
  const isDesktop = width >= Layout.desktop;
  const contentWidth = Math.min(width - Spacing.xl * 2, Layout.maxContent);
  const columns = isDesktop ? 3 : isWide ? 2 : 1;

  // 多欄時以 maxGrid 為上限（單欄仍用 maxContent），
  // 使每欄的實際寬度落在接近單欄閱讀寬度的區間。
  const gridWidth = columns === 1
    ? contentWidth
    : Math.min(width - Spacing.xl * 2, Layout.maxGrid);

  const cardWidth = (gridWidth - GRID_GAP * (columns - 1)) / columns;

  return {
    width,
    height,
    isWide,
    isDesktop,
    contentWidth,
    columns,
    gridWidth,
    cardWidth,
  };
}

/**
 * 是否能從瀏覽器直接取得視窗尺寸。
 * 用 globalThis 而非裸 window——打包器可能在模組作用域注入 window shim，
 * 使 SSR 相容的檢查在瀏覽器中誤判。
 */
type DomWindow = { innerWidth: number; innerHeight: number;
  addEventListener: Window['addEventListener']; removeEventListener: Window['removeEventListener'] };

function domWindow(): DomWindow | null {
  const g = globalThis as unknown as Partial<DomWindow>;
  return typeof g?.innerWidth === 'number' && typeof g.addEventListener === 'function'
    ? (g as DomWindow)
    : null;
}

function hasDomViewport(): boolean {
  return domWindow() !== null;
}

const viewportListeners = new Set<() => void>();
const notifyViewportChanged = () => viewportListeners.forEach((l) => l());

let probeStarted = false;

/**
 * 掛載後輪詢視窗尺寸，量到就通知並停止。
 *
 * 在 Expo 靜態匯出的 Web 版，首次渲染時 `useWindowDimensions()` 與
 * `globalThis.innerWidth` 都還取不到值（後者甚至是 undefined），
 * 且不會自行補上——實測要等使用者縮放視窗才會出現正確值。
 * 只靠 useSyncExternalStore 的訂閱不夠，因為在那之前沒有任何事件會觸發。
 * 故主動輪詢數個影格；量到即通知 React 改讀客戶端快照。
 */
function startViewportProbe() {
  if (probeStarted) return;
  probeStarted = true;

  const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => void })
    .requestAnimationFrame;
  if (typeof raf !== 'function') return;

  let attempts = 0;
  const tick = () => {
    if (getDomWidth() > 0) {
      notifyViewportChanged();
      return;   // 量到了就停，之後交給 resize 事件
    }
    if (++attempts < 30) raf(tick);
  };
  raf(tick);
}

/** 訂閱瀏覽器 resize；非瀏覽器環境為 no-op */
function subscribeToResize(onChange: () => void): () => void {
  const w = domWindow();
  if (!w) return () => {};

  if (viewportListeners.size === 0) {
    w.addEventListener('resize', notifyViewportChanged);
    w.addEventListener('orientationchange', notifyViewportChanged);
  }
  viewportListeners.add(onChange);
  startViewportProbe();

  return () => {
    viewportListeners.delete(onChange);
    if (viewportListeners.size === 0) {
      w.removeEventListener('resize', notifyViewportChanged);
      w.removeEventListener('orientationchange', notifyViewportChanged);
    }
  };
}

const getDomWidth = () => domWindow()?.innerWidth ?? 0;
const getDomHeight = () => domWindow()?.innerHeight ?? 0;
/** SSR 快照：靜態匯出時沒有視窗，回 0 讓 computeLayout 夾到下限 */
const getServerSize = () => 0;

/**
 * 取得視窗尺寸。
 *
 * Expo 靜態匯出的 Web 版，`useWindowDimensions()` 在 hydration 之後仍回傳
 * 未量測到的值（連 resize 也不更新），使所有以此推導的寬度變成負數——
 * 「內容限寬 560px」等版面規則在已部署的 PWA 上因此從未生效，
 * 且因為 RN Web 會靜默忽略負寬度，畫面只是退回滿版拉伸，不會報錯。
 *
 * Web 端改以 `window.innerWidth` 為準並用 useSyncExternalStore 訂閱 resize
 * （避免 useEffect 在 hydration 時序下取到過期值）；原生端維持 RN 的回傳值。
 */
function useViewport(): { width: number; height: number } {
  const rn = useWindowDimensions();

  const domWidth = useSyncExternalStore(subscribeToResize, getDomWidth, getServerSize);
  const domHeight = useSyncExternalStore(subscribeToResize, getDomHeight, getServerSize);

  // 不另外判斷 Platform：原生的 window 沒有 innerWidth，
  // hasDomViewport() 已足以區分，domWidth 在原生端恆為 0。
  if (domWidth > 0) {
    return { width: domWidth, height: domHeight };
  }
  return rn;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useViewport();
  return computeLayout(width, height);
}
