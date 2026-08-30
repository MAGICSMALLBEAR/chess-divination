// 棋盤頁棋子池位置的 E2E
//
// 為什麼一定要在真瀏覽器測：這件事的成立條件是幾何，而幾何來自
// react-native-web 對 flexDirection/flexWrap 的實際排版，以及棋盤
// `measureInWindow()` 量到的頁面座標——兩者單元測試都碰不到。
// `computeBoardTray` 的算術由 layout.test.ts 顧，這裡只驗「排出來真的是那樣」。
//
// 承 Session 37 的教訓：版面對不對是**看**出來的，不是比對原始碼比出來的。

import { test, expect } from './fixtures';

/** 取得棋盤與棋子池的頁面座標 */
async function geometry(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });
  const board = await page.getByTestId('chess-board').boundingBox();
  const tray = await page.getByTestId('piece-tray').boundingBox();
  expect(board).not.toBeNull();
  expect(tray).not.toBeNull();
  return { board: board!, tray: tray! };
}

test.describe('棋盤棋子池版面', () => {
  test('桌面寬度下棋子池排在棋盤右側，且與棋盤同一視線高度', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    const { board, tray } = await geometry(page);

    // 在右邊：池子左緣不早於棋盤右緣
    expect(tray.x).toBeGreaterThanOrEqual(board.x + board.width);

    // 同一視線高度才是這個功能的重點——池子整段都要落在棋盤的垂直範圍內，
    // 否則挑子與落子之間仍要上下移動視線，位置換了也白換。
    expect(tray.y).toBeGreaterThanOrEqual(board.y - 1);
    expect(tray.y + tray.height).toBeLessThanOrEqual(board.y + board.height + 1);
  });

  test('手機寬度下棋子池仍排在棋盤下方', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/board');
    const { board, tray } = await geometry(page);
    expect(tray.y).toBeGreaterThanOrEqual(board.y + board.height);
  });

  /**
   * 側置改的是容器的 flexDirection，池子裡的棋子從此不在棋盤的下方而在右方。
   * 這條走完整的點擊落子流程（選子 → 點 + 號），確認搬家之後選取與落子都還接得上。
   */
  test('側置後從棋子池選子並落到棋盤上', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    await geometry(page);

    await page.getByTestId('tray-piece-selectable').first().click();
    // 選中後每個空格都出現可放置標記
    await expect(page.getByTestId('board-drop-target').first()).toBeVisible();

    await page.getByTestId('board-drop-target').nth(40).click();

    // 落子成功：計數變 1/3，棋盤上出現可移除的棋子
    await expect(page.getByTestId('piece-tray')).toContainText('(1/3)');
    await expect(page.getByLabel(/點擊移除/)).toHaveCount(1);
  });

  /**
   * 拖曳落子——**不先點選**，直接把一顆棋從池子拖到棋盤上。
   *
   * 這條測的是 `onDragEnd` 有沒有把「被拖的是哪一顆」帶到 `placePieceOnBoard`。
   * 少了那個參數時，落子會沿用 `selectedPiece`；什麼都沒選的情況下它是 null，
   * 於是整個拖曳靜靜地什麼都不做——沒有落子、也沒有選取，看起來就像功能不存在。
   * 先點一下再拖會讓這條在壞掉時也通過，所以這裡刻意不點。
   */
  test('未先點選也能直接把棋子拖到棋盤上落子', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    const { board } = await geometry(page);

    const piece = page.getByTestId('tray-piece-selectable').first();
    const from = await piece.boundingBox();
    expect(from).not.toBeNull();

    // 棋盤 9 條縱線；落在第 5 縱線／第 5 橫線的交點
    const cell = board.width / 9;
    const to = { x: board.x + cell * 4.5, y: board.y + cell * 4.5 };

    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByTestId('piece-tray')).toContainText('(1/3)');
    await expect(page.getByLabel(/點擊移除/)).toHaveCount(1);

    // 而且落在拖過去的那一格，不是被算到別處。
    // 比對無障礙標籤而非像素：標籤直接寫著 screenToGrid 算出來的行列，
    // 用座標比會把「棋盤盒的邊界」與「格線交點」兩套座標系混在一起。
    // 放手點 cell*4.5 對應 col=round((4.5c-0.5c)/c)=4、row 同理 → 標籤是第 5 行第 5 列。
    await expect(page.getByLabel(/點擊移除/).first())
      .toHaveAccessibleName(/第 5 行第 5 列/);
  });

  /**
   * 已選 A 再拖 B，放下去的必須是 B。
   * 沿用 `selectedPiece` 的舊寫法會放成 A——畫面上是「拖了一顆、掉下另一顆」，
   * 而落子數同樣會變成 1/3，光看計數看不出來，所以要比對棋子的字。
   */
  test('已選取別顆時，拖曳落下的仍是被拖的那一顆', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    const { board } = await geometry(page);

    const first = page.getByTestId('tray-piece-selectable').nth(0);
    const dragged = page.getByTestId('tray-piece-selectable').nth(1);
    const draggedChar = (await dragged.innerText()).trim().split('\n')[0];
    const firstChar = (await first.innerText()).trim().split('\n')[0];
    expect(draggedChar).not.toBe(firstChar);   // 兩顆字不同，比對才有意義

    await first.click();                        // 先選第 0 顆
    const from = await dragged.boundingBox();
    const cell = board.width / 9;

    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(board.x + cell * 4.5, board.y + cell * 4.5, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByLabel(/點擊移除/)).toHaveCount(1);
    await expect(page.getByLabel(/點擊移除/).first()).toContainText(draggedChar);
  });

  /** 提示不能叫使用者往一個沒有東西的方向找 */
  test('提示文字的方位跟著棋子池走', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('先從右側棋子庫選擇一顆棋子', { exact: false })).toBeVisible();

    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/board');
    await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('先從下方棋子庫選擇一顆棋子', { exact: false })).toBeVisible();
  });
});
