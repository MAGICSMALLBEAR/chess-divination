// 預測校準 e2e
//
// 單元測試（calibration.test.ts）驗的是分數怎麼算；這裡驗使用者真的走得通：
// 三個模式都在「看到卦之前」問得到直覺、而且真的存進記錄；回填時多問的那一題只對記過直覺的
// 記錄出現；統計頁把數字說出來、樣本不足時不說。
//
// 「同一個功能的第二、第三個入口最容易被漏掉」（S47／S57），所以抽棋、棋盤、靈棋各走一次。

import { test, expect, HISTORY_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

async function storedRecords(page: Page) {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), HISTORY_KEY) as Promise<
    { id: string; intuition?: number; outcome?: { status: string; realized?: string } }[]
  >;
}

async function seedHistory(page: Page, records: unknown[]) {
  await page.addInitScript(
    ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
    [HISTORY_KEY, records] as const,
  );
}

function scored(id: string, intuition: number, realized: string, poemLevel: string, status = 'accurate') {
  return {
    id, poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel,
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4, mode: 'draw',
    timestamp: Date.now() - 20 * DAY,
    intuition,
    outcome: { status, verifiedAt: Date.now() - DAY, ...(realized ? { realized } : {}) },
  };
}

test.describe('占卜前的直覺', () => {
  test('抽棋：選了直覺才存進記錄；回填時多問事情結果，只選它不給存；存下後兩者分開記', async ({ page }) => {
    await page.goto('/draw');
    const pick70 = page.getByTestId('intuition-70');
    await expect(pick70).toBeVisible({ timeout: 30_000 });

    // 再點一次同一檔是取消（選填、不能變成門檻）
    await pick70.click();
    await expect(pick70).toHaveAttribute('aria-selected', 'true');
    await pick70.click();
    await expect(pick70).toHaveAttribute('aria-selected', 'false');
    await pick70.click();

    await page.getByText('雙棋', { exact: true }).click();
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect.poll(async () => (await storedRecords(page))[0]?.intuition).toBe(70);

    // 回填表單：記過直覺，所以多一列「事情本身的結果」，並帶出當初的 70%
    const realizedRow = page.getByTestId('outcome-realized');
    await expect(realizedRow).toBeVisible({ timeout: 30_000 });
    await expect(realizedRow).toContainText('70%');

    // 只選事情結果、沒選占驗：不給存，並說明為什麼（否則它會被靜靜丟掉）
    await page.getByTestId('realized-yes').click();
    await expect(page.getByTestId('realized-needs-status')).toBeVisible();
    const save = page.getByTestId('outcome-save');
    await expect(save).toHaveAttribute('aria-disabled', 'true');
    await save.click({ force: true });
    await expect.poll(async () => (await storedRecords(page))[0]?.outcome).toBeUndefined();

    // 卦沒說中、事情卻如願了——兩個問題分開記，這正是這個功能要量的
    await page.getByRole('button', { name: '未應驗', exact: true }).click();
    await expect(page.getByTestId('realized-needs-status')).toHaveCount(0);
    await save.click();
    await expect.poll(async () => (await storedRecords(page))[0]?.outcome)
      .toMatchObject({ status: 'inaccurate', realized: 'yes' });
    await expect(page.getByTestId('outcome-intuition')).toContainText('70%');
    await expect(page.getByTestId('outcome-intuition')).toContainText('如願');

    // 回到抽棋頁：用過的直覺清掉了，下一次占卜是另一件事
    await page.goBack();
    await expect(page.getByTestId('intuition-70')).toHaveAttribute('aria-selected', 'false', { timeout: 30_000 });
  });

  test('沒選直覺：記錄上沒有這個欄位，回填表單也不多問', async ({ page }) => {
    await page.goto('/draw');
    await page.getByText('單棋', { exact: true }).click({ timeout: 30_000 });
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect.poll(async () => (await storedRecords(page)).length).toBe(1);
    expect('intuition' in (await storedRecords(page))[0]).toBe(false);
    await expect(page.getByRole('button', { name: '未應驗', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('outcome-realized')).toHaveCount(0);
  });

  test('棋盤：解讀那一刻寫進記錄', async ({ page }) => {
    await page.goto('/board');
    await page.getByTestId('intuition-90').click({ timeout: 30_000 });
    await page.getByText('三才時間陣', { exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('tray-piece-selectable').first().click();
      await page.getByTestId('board-drop-target').click();
    }
    await page.getByText('解讀佈局', { exact: true }).click();
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect.poll(async () => (await storedRecords(page))[0]?.intuition).toBe(90);
  });

  test('靈棋：擲出那一刻寫進記錄，擲出後選項收起', async ({ page }) => {
    await page.goto('/lingqi');
    await page.getByTestId('intuition-30').click({ timeout: 30_000 });
    await page.getByTestId('lingqi-cast').click();
    await expect.poll(async () => (await storedRecords(page))[0]?.intuition).toBe(30);
    await expect(page.getByTestId('intuition-picker')).toHaveCount(0);
    // 同一頁的回填表單同樣多問事情結果（第二個入口）
    await expect(page.getByTestId('outcome-realized')).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('統計頁：直覺校準', () => {
  test('樣本足夠：分數與 50% 對照、逐檔表、卦與直覺在同一批上並列', async ({ page }) => {
    await seedHistory(page, [
      scored('a', 90, 'yes', '大吉'),   // 卦對、直覺對
      scored('b', 90, 'yes', '大吉'),   // 卦對、直覺對
      scored('c', 70, 'no', '大吉'),    // 卦錯、直覺錯
      scored('d', 30, 'no', '下下'),    // 卦對、直覺對
      scored('e', 10, 'no', '下下'),    // 卦對、直覺對
      scored('f', 70, 'partial', '中平'), // 不進並列
    ]);
    await page.goto('/stats');
    const card = page.getByTestId('calibration');
    await expect(card).toBeVisible({ timeout: 30_000 });
    // (0.01+0.01+0.49+0.09+0.01+0.04)/6 = 0.11；每次都選 50%：(0.25×5+0)/6 = 0.21
    await expect(page.getByTestId('calibration-brier')).toContainText('6 筆的直覺分數：0.11');
    await expect(page.getByTestId('calibration-brier')).toContainText('0.21');
    await expect(page.getByTestId('calibration-row-90')).toContainText('實際如願 100%');
    await expect(page.getByTestId('calibration-row-70')).toContainText('實際如願 25%');
    await expect(page.getByTestId('calibration-row-50')).toHaveCount(0);
    await expect(page.getByTestId('calibration-h2h')).toContainText('同樣這 5 筆');
    await expect(page.getByTestId('calibration-h2h')).toContainText('卦的方向對了 4 筆，你的直覺對了 4 筆');
  });

  test('樣本不足：只說還差多少，不給分數；記了直覺還沒回填的另外說', async ({ page }) => {
    const awaiting = { ...scored('w', 70, '', '大吉'), outcome: undefined };
    await seedHistory(page, [scored('a', 90, 'yes', '大吉'), scored('b', 30, 'no', '下下'), awaiting]);
    await page.goto('/stats');
    await expect(page.getByTestId('calibration-locked')).toContainText('目前 2 筆', { timeout: 30_000 });
    await expect(page.getByTestId('calibration-awaiting')).toContainText('另有 1 筆');
    await expect(page.getByTestId('calibration-brier')).toHaveCount(0);
  });

  test('英文：說明沒有殘留中文', async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );
    await page.goto('/stats');
    await expect(page.getByTestId('calibration')).toContainText('Gut-Feeling Calibration', { timeout: 30_000 });
    expect(await page.getByTestId('calibration').innerText()).not.toMatch(/[一-鿿]/);
  });
});
