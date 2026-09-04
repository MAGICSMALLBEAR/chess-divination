// 兩軍對壘陣的 E2E
//
// 為什麼要真瀏覽器：半場落子限制是棋盤元件裡的狀態與幾何邏輯——單元測試
// 驗得了 formationLines／formationForce 的算術，驗不了「畫面上的落子點
// 真的只剩半場」。而這個牌陣的價值在於「六子成陣、兩軍對比進得了解讀」，
// 那一步是 hook → 記錄 → reveal 頁的完整串接，只有瀏覽器看得到。

import { test, expect } from './fixtures';
import { HISTORY_KEY } from './fixtures';

/** 進入棋盤頁並切到兩軍對壘陣 */
async function selectFormationSpread(page: import('@playwright/test').Page) {
  await page.goto('/board');
  await page.getByText('兩軍對壘陣', { exact: true }).click();
  await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });
}

/** 選一顆棋子（池子第一顆可選者），點第 cellIndex 個落子點。
 *  落子點依列序排列（ChessBoard 依 row-major 產生）：
 *  0–44 是黑方半場、45–89 是紅方半場。 */
async function placeAt(page: import('@playwright/test').Page, cellIndex: number) {
  await page.getByTestId('tray-piece-selectable').first().click();
  await expect(page.getByTestId('board-drop-target').first()).toBeVisible();
  await page.getByTestId('board-drop-target').nth(cellIndex).click();
}

test.describe('兩軍對壘陣', () => {
  test('棋盤標出雙方陣區，落子數上限為六', async ({ page }) => {
    await selectFormationSpread(page);
    // 半場計數在牌陣導覽區（不在棋盤上——棋盤任何格都可能被棋子壓住）
    await expect(page.getByText('紅方陣 0/3')).toBeVisible();
    await expect(page.getByText('黑方陣 0/3')).toBeVisible();
    // 棋子池計數是 /6 不是 /3——上限真的跟著牌陣走
    await expect(page.getByTestId('piece-tray')).toContainText('(0/6)');
    // 引導文字帶已布計數
    await expect(page.getByText(/已布 0\/6/)).toBeVisible();

    // 陣區淡染的幾何：黑方蓋棋盤上半、紅方蓋下半，兩者以楚河漢界相接無縫
    const board = (await page.getByTestId('chess-board').boundingBox())!;
    const blackZone = (await page.getByTestId('formation-zone-black').boundingBox())!;
    const redZone = (await page.getByTestId('formation-zone-red').boundingBox())!;
    expect(Math.abs(blackZone.y - board.y)).toBeLessThan(1);
    expect(Math.abs(redZone.y + redZone.height - (board.y + board.height))).toBeLessThan(1);
    expect(Math.abs(blackZone.y + blackZone.height - redZone.y)).toBeLessThan(1);
  });

  test('半場各限三子：紅方滿三子後落子點只剩黑方半場', async ({ page }) => {
    await selectFormationSpread(page);
    await placeAt(page, 45);  // row 5
    await placeAt(page, 47);  // row 5 另一格
    await placeAt(page, 80);  // row 8
    await expect(page.getByText('紅方陣 3/3')).toBeVisible();

    // 再選一顆：紅方半場已滿，可落子的只剩黑方半場 45 格。
    // 若限制壞掉，這裡會是 87（紅黑兩半場都能放），而不是 45。
    await page.getByTestId('tray-piece-selectable').first().click();
    await expect(page.getByTestId('board-drop-target')).toHaveCount(45);
    // 剩下的落子點真的都在黑方半場：nth(0) 是最左上角（row 0），
    // 口述標籤帶著半場名
    await expect(page.getByTestId('board-drop-target').nth(0))
      .toHaveAccessibleName(/黑方陣/);
  });

  test('六子成陣後解讀：記錄存 spreadId，揭曉頁印兩軍對比', async ({ page }) => {
    await selectFormationSpread(page);
    await placeAt(page, 45);
    await placeAt(page, 47);
    await placeAt(page, 80);
    await placeAt(page, 0);
    await placeAt(page, 1);
    await placeAt(page, 2);
    await expect(page.getByText('紅方陣 3/3')).toBeVisible();
    await expect(page.getByText('黑方陣 3/3')).toBeVisible();

    // 解讀鈕啟用（6/6）
    await page.getByText(/已放置 6\/6/).click();
    await expect(page).toHaveURL(/reveal/);
    // 兩軍強弱對比印在揭曉頁的棋盤佈局解讀區。
    // 注意 expo-router 疊棧：/board 仍掛在背景，牌陣晶片上的「兩軍對壘陣」
    // 也在 DOM 裡（隱藏）。比對帶冒號的摘要句——只有 positionSummary 這樣寫。
    await expect(page.getByText('棋盤佈局解讀')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/兩軍對壘：/).first()).toBeVisible();
    await expect(page.getByText(/紅方陣：/).first()).toBeVisible();

    // 記錄本身帶著 spreadId 與對比文字——歷史還原時不必重算
    const records = await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]'),
      HISTORY_KEY,
    );
    expect(records).toHaveLength(1);
    expect(records[0].mode).toBe('board');
    expect(records[0].spreadId).toBe('formation');
    expect(records[0].positionSummary).toContain('兩軍對壘');
    expect(records[0].positionSummary).toContain('紅方陣');
  });
});

/**
 * 分享出去看不看得出牌陣。
 *
 * 在此之前分享內容只有籤詩與卦象——選了兩軍對壘陣，分享給人看跟隨手
 * 擺三顆棋一模一樣。Web 端會降級成文字分享，剪貼簿是唯一驗得到的出口。
 */
test.describe('兩軍對壘陣的分享', () => {
  test('分享文字帶著牌陣名', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await selectFormationSpread(page);
    await placeAt(page, 45);
    await placeAt(page, 47);
    await placeAt(page, 80);
    await placeAt(page, 0);
    await placeAt(page, 1);
    await placeAt(page, 2);
    await page.getByText(/已放置 6\/6/).click();
    await expect(page).toHaveURL(/reveal/);
    await expect(page.getByText('棋盤佈局解讀')).toBeVisible({ timeout: 30_000 });

    // 分享降級已改成去處選單（S55），理由見 lingqi.spec.ts
    page.on('dialog', d => d.accept());
    await page.getByTestId('poem-share').click();
    await page.getByTestId('share-target-copy').click();

    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
    await expect.poll(clipboard).toContain('牌陣：兩軍對壘陣');
  });
});
