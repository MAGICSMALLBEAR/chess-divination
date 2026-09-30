// 籤詩譯文延遲載入 e2e（S95）
//
// 英／日籤詩譯文拆成獨立 chunk，切語言時才下載，載完由 setLang 再通知一次重繪。
// 單元測試在 Jest 裡直接注入資料（VM 不支援 import()），碰不到真正的動態載入；
// 這裡守的是瀏覽器裡那條路：chunk 真的抓得到、抓到後畫面真的從原文換成譯文。
// 兩條分別走「重開 App 時由已存設定載入」與「同一個 session 在設定頁切換」。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';

test.describe('籤詩譯文延遲載入', () => {
  test('已存英文設定重開 App：圖鑑第一首是英文籤題，不停在中文原文', async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );
    await page.goto('/library');

    const card = page.getByTestId('poem-card-1');
    await expect(card).toContainText('Dragon Soars the Heavens', { timeout: 30_000 });
    await expect(card).not.toContainText('龍騰九霄');
  });

  test('同一個 session 在設定頁切成日文，不重新載入頁面，圖鑑就是日文籤題', async ({ page }) => {
    await page.goto('/settings');
    await page.getByText('日本語', { exact: true }).click();
    // 用 App 內的連結前往，確保是客戶端導航而非整頁重載
    await page.getByText('占い図鑑').click();

    const card = page.getByTestId('poem-card-1');
    await expect(card).toContainText('龍 九霄に騰がる', { timeout: 30_000 });
    await expect(card).not.toContainText('龍騰九霄');
  });

  test.describe('譯文 chunk 被拖慢', () => {
  // Service Worker 代抓的請求不經過 page.route，不封鎖就攔不住
  test.use({ serviceWorkers: 'block' });

  test('譯文還沒載完就先打字搜尋：載完後結果自己更新，不必再改一次搜尋字', async ({ page }) => {
    // 攔住譯文 chunk，把「語言已切、譯文未到」這段時間拉長到測得到
    let held = true;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = () => { held = false; resolve(); }; });
    let intercepted = 0;
    await page.route(/\/poems-[0-9a-f]+\.js/, async route => {
      intercepted++;
      if (held) await gate;
      await held;
      await route.continue();
    });

    await page.goto('/settings');
    await page.getByText('日本語', { exact: true }).click();
    await page.getByText('占い図鑑').click();

    // 只有日文譯文裡有的字：譯文未到時比對的是中文原文，所以一首都沒有
    await page.getByPlaceholder('詩を検索...').fill('九霄に騰がる');
    await expect(page.getByTestId('poem-card-1')).toHaveCount(0, { timeout: 30_000 });

    // 確認真的攔到了，否則上面的 0 筆可能是別的原因
    expect(intercepted).toBeGreaterThan(0);
    release();
    await expect(page.getByTestId('poem-card-1')).toContainText('龍 九霄に騰がる', { timeout: 30_000 });
  });
  });
});
