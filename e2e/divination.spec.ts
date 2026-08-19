// E2E：占卜完整流程
//
// 覆蓋抽棋 → 揭曉籤詩 → 記錄留存 → 收藏 的主線，
// 這是使用者最常走、也最不能壞的一條路徑。

import { test, expect, HISTORY_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

/** 從首頁進入抽棋頁並完成一次抽棋，停在「揭露籤詩」前 */
async function drawPieces(page: Page, count: 1 | 2 | 3 = 2) {
  await page.goto('/draw');

  // 選擇問事類別
  await page.getByText('綜合', { exact: true }).click();

  // 選擇抽棋數量，觸發抽棋動畫
  const label = count === 1 ? '單棋' : count === 2 ? '雙棋' : '三棋';
  await page.getByText(label, { exact: true }).click();
}

test.describe('抽棋流程', () => {
  test('抽棋頁顯示類別與數量選項', async ({ page }) => {
    await page.goto('/draw');

    await expect(page.getByText('抽棋占卜')).toBeVisible();
    await expect(page.getByText('選擇抽取棋子數量')).toBeVisible();

    // 三種數量都在
    await expect(page.getByText('單棋', { exact: true })).toBeVisible();
    await expect(page.getByText('雙棋', { exact: true })).toBeVisible();
    await expect(page.getByText('三棋', { exact: true })).toBeVisible();
  });

  test('選擇數量後進入抽棋動畫，並出現揭露按鈕', async ({ page }) => {
    await drawPieces(page, 2);

    // 動畫結束後「揭露籤詩」按鈕應可見
    // 迴歸：此按鈕曾因繼承光環動畫值而只有 15% 不透明度，幾乎看不見
    const revealBtn = page.getByText('揭露籤詩');
    await expect(revealBtn).toBeVisible({ timeout: 30_000 });
  });

  test('完整流程：抽棋 → 揭曉 → 顯示籤詩', async ({ page }) => {
    await drawPieces(page, 2);

    await page.getByText('揭露籤詩').click({ timeout: 30_000 });

    // 轉場（墨滴擴散）後應抵達 reveal 頁並顯示籤詩內容
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    // 籤詩頁的固定操作按鈕
    await expect(page.getByText('再次抽棋')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('回首頁')).toBeVisible();
  });

  test('重新抽取會回到選擇畫面', async ({ page }) => {
    await drawPieces(page, 1);

    await page.getByText('重新抽取').click({ timeout: 30_000 });
    await expect(page.getByText('選擇抽取棋子數量')).toBeVisible();
  });
});

test.describe('記錄與收藏', () => {
  test('占卜後記錄會出現在收藏頁的歷史分頁', async ({ page }) => {
    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    // 前往收藏頁
    await page.goto('/collection');

    // 應不再是空狀態
    await expect(page.getByText('尚無占卜記錄')).toBeHidden({ timeout: 15_000 });
  });

  test('無記錄時收藏頁顯示空狀態', async ({ page }) => {
    // 只清歷史，保留「已完成引導」設定——整個 clear 會讓 App 跳回引導頁
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), HISTORY_KEY);

    await page.goto('/collection');
    await expect(page.getByText('尚無占卜記錄')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('籤詩頁轉場', () => {
  /**
   * 迴歸：墨滴擴散遮罩的完成回呼原本掛在 withTiming 的第三參數上。
   * 那個回呼跑在 UI thread（worklet），直接呼叫 JS 閉包會靜默失效，
   * 父層狀態機因此永遠停在轉場中——15 層墨色圓形永久蓋住整個籤詩頁，
   * 內容雖在 DOM 中（測 toBeVisible 會通過）卻幾乎看不見。
   */
  test('轉場結束後不應殘留墨滴遮罩', async ({ page }) => {
    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await expect(page.getByText('再次抽棋')).toBeVisible({ timeout: 30_000 });

    // 等轉場動畫走完（擴散 1200 + 停留 150 + 淡出 350，留足餘裕）
    await expect.poll(() => page.evaluate(() => {
      // 墨滴用固定色 #1a0f0a
      return document.querySelectorAll('div').length
        ? [...document.querySelectorAll('div')].filter((el) => {
            const cs = getComputedStyle(el);
            if (!cs.backgroundColor.includes('26, 15, 10')) return false;
            const r = el.getBoundingClientRect();
            // 只算真的還蓋在畫面上的（有尺寸且父鏈未淡出）
            return r.width > 0 && r.height > 0;
          }).length
        : 0;
    }), { timeout: 15_000, message: '墨滴遮罩應在轉場後卸載' }).toBe(0);
  });
});

test.describe('AI 深度解讀', () => {
  /**
   * 端點需要 app.json 的 web.output 設為 "server" 且後端設有 DEEPSEEK_API_KEY。
   * 兩者缺一時此功能必須優雅降級——保留規則式解讀，不讓籤詩頁壞掉。
   */
  test('端點不可用時降級且不影響規則式解讀', async ({ page }) => {
    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    await page.getByText('請 AI 解讀此卦').click({ timeout: 30_000 });

    // 降級提示出現，且可重試
    await expect(page.getByText(/AI 解讀尚未啟用|無法連線|解讀服務/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('重試')).toBeVisible();

    // 規則式解讀不受影響
    await expect(page.getByText('▎深度解讀')).toBeVisible();
    await expect(page.getByText('建議行動')).toBeVisible();
  });

  test('成功取得解讀時顯示 AI 內容', async ({ page }) => {
    // 攔截端點，模擬後端已配置好的情況
    await page.route('**/api/interpret', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ interpretation: '龍德在天，宜乘勢而進，然須守中不驕。' }),
      }),
    );

    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    await page.getByText('請 AI 解讀此卦').click({ timeout: 30_000 });

    await expect(page.getByText('龍德在天，宜乘勢而進，然須守中不驕。'))
      .toBeVisible({ timeout: 20_000 });
  });
});

test.describe('籤詩圖鑑', () => {
  test('圖鑑顯示全部 64 首籤詩', async ({ page }) => {
    await page.goto('/library');

    await expect(page.getByText('籤詩圖鑑')).toBeVisible();
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });
  });

  test('搜尋會篩選籤詩數量', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('搜尋籤詩...').fill('乾');

    // 篩選後不應還是 64 首
    await expect(page.getByText('共 64 首')).toBeHidden({ timeout: 10_000 });
  });

  test('找不到結果時顯示提示', async ({ page }) => {
    await page.goto('/library');
    await page.getByPlaceholder('搜尋籤詩...').fill('這是不存在的籤詩內容zzz');

    await expect(page.getByText('找不到符合的籤詩')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('頁面可達性', () => {
  // 靜態匯出的每個路由都應能載入且不是空白頁
  const routes = [
    { path: '/', marker: '象棋占卜' },
    { path: '/draw', marker: '抽棋占卜' },
    { path: '/board', marker: '棋盤佈局' },
    { path: '/library', marker: '籤詩圖鑑' },
    { path: '/stats', marker: '占卜統計' },
    { path: '/achievements', marker: '成就徽章' },
    { path: '/settings', marker: '設定' },
  ];

  for (const { path, marker } of routes) {
    test(`${path} 可正常載入`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(path);
      await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });

      expect(errors, `${path} 出現 JS 例外`).toEqual([]);
    });
  }
});

