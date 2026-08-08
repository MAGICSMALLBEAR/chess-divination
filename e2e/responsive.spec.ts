// E2E：響應式版面
//
// 驗證寬螢幕多欄佈局在真實瀏覽器中確實生效，
// 以及視窗縮放後版面會重算（舊版在模組載入時取一次 Dimensions，縮放無效）。

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * 量測卡片網格的實際欄數。
 * 以 testID 定位（各頁的網格容器都標了 `card-grid`），
 * 而非猜 flex-wrap 容器——後者會誤抓到總覽列之類的其他 flex 容器。
 * 同一列的卡片左緣相同，相異左緣的數量即為欄數。
 */
async function gridColumns(page: Page): Promise<number> {
  return page.evaluate(() => {
    // 一頁可能有多個網格（如收藏頁的歷史／收藏分頁），取第一個可見者
    const grids = Array.from(document.querySelectorAll('[data-testid="card-grid"]'));
    const grid = grids.find((g) => g.getBoundingClientRect().width > 0);
    if (!grid || grid.children.length === 0) return 0;

    const lefts = Array.from(grid.children)
      .slice(0, 8)
      .map((c) => Math.round(c.getBoundingClientRect().left));
    return new Set(lefts).size;
  });
}

test.describe('寬螢幕多欄佈局', () => {
  test('桌面寬度下圖鑑卡片並排顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    // 容器寬度以 onLayout 非同步量測，需輪詢等版面收斂
    await expect
      .poll(() => gridColumns(page), { message: '桌面寬度下卡片應並排為多欄' })
      .toBeGreaterThan(1);
  });

  test('手機寬度下圖鑑卡片為單欄', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    // 單欄時所有卡片左緣相同
    await expect
      .poll(() => gridColumns(page), { message: '手機寬度下卡片應為單欄' })
      .toBe(1);
  });

  /** 迴歸：舊版在模組載入時取一次 Dimensions，縮放視窗版面不重算 */
  test('視窗縮放後版面重新計算', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => gridColumns(page)).toBe(1);
    const narrowColumns = await gridColumns(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(() => gridColumns(page), { message: '放寬視窗後應增加欄數' })
      .toBeGreaterThan(narrowColumns);
  });

  test('成就頁在桌面寬度為多欄', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/achievements');
    await expect(page.getByText('成就徽章').first()).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(() => gridColumns(page), { message: '成就頁應並排為多欄' })
      .toBeGreaterThan(1);
  });

  test('成就頁在手機寬度為單欄', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/achievements');
    await expect(page.getByText('成就徽章').first()).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(() => gridColumns(page), { message: '成就頁在手機應為單欄' })
      .toBe(1);
  });

  /**
   * 迴歸：TrendChart 原本以視窗寬度計算，在 Web 上恆為最小值，
   * 圖表被鎖在約 264px 寬，與容器完全不成比例。
   */
  test('統計頁趨勢圖會撐滿容器寬度', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/stats');
    await expect(page.getByText('近 7 天占卜趨勢')).toBeVisible({ timeout: 15_000 });

    // 圖表寬度同樣來自 onLayout，先等它量到非零寬度
    await expect.poll(() => page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('div'))
        .find((e) => e.textContent?.trim() === '近 7 天占卜趨勢');
      return t?.parentElement?.querySelectorAll('rect').length ?? 0;
    })).toBeGreaterThan(0);

    const chart = await page.evaluate(() => {
      const title = Array.from(document.querySelectorAll('div'))
        .find((e) => e.textContent?.trim() === '近 7 天占卜趨勢');
      const box = title?.parentElement;
      const svg = box?.querySelector('svg');
      return {
        boxWidth: box ? Math.round(box.getBoundingClientRect().width) : 0,
        svgWidth: Number(svg?.getAttribute('width') ?? 0),
        bars: box?.querySelectorAll('rect').length ?? 0,
      };
    });

    expect(chart.bars, '應畫出 7 天的柱狀圖').toBe(7);
    // 圖表寬度應貼近容器，而非停在最小寬度
    expect(chart.svgWidth).toBeGreaterThan(chart.boxWidth * 0.8);
  });

  test('內容不會產生水平捲軸', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/library');
      await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

      const overflows = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflows, `${width}px 寬度下出現水平捲軸`).toBe(false);
    }
  });
});

test.describe('主題', () => {
  test('深色主題下文字與背景有足夠對比', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('籤詩圖鑑')).toBeVisible({ timeout: 15_000 });

    // 標題不應與背景同色（曾因硬編色碼導致亮色主題下淺字配淺底）
    const { color, bg } = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div'))
        .find((e) => e.textContent?.trim() === '籤詩圖鑑');
      const style = el ? getComputedStyle(el) : null;
      return {
        color: style?.color ?? '',
        bg: getComputedStyle(document.body).backgroundColor,
      };
    });

    expect(color).not.toBe('');
    expect(color).not.toBe(bg);
  });
});
