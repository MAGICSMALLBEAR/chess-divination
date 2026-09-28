// 容量與時間軸 e2e（S92：路線圖 #31、#32）
//
// #31：記錄快滿時首頁要先講——滿了之後才刪，不能是使用者第一次知道有上限的時候。
// #32：待回填只數滿期 90 天內的；很久以前沒回填的那些不再掛在首頁。

import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

function record(id: string, daysAgo: number) {
  return {
    id, mode: 'draw', timestamp: Date.now() - daysAgo * DAY,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4,
  };
}

async function seed(page: Page, recs: unknown[]) {
  await page.addInitScript(([key, data]) => {
    if (!window.localStorage.getItem(key as string)) window.localStorage.setItem(key as string, JSON.stringify(data));
  }, [HISTORY_KEY, recs] as const);
}

test.describe('記錄快滿的提醒（#31）', () => {
  test('450 筆起首頁說出筆數與上限，點下去到設定頁', async ({ page }) => {
    // 全部 1 天前：不觸發待回填卡，畫面上只有這一張提示
    await seed(page, Array.from({ length: 450 }, (_, i) => record(`r${i}`, 1)));
    await page.goto('/');
    const card = page.getByTestId('history-capacity').filter({ visible: true });
    await expect(card).toContainText('記錄已有 450 筆，上限 500 筆', { timeout: 30_000 });
    await card.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('449 筆時不出現', async ({ page }) => {
    await seed(page, Array.from({ length: 449 }, (_, i) => record(`r${i}`, 1)));
    await page.goto('/');
    // 等首頁讀完歷史（最近占卜出現）再斷言卡片不在，否則是在資料載入前就空過
    await expect(page.getByText('最近占卜').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('history-capacity')).toHaveCount(0);
  });
});

test.describe('待回填的年齡上限（#32）', () => {
  test('一年前沒回填的不算；滿期 90 天內的照算', async ({ page }) => {
    // 預設 14 天：20 天前的算、104 天前（滿期 90 天）的算、105 天與 365 天前的不算
    await seed(page, [record('d20', 20), record('d104', 104), record('d105', 105), record('d365', 365)]);
    await page.goto('/');
    await expect(page.getByTestId('pending-verify').filter({ visible: true })).toContainText('2 筆', { timeout: 30_000 });
  });
});
