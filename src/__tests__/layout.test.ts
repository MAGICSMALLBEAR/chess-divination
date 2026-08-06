// 響應式版面測試
// 測的是 computeLayout 純函式——斷點與寬度計算的全部邏輯都在其中，
// useLayout hook 僅負責接上 useWindowDimensions，無需模擬 RN 模組。

import { computeLayout } from '../hooks/useLayout';
import { Layout, Spacing } from '../constants/theme';

/** 以指定視窗寬度取得版面資訊 */
function layoutAt(width: number, height = 844) {
  return computeLayout(width, height);
}

describe('斷點判定', () => {
  test('手機寬度為單欄', () => {
    const l = layoutAt(390);
    expect(l.isWide).toBe(false);
    expect(l.isDesktop).toBe(false);
    expect(l.columns).toBe(1);
  });

  test('平板斷點（768）進入雙欄', () => {
    const l = layoutAt(Layout.tablet);
    expect(l.isWide).toBe(true);
    expect(l.isDesktop).toBe(false);
    expect(l.columns).toBe(2);
  });

  test('平板斷點前一像素仍為單欄', () => {
    expect(layoutAt(Layout.tablet - 1).columns).toBe(1);
  });

  test('桌面斷點（1024）進入三欄', () => {
    const l = layoutAt(Layout.desktop);
    expect(l.isWide).toBe(true);
    expect(l.isDesktop).toBe(true);
    expect(l.columns).toBe(3);
  });

  test('桌面斷點前一像素為雙欄', () => {
    expect(layoutAt(Layout.desktop - 1).columns).toBe(2);
  });

  test('超寬螢幕維持三欄，不無限增加', () => {
    expect(layoutAt(2560).columns).toBe(3);
  });
});

describe('contentWidth 限寬', () => {
  test('窄螢幕扣除左右邊距', () => {
    const l = layoutAt(390);
    expect(l.contentWidth).toBe(390 - Spacing.xl * 2);
  });

  /** 迴歸：無上限時卡片會被撐成整個視窗寬，出現超長行寬 */
  test('寬螢幕受 maxContent 上限約束', () => {
    expect(layoutAt(1920).contentWidth).toBe(Layout.maxContent);
    expect(layoutAt(2560).contentWidth).toBe(Layout.maxContent);
  });

  test('contentWidth 永不超過 maxContent', () => {
    for (const w of [320, 390, 768, 1024, 1440, 1920]) {
      expect(layoutAt(w).contentWidth).toBeLessThanOrEqual(Layout.maxContent);
    }
  });
});

describe('網格寬度計算', () => {
  test('單欄時 gridWidth 等同 contentWidth', () => {
    const l = layoutAt(390);
    expect(l.gridWidth).toBe(l.contentWidth);
  });

  test('單欄時 cardWidth 等同 gridWidth（無欄間距）', () => {
    const l = layoutAt(390);
    expect(l.cardWidth).toBe(l.gridWidth);
  });

  /**
   * 多欄若沿用 maxContent(560)，每欄只剩約 270px，反而比單欄更難讀。
   * gridWidth 改用較寬的 maxGrid，確保每欄仍有可讀行寬。
   */
  test('多欄時 gridWidth 放寬至 maxGrid 上限', () => {
    const l = layoutAt(1920);
    expect(l.gridWidth).toBe(Layout.maxGrid);
    expect(l.gridWidth).toBeGreaterThan(Layout.maxContent);
  });

  test('雙欄時每張卡片仍有足夠閱讀寬度', () => {
    const l = layoutAt(Layout.tablet);
    expect(l.columns).toBe(2);
    // 不應退化成兩個過窄的欄位
    expect(l.cardWidth).toBeGreaterThan(300);
  });

  test('三欄時每張卡片仍有足夠閱讀寬度', () => {
    const l = layoutAt(1920);
    expect(l.columns).toBe(3);
    expect(l.cardWidth).toBeGreaterThan(300);
  });

  test('卡片寬度加上欄間距應等於容器寬度', () => {
    for (const w of [390, 768, 1024, 1440, 1920]) {
      const l = layoutAt(w);
      const total = l.cardWidth * l.columns + Spacing.sm * (l.columns - 1);
      expect(total).toBeCloseTo(l.gridWidth, 5);
    }
  });

  test('cardWidth 恆為正數', () => {
    for (const w of [320, 390, 768, 1024, 1920, 2560]) {
      expect(layoutAt(w).cardWidth).toBeGreaterThan(0);
    }
  });
});

/**
 * 迴歸：Expo 靜態匯出的 Web 版 hydration 後 useWindowDimensions 持續回傳 0，
 * 直接扣掉左右邊距會得到 -64px。RN Web 會忽略負寬度，讓元素退回滿版拉伸——
 * 「內容限寬 560px」在已部署的 PWA 上因此從未生效，且不會有任何錯誤訊息。
 */
describe('無效視窗尺寸的防護', () => {
  test('寬度為 0 時不產生負的 contentWidth', () => {
    const l = layoutAt(0);
    expect(l.contentWidth).toBeGreaterThan(0);
  });

  test('寬度為 0 時不產生負的 gridWidth 與 cardWidth', () => {
    const l = layoutAt(0);
    expect(l.gridWidth).toBeGreaterThan(0);
    expect(l.cardWidth).toBeGreaterThan(0);
  });

  test('寬度為 0 時退回單欄，而非誤判為寬螢幕', () => {
    const l = layoutAt(0);
    expect(l.columns).toBe(1);
    expect(l.isWide).toBe(false);
  });

  test('負寬度同樣被夾到下限', () => {
    const l = layoutAt(-100);
    expect(l.contentWidth).toBeGreaterThan(0);
    expect(l.cardWidth).toBeGreaterThan(0);
  });

  test('任何輸入寬度都不會產生負值', () => {
    for (const w of [-500, -1, 0, 1, 100, 319, 320, 390, 768, 1024, 1920]) {
      const l = layoutAt(w);
      // 以物件一次斷言，失敗訊息會直接顯示是哪個寬度出問題
      expect({ w, ok: l.contentWidth > 0 && l.gridWidth > 0 && l.cardWidth > 0 })
        .toEqual({ w, ok: true });
    }
  });
});

describe('尺寸透傳', () => {
  test('回傳當前視窗寬高', () => {
    const l = layoutAt(1024, 768);
    expect(l.width).toBe(1024);
    expect(l.height).toBe(768);
  });

  /** 迴歸：舊版在模組載入時取一次 Dimensions，旋轉後不重算 */
  test('視窗尺寸改變後版面隨之更新', () => {
    const portrait = layoutAt(390, 844);
    expect(portrait.columns).toBe(1);

    const landscape = layoutAt(844, 390);
    expect(landscape.columns).toBe(2);
    expect(landscape.width).toBe(844);
  });
});
