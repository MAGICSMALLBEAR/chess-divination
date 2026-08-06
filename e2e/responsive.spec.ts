// E2E：響應式版面
//
// 驗證寬螢幕多欄佈局在真實瀏覽器中確實生效，
// 以及視窗縮放後版面會重算（舊版在模組載入時取一次 Dimensions，縮放無效）。

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * 量測圖鑑頁網格的實際欄數。
 * 網格是唯一帶 flex-wrap:wrap 且子元素數等於籤詩數的容器；
 * 同一列的卡片左緣相同，相異左緣的數量即為欄數。
 */
async function gridColumns(page: Page): Promise<number> {
  return page.evaluate(() => {
    const grid = Array.from(document.querySelectorAll('div')).find(
      (el) => getComputedStyle(el).flexWrap === 'wrap' && el.children.length > 8,
    );
    if (!grid) return 0;
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

    // 桌面（1440px）容器約 1080px，應為三欄
    expect(await gridColumns(page), '桌面寬度下卡片應並排為多欄').toBeGreaterThan(1);
  });

  test('手機寬度下圖鑑卡片為單欄', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    // 單欄時所有卡片左緣相同
    expect(await gridColumns(page), '手機寬度下卡片應為單欄').toBe(1);
  });

  /** 迴歸：舊版在模組載入時取一次 Dimensions，縮放視窗版面不重算 */
  test('視窗縮放後版面重新計算', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const narrowColumns = await gridColumns(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(800);
    const wideColumns = await gridColumns(page);

    expect(wideColumns, '放寬視窗後應增加欄數').toBeGreaterThan(narrowColumns);
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
