// 靈棋十二子的 E2E
//
// 為什麼要在真瀏覽器測而不只靠單元測試：這條流程的價值在於「擲完真的看得到
// 卦辭、而且那一次真的進了歷史記錄」。單元測試驗得了 lingqiOracle 與
// recordFromLingqi，驗不了畫面有沒有把它們接起來——Session 42 留下的原型
// 正是每一塊都對、就是沒有卦辭。

import { test, expect } from './fixtures';
import { HISTORY_KEY } from './fixtures';

/** 擲一次並等結果出現 */
async function cast(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('lingqi-cast')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('lingqi-cast').click();
  await expect(page.getByTestId('lingqi-result')).toBeVisible({ timeout: 30_000 });
}

test.describe('靈棋十二子', () => {
  test('擲卦後看得到卦名與卦辭本文，不是只有卦目標記', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const result = page.getByTestId('lingqi-result');
    // 卦名一律以「卦」字結尾（大通卦、漸泰卦……），象以「之象」結尾
    await expect(result.getByText(/卦$/).first()).toBeVisible();
    await expect(result.getByText(/之象$/).first()).toBeVisible();

    // 象曰與詩曰兩段都要在——原型只印卦目標記，這兩段就是這次補的東西
    await expect(result.getByText('象曰')).toBeVisible();
    await expect(result.getByText('詩曰')).toBeVisible();

    // 卦辭本文得有實際字句，而不是只有段落標題。
    // 取結果區的全部文字，扣掉標籤後仍應有相當篇幅的漢字。
    const text = (await result.innerText()).replace(/象曰|詩曰|又曰/g, '');
    expect(text.replace(/[^一-鿿]/g, '').length).toBeGreaterThan(40);
  });

  test('擲出的卦進入歷史記錄，且標題是卦名而非籤詩', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const history = await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]'),
      HISTORY_KEY,
    );
    expect(history).toHaveLength(1);
    expect(history[0].mode).toBe('lingqi');
    expect(history[0].lingqiKey).toMatch(/^[0-4]-[0-4]-[0-4]$/);
    // poemId 0 是刻意的——它不可被拿去查籤詩表，見 services/poemList.ts
    expect(history[0].poemId).toBe(0);
    expect(history[0].poemLevel).toBe('');
    expect(history[0].poemTitle).toMatch(/卦$/);

    // 畫面上顯示的標題就是那個卦名，不是籤詩 #1「龍騰九霄」
    await expect(page.getByTestId('lingqi-result')).not.toContainText('龍騰九霄');
  });

  test('再擲一次回到問事畫面，不會停在上一卦', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);
    await page.getByTestId('lingqi-recast').click();
    await expect(page.getByTestId('lingqi-result')).toHaveCount(0);
    await expect(page.getByTestId('lingqi-cast')).toBeVisible();
  });

  test('收藏鈕會寫進記錄，再按一次取消', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const isFavorited = () => page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].isFavorited,
      HISTORY_KEY,
    );
    expect(await isFavorited()).toBe(false);

    await page.getByTestId('lingqi-favorite').click();
    await expect.poll(isFavorited).toBe(true);

    await page.getByTestId('lingqi-favorite').click();
    await expect.poll(isFavorited).toBe(false);
  });

  test('分享在 Web 端降級為文字，內容是卦辭而非籤詩版式', async ({ page }) => {
    // Web 端截不了圖也沒有系統分享選單，會一路降到「LINE / 複製」的詢問。
    // 取消 → 複製到剪貼簿，這裡攔下剪貼簿內容看它寫了什麼。
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/lingqi');
    await cast(page);

    const notation = await page.getByTestId('lingqi-result').innerText();
    const name = notation.match(/(\S+卦)/)![1];

    // 會連跳兩個原生對話框：先 confirm（LINE？取消則複製），複製完再 alert 告知。
    // 用常駐 handler 而非 page.once——只接第一個的話，第二個會落到 Playwright
    // 的自動關閉上，而複製與通知之間的時序就此變成看運氣（這條原本就是這樣 flaky 的）。
    page.on('dialog', d => (d.type() === 'confirm' ? d.dismiss() : d.accept()));
    await page.getByTestId('lingqi-share').click();

    // 剪貼簿是在對話框關掉之後才寫入的，點擊 resolve 不代表已經寫完
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
    await expect.poll(clipboard).toContain(name);

    const copied = await clipboard();
    // 靈棋沒有吉凶等級與棋子——籤詩版式的這兩段不該出現
    expect(copied).not.toContain('抽得：');
    expect(copied).not.toMatch(/】\s*·/);
  });

  test('首頁最近紀錄點靈棋那筆，回到靈棋頁而不是 reveal 頁', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);
    const notation = await page.getByTestId('lingqi-result').innerText();

    await page.goto('/');
    // 最近紀錄那一列印的是卦名；點進去該回到靈棋頁並還原同一卦
    const title = (await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].poemTitle,
      HISTORY_KEY,
    )) as string;
    await page.getByText(title, { exact: true }).first().click();

    await expect(page.getByTestId('lingqi-result')).toBeVisible({ timeout: 30_000 });
    // 還原的是同一卦，不是重擲一次
    expect(await page.getByTestId('lingqi-result').innerText()).toContain(title);
    expect(notation).toContain(title);
  });
});
