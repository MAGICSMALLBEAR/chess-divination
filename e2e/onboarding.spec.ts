// E2E：首次啟動引導
//
// 這裡刻意不使用 fixtures 的「已完成引導」注入，
// 測的正是全新使用者第一次開啟 App 看到的畫面。

import { test, expect } from '@playwright/test';

test.describe('首次啟動', () => {
  test('全新使用者會看到引導頁', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('歡迎來到象棋占卜')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('跳過')).toBeVisible();
  });

  test('跳過引導後進入主畫面', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('跳過')).toBeVisible({ timeout: 15_000 });

    await page.getByText('跳過').click();

    // 引導不再出現
    await expect(page.getByText('歡迎來到象棋占卜')).toBeHidden({ timeout: 15_000 });
  });

  test('完成引導後設定會被記住', async ({ page }) => {
    await page.goto('/');
    await page.getByText('跳過').click({ timeout: 15_000 });
    await expect(page.getByText('歡迎來到象棋占卜')).toBeHidden({ timeout: 15_000 });

    // 重新載入不應再回到引導
    await page.reload();
    await expect(page.getByText('歡迎來到象棋占卜')).toBeHidden({ timeout: 15_000 });
  });

  test('可逐步瀏覽引導頁', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('歡迎來到象棋占卜')).toBeVisible({ timeout: 15_000 });

    await page.getByText('下一步').click();

    // 進入下一步後，第一頁的文案應消失
    await expect(page.getByText('歡迎來到象棋占卜')).toBeHidden({ timeout: 10_000 });
  });
});