test.describe('用神斷語', () => {
  /**
   * 種一筆有完整卦象的記錄再直接進 reveal。
   * 走完整抽棋流程會抽到隨機的卦，斷語內容也就跟著隨機——
   * 要斷言「疾病以世爻為用神」就必須固定卦象。
   */
  async function seedRecord(
    page: Parameters<typeof drawPieces>[0],
    cat: string,
    gender?: 'male' | 'female',
  ) {
    const record = {
      id: 'usegod-1',
      poemId: 3,
      poemTitle: '水雷屯',
      poemContent: ['雲雷屯聚待時行', '利建侯王正本源', '磐桓居貞宜守靜', '春回大地萬象新'].join(String.fromCharCode(10)),
      poemLevel: '中吉',
      drawnPieceTypes: ['horse', 'pawn'],
      drawnPieceColors: ['black', 'red'],
      drawnPieceChars: ['馬', '兵'],
      mode: 'draw',
      questionCategory: cat,
      questionText: '',
      timestamp: Date.now(),
      isFavorited: false,
      engineVersion: 3,
      hexagramName: '水雷屯',
      hexagramIndex: 43,
      movingLine: 2,
      hourBranch: 3,
    };

    await page.addInitScript(
      ([sKey, hKey, settings, rec]) => {
        window.localStorage.setItem(sKey as string, JSON.stringify(settings));
        window.localStorage.setItem(hKey as string, JSON.stringify([rec]));
      },
      [SETTINGS_KEY, HISTORY_KEY, { ...DEFAULT_SETTINGS, divinerGender: gender }, record] as const,
    );
    await page.goto('/reveal?recordId=usegod-1&mode=draw');
  }

  test('疾病問事以世爻為用神並出斷語', async ({ page }) => {
    await seedRecord(page, 'health');

    // 提示文字裡也有「用神斷語」四個字，非 exact 會連提示一起選到
    await expect(page.getByText('用神斷語', { exact: true })).toBeVisible({ timeout: 30_000 });
    // 世爻為用時盤上沒有六親可標，斷語必須講明是誰持世
    await expect(page.getByText(/用神世爻（.+持世）/)).toBeVisible();
  });

  test('感情問事未設定占者性別時不出斷語，改為說明缺什麼', async ({ page }) => {
    await seedRecord(page, 'marriage');

    await expect(page.getByText(/感情問事的用神取法男女相反/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('用神斷語', { exact: true })).toHaveCount(0);
  });

  test('設定占者性別為男後，感情以妻財為用神', async ({ page }) => {
    await seedRecord(page, 'marriage', 'male');

    await expect(page.getByText('用神斷語', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/用神妻財/)).toBeVisible();
    await expect(page.getByText(/感情問事的用神取法男女相反/)).toHaveCount(0);
  });
});

test.describe('占者性別設定', () => {
  /**
   * 不測「重新載入後仍在」：fixture 的 addInitScript 每次導覽都會重寫設定，
   * 重載本來就會被蓋掉，那樣測到的是 fixture 而不是 App。
   */
  const storedGender = (page: Parameters<typeof drawPieces>[0]) =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}').divinerGender,
      SETTINGS_KEY,
    );

  test('選擇後寫入設定，改回「不指定」則清除', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('占者性別')).toBeVisible({ timeout: 15_000 });

    await page.getByText('女', { exact: true }).click();
    await expect.poll(() => storedGender(page)).toBe('female');

    // 「不指定」存的是 undefined，JSON.stringify 會直接把這個鍵拿掉；
    // 若哪天改成存空字串，感情問事就會拿一個假值去取用神
    await page.getByText('不指定', { exact: true }).click();
    await expect.poll(() => storedGender(page)).toBeUndefined();
  });
});
