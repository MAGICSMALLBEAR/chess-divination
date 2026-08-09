// E2E：視覺可見性
//
// 為什麼不用截圖比對：像素級比對在不同機器與字體渲染下太脆弱，
// 而且它告訴你「有東西變了」，不會告訴你「使用者看不見內容」。
//
// 這裡改測「內容是否真的被看見」。動機來自兩個實際發生過、
// 卻能通過所有既有測試的 bug：
//   1. 墨滴轉場遮罩沒卸載，15 層墨色圓形蓋住整個籤詩頁；
//   2. 水平 ScrollView 在 Web 上高度塌陷成 5px，整排篩選點不到。
// 兩者的元素都還在 DOM 裡、也都有尺寸，Playwright 的 toBeVisible 全數通過。

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * 檢查某段文字是否真的顯示在畫面上。
 *
 * 比 toBeVisible 嚴格的地方：
 *   - 用 elementFromPoint 確認該點最上層就是它自己或其子孫（沒有被遮罩蓋住）
 *   - 累乘父鏈的 opacity，確認實際不透明度足夠
 */
async function readability(page: Page, text: string) {
  return page.evaluate((needle) => {
    const el = Array.from(document.querySelectorAll('div, span'))
      .filter((e) => e.textContent?.trim() === needle)
      .find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    if (!el) return { found: false, occluded: null, opacity: null, height: null };

    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
    const top = document.elementFromPoint(cx, cy);

    let opacity = 1;
    for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
      opacity *= parseFloat(getComputedStyle(n).opacity || '1');
    }

    return {
      found: true,
      // 被自己或子孫命中才算沒被遮住；祖先也可接受（文字節點常被包一層）
      occluded: !(el.contains(top) || el === top || (top && top.contains(el))),
      opacity: +opacity.toFixed(3),
      height: Math.round(r.height),
    };
  }, text);
}

/**
 * 找出仍覆蓋住畫面的轉場遮罩。
 *
 * 只算堆疊在內容「之上」的（zIndex >= 100）——InkBackground 是每頁的
 * 水墨漸層底，同樣是全螢幕且 pointerEvents none，但它在內容下層，
 * 不該被當成遮罩。
 */
async function fullScreenOverlays(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('div')).filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const z = parseInt(cs.zIndex || '0', 10);
      const coversScreen =
        r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9;
      return coversScreen && z >= 100 && parseFloat(cs.opacity || '1') > 0.1;
    }).length,
  );
}

const PAGES: { path: string; marker: string }[] = [
  { path: '/library', marker: '籤詩圖鑑' },
  { path: '/stats', marker: '吉凶分佈' },
  { path: '/achievements', marker: '成就徽章' },
  { path: '/board', marker: '棋盤佈局' },
];

test.describe('內容可見性', () => {
  for (const { path, marker } of PAGES) {
    test(`${path} 的主要內容沒有被遮蓋`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });

      const r = await readability(page, marker);
      expect(r.found, `${marker} 應存在且有尺寸`).toBe(true);
      expect(r.occluded, `${marker} 被其他元素蓋住`).toBe(false);
      expect(r.opacity, `${marker} 實際不透明度過低`).toBeGreaterThan(0.5);
    });
  }
});

test.describe('轉場遮罩', () => {
  /** 迴歸：籤詩頁的墨滴遮罩曾永久停留，讓核心頁面幾乎全黑 */
  test('籤詩頁載入後不應殘留全螢幕遮罩', async ({ page }) => {
    await page.goto('/draw');
    await page.getByText('綜合', { exact: true }).click();
    await page.getByText('雙棋', { exact: true }).click();
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    await expect
      .poll(() => fullScreenOverlays(page), {
        timeout: 20_000,
        message: '轉場結束後仍有全螢幕遮罩',
      })
      .toBe(0);
  });
});

test.describe('互動元件尺寸', () => {
  /**
   * 迴歸：水平 ScrollView 只給 maxHeight 時，在 Web 上會塌陷成幾像素，
   * 整排篩選 chip 變成點不到的細線——但元素仍在 DOM 中且「可見」。
   */
  test('圖鑑等級篩選列有可點擊的高度', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    const r = await readability(page, '全部');
    expect(r.found).toBe(true);
    // 一般可點擊目標至少要有 20px 高
    expect(r.height, '篩選 chip 高度不足，無法點擊').toBeGreaterThan(20);
  });

  test('棋盤頁問事類別列有可點擊的高度', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    await expect(page.getByText('棋盤佈局')).toBeVisible({ timeout: 15_000 });

    const r = await readability(page, '綜合');
    expect(r.found).toBe(true);
    expect(r.height, '類別 chip 高度不足').toBeGreaterThan(20);
  });

  /** 迴歸：棋盤格子原本依視窗寬度換算，Web 上取不到而縮到最小值 */
  test('桌面寬度下棋盤不應停在最小尺寸', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/board');
    await expect(page.getByText('棋盤佈局')).toBeVisible({ timeout: 15_000 });

    // 棋盤尺寸來自 onLayout 量測，需輪詢等版面收斂
    // 9 條縱線 × 最小格 32px = 288；桌面上應明顯大於此
    await expect
      .poll(() => page.evaluate(() => {
        // 棋盤是那塊木色底（boardBg #B8873C）
        const board = Array.from(document.querySelectorAll('div')).find((e) =>
          getComputedStyle(e).backgroundColor.includes('184, 135, 60'),
        );
        return board ? Math.round(board.getBoundingClientRect().width) : 0;
      }), { timeout: 15_000, message: '棋盤在桌面上仍是最小尺寸' })
      .toBeGreaterThan(350);
  });
});
