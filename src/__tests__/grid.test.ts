// 卡片網格版面測試
//
// 測的是 useGrid 的純函式部分。欄數改由「量測到的容器寬度」決定，
// 而非視窗寬度——原因見 useGrid.ts 檔頭。

import { columnsForWidth, cardWidthFor, GRID_GAP } from '../hooks/useGrid';
import { Layout } from '../constants/theme';

describe('欄數判定', () => {
  test('尚未量測（0）時為單欄', () => {
    expect(columnsForWidth(0)).toBe(1);
  });

  test('手機容器寬度為單欄', () => {
    expect(columnsForWidth(390)).toBe(1);
    expect(columnsForWidth(Layout.tablet - 1)).toBe(1);
  });

  test('達平板斷點為雙欄', () => {
    expect(columnsForWidth(Layout.tablet)).toBe(2);
    expect(columnsForWidth(Layout.desktop - 1)).toBe(2);
  });

  test('達桌面斷點為三欄', () => {
    expect(columnsForWidth(Layout.desktop)).toBe(3);
    expect(columnsForWidth(1920)).toBe(3);
  });

  test('超寬容器維持三欄', () => {
    expect(columnsForWidth(3840)).toBe(3);
  });
});

describe('卡片寬度計算', () => {
  test('單欄時卡片佔滿容器', () => {
    expect(cardWidthFor(500, 1)).toBe(500);
  });

  test('多欄時扣除欄間距後均分', () => {
    expect(cardWidthFor(1000, 2)).toBe((1000 - GRID_GAP) / 2);
    expect(cardWidthFor(1000, 3)).toBe((1000 - GRID_GAP * 2) / 3);
  });

  test('卡片寬度加欄間距等於容器寬度', () => {
    for (const w of [390, 768, 1024, 1440, 1920]) {
      const c = columnsForWidth(w);
      expect(cardWidthFor(w, c) * c + GRID_GAP * (c - 1)).toBeCloseTo(w, 5);
    }
  });

  test('各斷點下卡片仍有可讀寬度', () => {
    for (const w of [Layout.tablet, Layout.desktop, 1440, 1920]) {
      const c = columnsForWidth(w);
      // 不應退化成過窄的欄位
      expect(cardWidthFor(Math.min(w, Layout.maxGrid), c)).toBeGreaterThan(300);
    }
  });

  test('容器寬度為 0 時不產生負值', () => {
    expect(cardWidthFor(0, 1)).toBe(0);
  });
});
