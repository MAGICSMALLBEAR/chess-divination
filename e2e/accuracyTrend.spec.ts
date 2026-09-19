// 應驗率趨勢圖（路線圖 #10）e2e
//
// 單元測試（verification.test.ts）驗的是 accuracyTrend() 算得對不對；這裡驗的是
// 使用者真的看得到、而且看到的是誠實的東西：資料不夠時不畫一條只有雜訊的線、
// 夠了才畫，摘要只陳述兩個數字、旁邊一定附上「樣本少、起伏大」的提醒，
// 而且日期篩選（本週）不會把這條以時間為橫軸的折線砍成一兩個點。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

/** 依序造已回填記錄：第 0 筆最早，最後一筆是昨天 */
function verifiedSeries(statuses: ('accurate' | 'partial' | 'inaccurate')[]) {
  return statuses.map((status, i) => {
    const at = Date.now() - (statuses.length - i) * DAY;
    return {
      poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
      drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
      isFavorited: false, engineVersion: 4, mode: 'draw',
      id: `s${i}`, timestamp: at, outcome: { status, verifiedAt: at + 3600_000 },
    };
  });
}

async function seedHistory(page: Page, records: unknown[]) {
  await page.addInitScript(
    ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
    [HISTORY_KEY, records] as const,
  );
}

const X = 'inaccurate' as const;
const A = 'accurate' as const;

test.describe('應驗率趨勢圖', () => {
  test('已回填不足兩個視窗量：不畫線，告訴使用者還差幾筆', async ({ page }) => {
    // 9 筆：差 1 筆
    await seedHistory(page, verifiedSeries([X, X, X, X, X, A, A, A, A]));

    await page.goto('/stats');
    const locked = page.getByTestId('accuracy-trend-locked');
    await expect(locked).toBeVisible({ timeout: 30_000 });
    await expect(locked).toContainText('9');
    await expect(locked).toContainText('1');
    // 沒有摘要、沒有折線
    await expect(page.getByTestId('accuracy-trend-summary')).toHaveCount(0);
    await expect(page.getByTestId('accuracy-trend').locator('polyline')).toHaveCount(0);
  });

  test('剛好夠：畫出 6 個點的折線，摘要只陳述最早與最近，並附上樣本少的提醒', async ({ page }) => {
    // 前 5 筆全錯、後 5 筆全對：視窗由 0% 走到 100%
    await seedHistory(page, verifiedSeries([X, X, X, X, X, A, A, A, A, A]));

    await page.goto('/stats');
    const summary = page.getByTestId('accuracy-trend-summary');
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await expect(summary).toContainText('0%');
    await expect(summary).toContainText('100%');

    // 折線真的畫出來，而且是 6 個座標點（10 筆、視窗 5、每次前進一筆）
    const line = page.getByTestId('accuracy-trend').locator('polyline');
    await expect(line).toHaveCount(1);
    const points = (await line.getAttribute('points')) ?? '';
    expect(points.trim().split(/\s+/)).toHaveLength(6);
    await expect(page.getByTestId('accuracy-trend').locator('circle')).toHaveCount(6);

    // 誠實邊界寫在畫面上：提醒一定在，而且摘要沒有下「變準了」這類結論
    await expect(page.getByTestId('accuracy-trend-note')).toContainText('起伏大');
    await expect(summary).not.toContainText('進步');
    await expect(summary).not.toContainText('變準');
    await expect(page.getByTestId('accuracy-trend-locked')).toHaveCount(0);
  });

  /**
   * 橫軸本來就是時間。若跟著「本週」篩選走，這 10 筆裡只剩昨天前後的幾筆，
   * 折線會被砍成一兩個點甚至整條消失——與待回填那一行不吃篩選是同一個理由。
   */
  test('日期篩選（本週）不影響趨勢圖', async ({ page }) => {
    await seedHistory(page, verifiedSeries([X, X, X, X, X, A, A, A, A, A]));

    await page.goto('/stats');
    await expect(page.getByTestId('accuracy-trend-summary')).toBeVisible({ timeout: 30_000 });

    await page.getByText('本週').filter({ visible: true }).first().click();
    await expect(page.getByTestId('accuracy-trend-summary')).toContainText('100%');
    await expect(page.getByTestId('accuracy-trend').locator('circle')).toHaveCount(6);
  });

  /**
   * 圖寬取自容器的量測值。第一版沒把容器寬度釘死、也漏扣邊框，容器每次量測就被撐寬
   * 2px 以上，再量測、再撐寬——寬度無限增長。**所有斷言都綠**（元素看得到、折線有
   * 6 個點、文字對），只有截圖前的「元素不穩定」才露餡。所以這裡直接量：
   * 畫完之後的一秒內，容器與圖的寬度不准再變。
   */
  test('圖表寬度穩定：沒有「量測寬度 → 撐寬容器 → 再量測」的回饋迴圈', async ({ page }) => {
    await seedHistory(page, verifiedSeries([X, X, X, X, X, A, A, A, A, A]));

    await page.goto('/stats');
    const chart = page.getByTestId('accuracy-trend');
    await expect(page.getByTestId('accuracy-trend-summary')).toBeVisible({ timeout: 30_000 });
    // 等量測收斂：先取一次，再過一段時間取一次
    await page.waitForTimeout(600);

    const widths: number[] = [];
    for (let i = 0; i < 6; i++) {
      const box = await chart.boundingBox();
      const svg = await chart.locator('svg').first().boundingBox();
      widths.push(Math.round(box!.width), Math.round(svg!.width));
      await page.waitForTimeout(150);
    }
    expect(new Set(widths.filter((_, i) => i % 2 === 0)).size).toBe(1);   // 容器
    expect(new Set(widths.filter((_, i) => i % 2 === 1)).size).toBe(1);   // 圖
  });

  test('切成英文：標題與提醒都是英文，術語沒有殘留中文', async ({ page }) => {
    await seedHistory(page, verifiedSeries([X, X, X, X, X, A, A, A, A, A]));
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );

    await page.goto('/stats');
    const chart = page.getByTestId('accuracy-trend');
    await expect(chart).toContainText('Accuracy Trend', { timeout: 30_000 });
    await expect(page.getByTestId('accuracy-trend-note')).toContainText('swings a lot');
    expect(await chart.innerText()).not.toMatch(/[一-鿿]/);
  });
});
