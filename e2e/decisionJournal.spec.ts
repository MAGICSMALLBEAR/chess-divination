// 決策日誌 e2e
//
// 單元測試（storage／poemList／aiPrompt）驗整理、搜尋與不進 AI；這裡驗使用者走得通：
// 三個模式都在「看到卦之前」寫得下日誌、真的存進記錄、在回填區正上方讀得到；沒寫就不畫空框。
// 「同一個功能的第二、第三個入口最容易被漏掉」（S47／S57），所以抽棋、棋盤、靈棋各走一次。

import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

async function firstRecord(page: Page) {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]')[0], HISTORY_KEY) as Promise<
    { decisionJournal?: Record<string, string> } | undefined
  >;
}

test.describe('決策日誌', () => {
  test('抽棋：重抽不會弄丟日誌；揭曉頁在回填區上方讀得到，空白欄位不存', async ({ page }) => {
    await page.goto('/draw');
    await page.getByTestId('journal-expectation').fill('  主管會同意  ', { timeout: 30_000 });
    await page.getByTestId('journal-nextStep').fill('週五前寄提案');
    await page.getByText('單棋', { exact: true }).click();
    // 重抽回到選擇畫面：日誌是在存檔那一刻才收，重抽不該清掉它
    await page.getByText('重新抽取').click({ timeout: 30_000 });
    await expect(page.getByTestId('journal-expectation')).toHaveValue('  主管會同意  ');
    await page.getByText('雙棋', { exact: true }).click();
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    await expect.poll(async () => (await firstRecord(page))?.decisionJournal)
      .toEqual({ expectation: '主管會同意', nextStep: '週五前寄提案' });
    const view = page.getByTestId('decision-journal-record');
    await expect(view).toContainText('當時的決策日誌', { timeout: 30_000 });
    await expect(page.getByTestId('journal-record-expectation')).toContainText('主管會同意');
    await expect(page.getByTestId('journal-record-evidence')).toHaveCount(0);
    // 在回填區之前（回填的儲存鈕在它下方）
    const [viewBox, outcomeBox] = await Promise.all([
      view.boundingBox(), page.getByTestId('outcome-save').filter({ visible: true }).first().boundingBox(),
    ]);
    expect(viewBox!.y).toBeLessThan(outcomeBox!.y);
  });

  test('抽棋：什麼都沒寫——記錄上沒有這個欄位，揭曉頁不畫空框', async ({ page }) => {
    await page.goto('/draw');
    await page.getByTestId('journal-evidence').fill('   ', { timeout: 30_000 });
    await page.getByText('單棋', { exact: true }).click();
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect.poll(async () => (await firstRecord(page)) !== undefined).toBe(true);
    expect(await firstRecord(page)).not.toHaveProperty('decisionJournal');
    await expect(page.getByTestId('outcome-save').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('decision-journal-record')).toHaveCount(0);
  });

  test('棋盤：解讀那一刻寫進記錄', async ({ page }) => {
    await page.goto('/board');
    await page.getByTestId('journal-evidence').fill('上週口頭答應', { timeout: 30_000 });
    await page.getByText('三才時間陣', { exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('tray-piece-selectable').first().click();
      await page.getByTestId('board-drop-target').click();
    }
    await page.getByText('解讀佈局', { exact: true }).click();
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect.poll(async () => (await firstRecord(page))?.decisionJournal).toEqual({ evidence: '上週口頭答應' });
    await expect(page.getByTestId('journal-record-evidence')).toContainText('上週口頭答應', { timeout: 30_000 });
  });

  test('靈棋：擲出那一刻寫進記錄，同一頁讀得到', async ({ page }) => {
    await page.goto('/lingqi');
    await page.getByTestId('journal-expectation').fill('搬家順利', { timeout: 30_000 });
    await page.getByTestId('lingqi-cast').click();
    await expect.poll(async () => (await firstRecord(page))?.decisionJournal).toEqual({ expectation: '搬家順利' });
    await expect(page.getByTestId('journal-record-expectation')).toContainText('搬家順利', { timeout: 30_000 });
    // 擲出後表單收起（與直覺選項一起），不會讓人以為還能改
    await expect(page.getByTestId('decision-journal-form')).toHaveCount(0);
  });
});
