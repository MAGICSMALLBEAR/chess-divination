// 抽棋的隨機性 e2e
//
// 單元測試（drawTally.test.ts）驗檢定與計數；這裡驗兩件單元測試碰不到的事：
//   1. 抽棋頁真的在「抽出的那一刻」計數——按「重新抽取」丟掉的那一次也算。
//      只數歷史記錄的話，量到的是使用者留下了哪幾次，不是亂數
//   2. 統計頁照樣本量說話：不足門檻只說還差幾顆，滿了才給檢定結果

import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const TALLY_KEY = '@chess_divination_draw_tally';

async function storedTotal(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw).counts as number[]).reduce((a, b) => a + b, 0) : 0;
  }, TALLY_KEY);
}

function seedTally(page: Page, counts: number[]) {
  return page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [TALLY_KEY, JSON.stringify({ counts })] as const,
  );
}

test.describe('抽棋的隨機性', () => {
  test('抽了又重抽：兩次都計入（丟掉的那次也算），而且沒有存成占卜記錄', async ({ page }) => {
    await page.goto('/draw');
    await page.getByText('綜合', { exact: true }).click({ timeout: 30_000 });
    await page.getByText('雙棋', { exact: true }).click();
    await expect.poll(() => storedTotal(page)).toBe(2);

    await page.getByText('重新抽取').click({ timeout: 30_000 });
    await page.getByText('三棋', { exact: true }).click();
    await expect.poll(() => storedTotal(page)).toBe(5);
    // 兩次都沒按「揭露籤詩」：歷史記錄是空的——計數與記錄是兩回事
    expect(await page.evaluate((key) => window.localStorage.getItem(key), HISTORY_KEY)).toBeNull();

    await page.goto('/stats');
    await expect(page.getByTestId('randomness-verdict')).toContainText('目前抽了 5 顆', { timeout: 30_000 });
    await expect(page.getByTestId('randomness-verdict')).toContainText('要到 160 顆');
  });

  test('沒抽過：說明從這一版開始計數，不列空表', async ({ page }) => {
    await page.goto('/stats');
    await expect(page.getByTestId('randomness-empty')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('randomness-table')).toHaveCount(0);
    // 說明句裡的棋子數由棋盤組成算出（乾坤各 1、艮兌各 7）
    await expect(page.getByTestId('randomness')).toContainText('乾、坤各只有 1 顆');
    await expect(page.getByTestId('randomness')).toContainText('兌、艮各有 7 顆');
  });

  test('照棋盤組成抽滿 320 顆：列出八卦的實際與預期，檢定說相符', async ({ page }) => {
    // 乾1 兌7 離4 震4 巽4 坎4 艮7 坤1，各乘 10
    await seedTally(page, [10, 70, 40, 40, 40, 40, 70, 10]);
    await page.goto('/stats');
    await expect(page.getByTestId('randomness-verdict')).toContainText('與棋盤組成的預期相符', { timeout: 30_000 });
    await expect(page.getByTestId('randomness-verdict')).toContainText('p = 1.00');
    await expect(page.getByTestId('randomness-row-0')).toContainText('3%（10）');
    await expect(page.getByTestId('randomness-row-1')).toContainText('22%（70）');
  });

  test('八卦各抽一樣多（不照棋盤）：檢定說偏離，但不說抽取壞了', async ({ page }) => {
    await seedTally(page, Array(8).fill(40));
    await page.goto('/stats');
    const verdict = page.getByTestId('randomness-verdict');
    await expect(verdict).toContainText('差距大於一般的隨機起伏', { timeout: 30_000 });
    await expect(verdict).toContainText('p < 0.01');
    await expect(verdict).toContainText('也有 5% 的機會');
  });
});
