// 備份缺漏的出口 e2e
//
// 單元測試（backup.test.ts）驗的是服務層「把缺漏帶出來」；這裡驗使用者真的
// 讀得到那句話——這正是這次修掉的缺陷本身：`skippedKeys` 從 S?? 就在備份檔
// 裡，卻沒有任何一條路把它送到畫面，少了整整一類資料的人看到的仍是乾乾淨淨
// 的「還原成功」。
//
// 兩個時機各驗一次：備份當下（換機前先備份、然後清掉舊裝置的人，等到還原
// 才講就太晚了）與還原當下。另外驗一份完整的備份仍然只說「還原成功」——
// 每次都喊狼來了，等於沒有人會再讀這句提示。

import fs from 'fs';
import { test, expect, SETTINGS_KEY, HISTORY_KEY } from './fixtures';

/** AsyncStorage 在 Web 端直接以此鍵名寫入 localStorage（見 fixtures.ts） */
const LEARNING_KEY = '@chess_divination_learning';

/** 產生一份備份檔內容；`skippedKeys` 省略時代表完整的備份 */
function backupJson(skippedKeys?: string[]): string {
  return JSON.stringify({
    version: 1,
    date: '2026-09-27T00:00:00.000Z',
    data: { [HISTORY_KEY]: [{ id: 'e2e-restored' }] },
    ...(skippedKeys ? { skippedKeys } : {}),
  });
}

/**
 * 收集 alert 的內容。
 *
 * confirm 一律接受（還原前的那道確認），alert 只記錄內容——
 * 沒有註冊 handler 時 Playwright 會自動關掉對話框，訊息就消失了。
 */
function captureDialogs(page: import('@playwright/test').Page): string[] {
  const alerts: string[] = [];
  page.on('dialog', d => {
    if (d.type() === 'alert') alerts.push(d.message());
    d.accept();
  });
  return alerts;
}

/** 還原一份備份檔，回傳 App 跳出的訊息 */
async function restore(page: import('@playwright/test').Page, json: string): Promise<string[]> {
  const alerts = captureDialogs(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('還原資料', { exact: true }).click();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect.poll(() => alerts.length).toBeGreaterThan(0);
  return alerts;
}

test.describe('備份缺漏', () => {
  test('還原少了學習進度的備份：說出少了什麼，而不是只說「還原成功」', async ({ page }) => {
    await page.goto('/settings');
    const alerts = await restore(page, backupJson([LEARNING_KEY]));

    const message = alerts.join('\n');
    expect(message).toContain('還原完成，但這份備份少了資料');
    // 內部鍵印給使用者看等於沒說
    expect(message).not.toContain('@chess_divination');
    expect(message).toContain('易經學習');
    // 能還原的部分還是要還原——缺漏不是拒絕還原的理由
    const history = await page.evaluate(key => JSON.parse(window.localStorage.getItem(key) ?? '[]'), HISTORY_KEY);
    expect(history).toEqual([{ id: 'e2e-restored' }]);
  });

  test('完整的備份仍然只說「還原成功」', async ({ page }) => {
    await page.goto('/settings');
    const alerts = await restore(page, backupJson());

    expect(alerts.join('\n')).toContain('還原成功');
    expect(alerts.join('\n')).not.toContain('少了資料');
  });

  test('備份的當下就講缺漏，且下載的檔案裡沒有那筆壞資料', async ({ page }) => {
    await page.goto('/settings');
    // 讀不到的鍵：產生備份時才 parse，當下才知道壞了
    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value),
      [LEARNING_KEY, '{壞掉的 JSON'] as const);

    const alerts = captureDialogs(page);
    const download = page.waitForEvent('download');
    await page.getByText('備份資料', { exact: true }).click();
    const file = await download;

    await expect.poll(() => alerts.length).toBeGreaterThan(0);
    const message = alerts.join('\n');
    expect(message).toContain('備份成功');
    expect(message).not.toContain('@chess_divination');
    expect(message).toContain('易經學習');

    // 壞掉的原文不進備份檔——還原時會再 parse 一次，等於把問題帶著走
    const parsed = JSON.parse(fs.readFileSync((await file.path())!, 'utf-8'));
    expect(parsed.skippedKeys).toEqual([LEARNING_KEY]);
    expect(parsed.data[LEARNING_KEY]).toBeNull();
    expect(parsed.data[SETTINGS_KEY]).toBeTruthy();
  });
});
