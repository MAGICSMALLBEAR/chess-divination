// 收藏頁的狀態篩選 e2e（路線圖 #27）
//
// 首頁與統計頁說「N 筆可以回填了」，在此之前點下去只到最近那一筆，其餘沒有任何出口。
// 這裡驗整條路：不只一筆時點下去到收藏頁、篩選已套好、列出的正是那 N 筆（與首頁同一個數字）；
// 手動改篩選之後再從首頁點一次，篩選要重新套上（參數有被消掉）。

import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

function record(id: string, mode: 'draw' | 'board' | 'lingqi', daysAgo: number, verified = false) {
  const at = Date.now() - daysAgo * DAY;
  return {
    id, mode, timestamp: at,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4,
    ...(verified ? { outcome: { status: 'accurate', verifiedAt: at + DAY } } : {}),
  };
}

// 待回填三筆（預設 14 天）、剛占的一筆、已回填的一筆
const HISTORY = [
  record('p-draw', 'draw', 20),
  record('p-board', 'board', 25),
  record('p-draw2', 'draw', 30),
  record('fresh', 'draw', 2),
  record('done', 'lingqi', 40, true),
];

async function seed(page: Page) {
  await page.addInitScript(([key, recs]) => {
    if (!window.localStorage.getItem(key as string)) window.localStorage.setItem(key as string, JSON.stringify(recs));
  }, [HISTORY_KEY, HISTORY] as const);
}

/** 歷史分頁上看得到的記錄 id（卡片的刪除鈕 testID 帶著 id） */
async function visibleIds(page: Page): Promise<string[]> {
  // 從統計頁（疊在分頁上的 stack 畫面）過來時，DOM 裡可能同時有兩份收藏頁；只看得到的那份算
  const grid = page.getByTestId('card-grid').filter({ visible: true }).first();
  const ids = await grid.locator('[data-testid^="record-delete-"]').evaluateAll(
    els => els.map(el => el.getAttribute('data-testid')!.replace('record-delete-', '')),
  );
  return ids.sort();
}

test.describe('收藏頁篩選（#27）', () => {
  test('首頁「3 筆可以回填」點下去：到收藏頁、已篩好待回填、列的正是那 3 筆', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const prompt = page.getByTestId('pending-verify').filter({ visible: true });
    await expect(prompt).toContainText('3 筆', { timeout: 30_000 });
    await prompt.click();

    await expect(page).toHaveURL(/\/collection/);
    await expect(page.getByTestId('filter-status-pending')).toHaveAttribute('aria-selected', 'true');
    // 篩選鈕上的數字與首頁同一個
    await expect(page.getByTestId('filter-status-pending')).toContainText('3');
    await expect.poll(() => visibleIds(page)).toEqual(['p-board', 'p-draw', 'p-draw2']);
  });

  test('模式與狀態疊加；模式再按一次取消；已回填只列回填過的', async ({ page }) => {
    await seed(page);
    await page.goto('/collection');
    await expect.poll(() => visibleIds(page), { timeout: 30_000 }).toHaveLength(5);

    await page.getByTestId('filter-status-pending').click();
    await page.getByTestId('filter-mode-draw').click();
    await expect.poll(() => visibleIds(page)).toEqual(['p-draw', 'p-draw2']);

    await page.getByTestId('filter-mode-draw').click();
    await expect(page.getByTestId('filter-mode-draw')).toHaveAttribute('aria-selected', 'false');
    await expect.poll(() => visibleIds(page)).toEqual(['p-board', 'p-draw', 'p-draw2']);

    await page.getByTestId('filter-status-verified').click();
    await expect.poll(() => visibleIds(page)).toEqual(['done']);
  });

  test('篩到沒東西：說「篩選條件下沒有記錄」，不說「你還沒有任何記錄」', async ({ page }) => {
    await seed(page);
    await page.goto('/collection');
    await expect.poll(() => visibleIds(page), { timeout: 30_000 }).toHaveLength(5);
    await page.getByTestId('filter-status-verified').click();
    await page.getByTestId('filter-mode-board').click();

    const empty = page.getByTestId('collection-no-match').first();
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('目前的篩選條件下沒有記錄');
  });

  test('手動改掉篩選後，再從首頁點一次：待回填重新套上（用分頁列切換，不重新載入）', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const prompt = page.getByTestId('pending-verify').filter({ visible: true });
    await prompt.click({ timeout: 30_000 });
    await expect(page.getByTestId('filter-status-pending')).toHaveAttribute('aria-selected', 'true');

    await page.getByTestId('filter-status-all').click();
    await expect.poll(() => visibleIds(page)).toHaveLength(5);

    await page.getByRole('tab', { name: '首頁' }).click();
    await page.getByTestId('pending-verify').filter({ visible: true }).click();
    await expect(page.getByTestId('filter-status-pending')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => visibleIds(page)).toEqual(['p-board', 'p-draw', 'p-draw2']);
  });

  test('統計頁那一行也走同一條路', async ({ page }) => {
    await seed(page);
    await page.goto('/stats');
    await page.getByTestId('stats-pending').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/collection/);
    await expect.poll(() => visibleIds(page)).toEqual(['p-board', 'p-draw', 'p-draw2']);
  });
});
