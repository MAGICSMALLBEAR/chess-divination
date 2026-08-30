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
  /**
   * 閱讀型畫面的雙欄配置；`null` 代表此寬度應維持單欄。
   *
   * 與 `columns`／`gridWidth` 分開是刻意的：那組是給**同質卡片網格**用的
   * （圖鑑、收藏——每張卡地位相同，切幾欄只是密度問題）。閱讀型畫面是
   * **異質**的，主欄要保住行寬、側欄只是查證用的憑據，兩者不能共用同一組
   * 斷點與寬度，否則籤詩會被切成和六爻盤一樣寬的窄柱。
   */
  split: { mainWidth: number; railWidth: number } | null;
}

/** 網格欄間距 */
export const GRID_GAP = Spacing.sm;

/** 雙欄閱讀版面的主欄與側欄間距 */
export const SPLIT_GAP = Spacing.xl;

/**
 * 棋盤頁棋子池側置的幾何。
 *
 * 與 `split` 分開是同一個理由的延伸：這不是閱讀版面，寬度單位是棋子而非行寬。
 * 棋子池的欄寬只能是 3 或 4 欄——2 欄會把 16 顆棋排成 8 列比棋盤還高，
 * 5 欄以上又比棋盤本身還寬，兩者都讓「同一視線高度挑子落子」的目的失效。
 */
export const BOARD_TRAY = {
  /** 單顆棋子在池中的佔位：ChessPiece 36 + 左右 padding 4 */
  pieceCell: 44,
  /** 棋子之間的間距，與 ChessBoard 的 availableRow gap 一致 */
  pieceGap: Spacing.sm,
  /** 棋盤與棋子池之間的間距，與 ChessBoard 的 TRAY_GAP 一致 */
  gap: Spacing.lg,
  /** 側置的最小容器寬度。低於此值棋盤會被壓到比放在下面時還小，不划算 */
  minWidth: 720,
} as const;

/** n 欄棋子所需的寬度（末欄不含尾隨間距） */
export function trayWidthForColumns(columns: number): number {
  return columns * BOARD_TRAY.pieceCell + (columns - 1) * BOARD_TRAY.pieceGap;
}

export interface BoardTrayLayout {
  /** 棋子池排在棋盤下方或右側 */
  trayPosition: 'below' | 'side';
  cellSize: number;
  /** 側置時的棋子池欄寬；`below` 時為 0 */
  trayWidth: number;
}

/**
 * 由容器寬度推導棋盤格距與棋子池位置。
 *
 * `maxCell` 是格距上限（一般模式 56、全螢幕 68），`margin` 是容器左右留白。
 * 側置時先扣掉最小棋子池寬再算格距，確保棋盤不會把池子擠到放不下；
 * 剩餘空間再回填給池子，但上限四欄——超寬螢幕上把池子拉寬只會讓棋子散開，
 * 反而要多掃一次視線。
 */
export function computeBoardTray(
  containerWidth: number,
  maxCell: number,
  margin = 32,
): BoardTrayLayout {
  // 尚未量測到寬度，先給可用的預設值（沿用量測前的舊行為）
  if (containerWidth <= 0) return { trayPosition: 'below', cellSize: 32, trayWidth: 0 };

  const cellFor = (usable: number) => Math.min(maxCell, Math.max(28, usable / 9));

  if (containerWidth < BOARD_TRAY.minWidth) {
    return { trayPosition: 'below', cellSize: cellFor(containerWidth - margin), trayWidth: 0 };
  }

  const minTray = trayWidthForColumns(3);
  const maxTray = trayWidthForColumns(4);
  const cellSize = cellFor(containerWidth - margin - minTray - BOARD_TRAY.gap);
  const leftover = containerWidth - margin - cellSize * 9 - BOARD_TRAY.gap;
  return { trayPosition: 'side', cellSize, trayWidth: Math.min(maxTray, Math.max(minTray, leftover)) };
}

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

  // 雙欄閱讀版面：側欄寬度固定，主欄吃掉剩下的並夾在可讀區間。
  // 側欄固定而非按比例，是因為它裝的是六爻盤這種尺寸大致固定的圖表——
  // 讓它隨視窗長大只會在圖表旁邊產生更多空白。
  const splitOuter = Math.min(width - Spacing.xl * 2, Layout.maxSplitMain + SPLIT_GAP + Layout.railWidth);
  const splitMain = splitOuter - SPLIT_GAP - Layout.railWidth;
  const split = width >= Layout.split && splitMain >= Layout.maxContent
    ? { mainWidth: splitMain, railWidth: Layout.railWidth }
    : null;

  return {
    width,
    height,
    isWide,
    isDesktop,
    contentWidth,
    columns,
    gridWidth,
    cardWidth,
    split,
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
export function useViewport(): { width: number; height: number } {
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
