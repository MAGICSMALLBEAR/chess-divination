// 今日曆法卡 e2e
//
// 單元測試（calendar.test.ts）驗農曆、節氣、月建各自算得對；這裡驗首頁真的把它說出來，
// 而且日期固定得住：用 Playwright 的假時鐘＋固定時區，否則測試結果會隨跑的那一天改變。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';

test.use({ timezoneId: 'Asia/Taipei' });

test.describe('今日曆法', () => {
  test('2026-09-25：農曆八月十五、秋分後、酉月金當令', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-25T10:00:00+08:00') });
    await page.goto('/');
    await expect(page.getByTestId('today-almanac')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('almanac-lunar')).toHaveText('農曆 八月十五（丙午年）');
    await expect(page.getByTestId('almanac-term')).toHaveText('節氣 秋分（9/23 起）· 下一個 寒露，還有 13 天');
    await expect(page.getByTestId('almanac-month')).toHaveText('月建 酉月（白露起）· 秋，金當令');
    await expect(page.getByTestId('almanac-day')).toContainText('日柱 ');
    // 只列曆法、不做宜忌——這句話本身就是這張卡的承諾，要留在畫面上
    await expect(page.getByTestId('almanac-note')).toContainText('不做擇日宜忌');
  });

  test('閏月：2025-07-25 是閏六月初一', async ({ page }) => {
    await page.clock.install({ time: new Date('2025-07-25T10:00:00+08:00') });
    await page.goto('/');
    await expect(page.getByTestId('almanac-lunar')).toHaveText('農曆 閏六月初一（乙巳年）', { timeout: 30_000 });
  });

  /**
   * 卡片在首頁 focus 時算，不在 render 裡算：分頁掛著不卸載，只在掛載時算的話，
   * 前一晚開著 App、隔天切回首頁，看到的還是昨天（S74 首頁待回填提示同一個病）。
   * 必須用分頁列切換而不是 goto——goto 會重新掛載，遮住這個缺陷。
   */
  test('跨午夜後切回首頁：換成新的一天', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-25T23:59:00+08:00') });
    await page.goto('/');
    await expect(page.getByTestId('almanac-lunar')).toHaveText('農曆 八月十五（丙午年）', { timeout: 30_000 });
    await page.getByRole('tab', { name: /設定/ }).click();
    // 只讓系統時間跳過午夜，不快轉計時器（runFor 會把背景動畫的計時器全部觸發一遍，頁面卡死）
    await page.clock.setSystemTime(new Date('2026-09-26T00:01:00+08:00'));
    await page.getByRole('tab', { name: /首頁/ }).click();
    await expect(page.getByTestId('almanac-lunar')).toHaveText('農曆 八月十六（丙午年）');
  });

  test('「月建是什麼」連到詞典', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('almanac-glossary').click({ timeout: 30_000 });
    await expect(page.getByTestId('glossary-title')).toBeVisible({ timeout: 30_000 });
  });

  test('英文：連接文是英文、農曆改用數字，說明沒有殘留中文', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-25T10:00:00+08:00') });
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );
    await page.goto('/');
    await expect(page.getByTestId('almanac-lunar')).toHaveText('Lunar calendar: month 8, day 15 (丙午 year)', { timeout: 30_000 });
    expect(await page.getByTestId('almanac-note').innerText()).not.toMatch(/[一-鿿]/);
  });
});
