// 占驗提醒可調（路線圖 #12）e2e
//
// 這個設定有三個消費者：通知排程（原生限定，Web 走不到）、首頁待回填提示、
// 統計頁的待回填筆數。Web 走得到的兩個在這裡驗；通知那一半由 notifications.test.ts
// 驗排程邏輯，並列進 NATIVE_TESTING.md #28 讓實機驗權限與重排。
//
// 為什麼要有一條「同一個 session 內從設定頁切回首頁」的測試：分頁掛上後不會卸載，
// 首頁若只在掛載時讀一次歷史與設定，使用者改完天數切回來，待回填提示會停在舊天數
// 的結果——設定「存了、畫面也亮了、但沒有生效」。單元測試與各頁各自的 e2e 都測不到
// 這一步，因為它們都是重新載入頁面（重新掛載），只有分頁切換會踩到。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

function record(id: string, daysAgo: number) {
  return {
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4,
    id, mode: 'draw', timestamp: Date.now() - daysAgo * DAY,
  };
}

async function seedHistory(page: Page, records: unknown[]) {
  await page.addInitScript(
    ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
    [HISTORY_KEY, records] as const,
  );
}

/** 在 fixture 寫入的預設設定之上，再蓋一個占驗提醒設定（後註冊的 init script 後執行） */
async function seedReminderSetting(page: Page, verifyReminderDays: number) {
  await page.addInitScript(
    ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
    [SETTINGS_KEY, { ...DEFAULT_SETTINGS, verifyReminderDays }] as const,
  );
}

async function storedReminderDays(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).verifyReminderDays : undefined;
  }, SETTINGS_KEY);
}

test.describe('占驗提醒可調', () => {
  test('設定頁：沒設定過時亮的是預設天數；點選項會存進設定並改亮那一顆', async ({ page }) => {
    await page.goto('/settings');
    // 選中狀態看使用者看得到的訊號：被選中那一顆的邊框色與其餘三顆不同（其餘三顆彼此相同）。
    // 不看 aria-selected——專案裡所有選項都用 accessibilityState，在 web 上並不輸出該屬性
    const borderColors = () => Promise.all([0, 7, 14, 30].map(async days => ({
      days,
      color: await page.getByTestId(`verify-reminder-${days}`)
        .evaluate(el => getComputedStyle(el).borderTopColor),
    })));
    const expectOnlySelected = async (days: number) => {
      const all = await borderColors();
      const others = all.filter(o => o.days !== days).map(o => o.color);
      const mine = all.find(o => o.days === days)!.color;
      expect(new Set(others).size).toBe(1);
      expect(mine).not.toBe(others[0]);
    };
    const selected = (days: number) => expect.poll(async () => {
      try { await expectOnlySelected(days); return true; } catch { return false; }
    }).toBe(true);
    const notSelected = (days: number) => expect.poll(async () => {
      try { await expectOnlySelected(days); return false; } catch { return true; }
    }).toBe(true);

    // 沒設定過＝預設 14 天，亮的不是「關閉」
    await expect(page.getByTestId('verify-reminder-14')).toBeVisible({ timeout: 30_000 });
    await selected(14);
    await notSelected(0);
    expect(await storedReminderDays(page)).toBeUndefined();

    await page.getByTestId('verify-reminder-7').click();
    await selected(7);
    await notSelected(14);
    await expect.poll(() => storedReminderDays(page)).toBe(7);

    await page.getByTestId('verify-reminder-0').click();
    await selected(0);
    await expect.poll(() => storedReminderDays(page)).toBe(0);

    await page.getByTestId('verify-reminder-30').click();
    await selected(30);
    await expect.poll(() => storedReminderDays(page)).toBe(30);
  });

  test('首頁：8 天前的記錄在預設天數下不催（沒到 14 天）', async ({ page }) => {
    await seedHistory(page, [record('r8', 8)]);

    await page.goto('/');
    await expect(page.getByText('龍騰九霄').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pending-verify')).toHaveCount(0);
  });

  test('首頁：設成 7 天，8 天前的記錄出現待回填提示並指名那一筆', async ({ page }) => {
    await seedHistory(page, [record('r8', 8)]);
    await seedReminderSetting(page, 7);

    await page.goto('/');
    const prompt = page.getByTestId('pending-verify').filter({ visible: true });
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    await expect(prompt).toContainText('龍騰九霄');
  });

  test('首頁：關閉提醒後，連 40 天前的記錄也不再頂著待回填卡片', async ({ page }) => {
    await seedHistory(page, [record('old', 40)]);
    await seedReminderSetting(page, 0);

    await page.goto('/');
    // 等首頁真的畫完再斷言不存在，否則任何延遲都會讓這條假綠
    await expect(page.getByText('龍騰九霄').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pending-verify')).toHaveCount(0);
  });

  test('同一個 session：在設定頁改成 7 天，切回首頁立刻看到提示（首頁不能只在掛載時讀）', async ({ page }) => {
    await seedHistory(page, [record('r8', 8)]);

    await page.goto('/');
    await expect(page.getByText('龍騰九霄').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pending-verify')).toHaveCount(0);

    // 用分頁列切換而不是 goto：goto 會重新掛載首頁，正好把要驗的缺陷遮住
    await page.getByRole('tab', { name: '設定' }).click();
    await page.getByTestId('verify-reminder-7').click();
    await expect.poll(() => storedReminderDays(page)).toBe(7);

    await page.getByRole('tab', { name: '首頁' }).click();
    await expect(page.getByTestId('pending-verify').filter({ visible: true })).toBeVisible({ timeout: 10_000 });
  });

  test('統計頁：待回填那一行寫的是實際天數，不是寫死的「兩週」', async ({ page }) => {
    await seedHistory(page, [record('r8', 8)]);
    await seedReminderSetting(page, 7);

    await page.goto('/stats');
    const line = page.getByTestId('stats-pending');
    await expect(line).toBeVisible({ timeout: 30_000 });
    await expect(line).toContainText('7 天');
    await expect(line).not.toContainText('兩週');
  });

  test('統計頁：關閉提醒不會讓這一行消失（它是使用者主動打開才看得到的資訊，不是打擾）', async ({ page }) => {
    await seedHistory(page, [record('old', 40)]);
    await seedReminderSetting(page, 0);

    await page.goto('/stats');
    await expect(page.getByTestId('stats-pending')).toBeVisible({ timeout: 30_000 });
    // 關閉時仍照預設天數算，文案帶的也是那個數字
    await expect(page.getByTestId('stats-pending')).toContainText('14 天');
  });
});
