// 「算好、存好，卻沒有讀取端」的四個出口 e2e（路線圖 #23–26）
//
// 四個值都早就存在（每日運勢的 luckyElement、備份檔的 date、學習卡的 lapses、
// 設定的 userName），缺的只是畫面上讀得到它們的地方。這裡驗的就是「讀得到」：
// 單元測試證明值算得對，但這類缺陷的樣子正是值算得對、畫面卻從不出現。

import { test, expect, SETTINGS_KEY, HISTORY_KEY, DEFAULT_SETTINGS } from './fixtures';

const LEARNING_KEY = '@chess_divination_learning';

test.describe('每日運勢的當日主氣（#23）', () => {
  test('卡片說出三格的共同理由：主氣五行與生它的那一行', async ({ page }) => {
    await page.goto('/');
    const line = page.getByTestId('daily-element');
    await expect(line).toBeVisible({ timeout: 30_000 });
    // 五行保留漢字；主氣與生我者各自是五行之一
    await expect(line).toHaveText(/^當日主氣 [金木水火土]：幸運色與[金木水火土]同氣，吉方取生[金木水火土]的[金木水火土]方位/);
  });

  test('今天稍早用舊版存下、沒有主氣欄位的運勢：整行不出現，不印 undefined', async ({ page }) => {
    await page.addInitScript(() => {
      const d = new Date();
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      window.localStorage.setItem('@chess_divination_daily', JSON.stringify({
        date, luckyPiece: 'king', luckyColor: '白', luckyDirection: '西', luckyNumber: 4,
        fortuneLevel: '上上', fortuneText: '舊版的一天',
      }));
    });
    await page.goto('/');
    await expect(page.getByText('舊版的一天')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('daily-element')).toHaveCount(0);
    await expect(page.getByText('undefined')).toHaveCount(0);
  });
});

test.describe('還原前說出備份日期（#24）', () => {
  const backup = (date?: string) => JSON.stringify({
    version: 1,
    ...(date ? { date } : {}),
    data: { [HISTORY_KEY]: [{ id: 'e2e-from-backup' }] },
  });

  /** 按下還原、選檔；confirm 依 `accept` 回應，回傳 confirm 的內容 */
  async function restoreWith(page: import('@playwright/test').Page, json: string, accept: boolean) {
    const confirms: string[] = [];
    page.on('dialog', d => {
      if (d.type() === 'confirm') {
        confirms.push(d.message());
        void (accept ? d.accept() : d.dismiss());
      } else {
        void d.accept();
      }
    });
    const chooser = page.waitForEvent('filechooser');
    await page.getByText('還原資料', { exact: true }).click();
    // 確認在選檔之後才問：按下還原鈕的當下不該先跳出任何對話框
    expect(confirms).toEqual([]);
    await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
    await expect.poll(() => confirms.length).toBeGreaterThan(0);
    return confirms;
  }

  test('確認框寫出這份備份產生的當地日期與時間', async ({ page }) => {
    await page.goto('/settings');
    // 以當地時間造日期，斷言才不受執行環境的時區影響
    const created = new Date(2026, 8, 20, 14, 5);
    const confirms = await restoreWith(page, backup(created.toISOString()), true);
    expect(confirms[0]).toContain('這份備份產生於 2026-09-20 14:05');
    await expect.poll(() => page.evaluate(key => window.localStorage.getItem(key), HISTORY_KEY))
      .toContain('e2e-from-backup');
  });

  test('看了日期按取消：現有資料不動', async ({ page }) => {
    await page.addInitScript(key => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, JSON.stringify([{ id: '原本的' }]));
    }, HISTORY_KEY);
    await page.goto('/settings');
    await restoreWith(page, backup(new Date(2026, 0, 1).toISOString()), false);
    // 取消之後給流程一點時間：若仍寫入，會在這段時間內發生
    await page.waitForTimeout(500);
    const history = await page.evaluate(key => window.localStorage.getItem(key), HISTORY_KEY);
    expect(history).toContain('原本的');
    expect(history).not.toContain('e2e-from-backup');
  });

  test('備份檔沒有日期：退回原本不帶日期的確認，照樣能還原', async ({ page }) => {
    await page.goto('/settings');
    const confirms = await restoreWith(page, backup(), true);
    expect(confirms[0]).toContain('將覆蓋現有資料');
    expect(confirms[0]).not.toContain('產生於');
  });
});

test.describe('學習卡錯過幾次（#25）', () => {
  test('答錯過的卡出現時標出次數；沒錯過的不標', async ({ page }) => {
    // 八張八卦卡全部到期：前四張錯過 3 次、後四張從沒錯過。到期日相同，
    // 佇列依牌組順序排，所以第一題一定是錯過 3 次的那一張
    await page.addInitScript(key => {
      if (window.localStorage.getItem(key)) return;
      const state: Record<string, unknown> = {};
      for (let i = 0; i < 8; i++) {
        state[`trigram:${i}`] = { box: 1, due: '2000-01-01', reviews: 4, lapses: i < 4 ? 3 : 0 };
      }
      window.localStorage.setItem(key, JSON.stringify(state));
    }, LEARNING_KEY);
    await page.goto('/learn');
    await page.getByTestId('learn-start-trigram').click({ timeout: 30_000 });
    await expect(page.getByTestId('learn-lapses')).toHaveText('這張之前答錯過 3 次');

    // 答錯這一題：出題當下取的數字不跟著變成 4
    const options = page.getByTestId(/^learn-option-/);
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      await options.nth(i).click();
      if (await page.getByTestId('learn-feedback').isVisible()) break;
    }
    await expect(page.getByTestId('learn-lapses')).toHaveText(/答錯過 3 次/);

    // 走到第五題（從沒錯過的那一張）：不出現
    for (let n = 2; n <= 5; n++) {
      await page.getByTestId('learn-next').click();
      await expect(page.getByTestId('learn-progress')).toContainText(`第 ${n}／8 題`);
      await page.getByTestId(/^learn-option-/).first().click();
    }
    await expect(page.getByTestId('learn-lapses')).toHaveCount(0);
  });
});

test.describe('使用者名稱的出口（#26）', () => {
  test('設了名字：首頁問候；設定頁說明名字用在哪裡', async ({ page }) => {
    await page.addInitScript(([key, settings]) => {
      window.localStorage.setItem(key as string, JSON.stringify({ ...(settings as object), userName: '小熊' }));
    }, [SETTINGS_KEY, DEFAULT_SETTINGS] as const);
    await page.goto('/');
    await expect(page.getByTestId('home-greeting')).toHaveText('小熊，今天想問什麼？', { timeout: 30_000 });

    await page.goto('/settings');
    await expect(page.getByTestId('settings-name-hint')).toContainText('首頁會用這個名字');
  });

  test('沒設名字：不出現問候，也不以「訪客」代稱', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('daily-element')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('home-greeting')).toHaveCount(0);
  });

  test('到設定頁改名字再用分頁列切回首頁：問候跟著換（focus 重讀）', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('daily-element')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('home-greeting')).toHaveCount(0);

    // 用分頁列切換而不是 goto：goto 會重新掛載，遮住「只在掛載時讀」的缺陷
    await page.getByRole('tab', { name: '設定' }).click();
    await page.getByText('用戶名稱', { exact: true }).click();
    await page.getByPlaceholder(/./).fill('阿明');
    await page.getByText('儲存', { exact: true }).click();
    await page.getByRole('tab', { name: '首頁' }).click();
    await expect(page.getByTestId('home-greeting')).toHaveText('阿明，今天想問什麼？');
  });
});
