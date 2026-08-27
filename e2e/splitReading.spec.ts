// E2E：閱讀型畫面的主欄＋側欄版面
//
// 為什麼一定要在真瀏覽器裡測：`position: sticky` 在程式碼裡看起來永遠是對的，
// 但它會不會生效取決於三件單元測試碰不到的事——
//   1. RN Web 的 ScrollView 產生的捲動容器是不是 sticky 的定位祖先
//   2. 那一列有沒有 `alignItems: 'flex-start'`（預設 stretch 會把側欄拉成
//      與主欄等高，等高的元素在容器裡沒有可移動的餘裕，sticky 形同 relative）
//   3. RN 0.86 的型別不認得 'sticky'，值是轉型硬塞的——真的傳到 DOM 了嗎
//
// 這三件都只有實際捲動一次才知道。所以本檔的核心斷言是：
// **捲動之後側欄仍在視窗內，而主欄的內容已經捲走了。**

import { test, expect } from './fixtures';
import { SETTINGS_KEY, HISTORY_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

/** 分欄斷點（Layout.split）。低於此值一律單欄 */
const SPLIT_BREAKPOINT = 1160;

/** 種一筆有完整卦象的記錄，直接進 reveal——側欄要有六爻盤才測得出固定行為 */
async function seedAndOpenReveal(page: Page) {
  const record = {
    id: 'split-1',
    poemId: 3,
    poemTitle: '水雷屯',
    poemContent: ['雲雷屯聚待時行', '利建侯王正本源', '磐桓居貞宜守靜', '春回大地萬象新'].join(String.fromCharCode(10)),
    poemLevel: '中吉',
    drawnPieceTypes: ['horse', 'pawn'],
    drawnPieceColors: ['black', 'red'],
    drawnPieceChars: ['馬', '兵'],
    mode: 'draw',
    questionCategory: 'career',
    questionText: '事業運如何',
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
    [SETTINGS_KEY, HISTORY_KEY, DEFAULT_SETTINGS, record] as const,
  );
  await page.goto('/reveal?recordId=split-1&mode=draw');
}

/** 捲動最外層的捲動容器（RN Web 的 ScrollView 是自己捲，不是 window） */
async function scrollBy(page: Page, dy: number) {
  await page.evaluate((delta) => {
    const scrollers = Array.from(document.querySelectorAll('div')).filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
    });
    // 取最外層那個（捲整頁的），而非側欄自己的捲軸
    const target = scrollers[0];
    if (target) target.scrollTop += delta;
    else window.scrollBy(0, delta);
  }, dy);
  // 等一個影格讓 sticky 重新定位
  await page.waitForTimeout(150);
}

test.describe('雙欄閱讀版面', () => {
  test('桌面寬度下揭曉頁分為主欄與側欄', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedAndOpenReveal(page);

    await expect(page.getByTestId('reading-split')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('reading-single')).toHaveCount(0);

    // 側欄應該在主欄右邊，而不是疊在下面
    const rail = await page.getByTestId('reading-rail').boundingBox();
    const split = await page.getByTestId('reading-split').boundingBox();
    expect(rail).not.toBeNull();
    expect(split).not.toBeNull();
    expect(rail!.x).toBeGreaterThan(split!.x + split!.width / 2);
  });

  test('手機寬度下維持單欄', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAndOpenReveal(page);

    await expect(page.getByTestId('reading-single')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('reading-split')).toHaveCount(0);
  });

  test('斷點前一像素仍為單欄', async ({ page }) => {
    await page.setViewportSize({ width: SPLIT_BREAKPOINT - 1, height: 900 });
    await seedAndOpenReveal(page);

    await expect(page.getByTestId('reading-single')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('reading-split')).toHaveCount(0);
  });

  /**
   * 這條是整份檔案的重點。
   *
   * 分欄本身只是把空白填掉；真正要解的問題是「讀到下面的解讀時，
   * 判斷依據的六爻盤已經捲出畫面」。所以要驗的不是版面長什麼樣，
   * 而是**捲動之後側欄還在不在視窗裡**。
   */
  test('捲動後側欄仍留在視窗內（sticky 真的生效）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedAndOpenReveal(page);
    await expect(page.getByTestId('reading-rail')).toBeVisible({ timeout: 30_000 });

    const before = await page.getByTestId('reading-rail').boundingBox();
    expect(before).not.toBeNull();

    await scrollBy(page, 700);

    const after = await page.getByTestId('reading-rail').boundingBox();
    expect(after).not.toBeNull();

    // 側欄頂端必須仍在視窗內。沒有 sticky 時它會被捲到負座標。
    expect(after!.y).toBeGreaterThan(-1);
    expect(after!.y).toBeLessThan(900);

    // 而且要真的捲動過——否則上面那條在「根本沒捲」時也會過
    const scrolled = await page.evaluate(() => {
      const scrollers = Array.from(document.querySelectorAll('div')).filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
      });
      return scrollers[0]?.scrollTop ?? window.scrollY;
    });
    expect(scrolled).toBeGreaterThan(100);
  });

  /**
   * 棋盤頁刻意不分欄。
   *
   * 一開始把它一併改成雙欄，截圖才看出兩件事：一是它的內容在 900px 視窗下
   * 幾乎不用捲，本功能要解的「憑據被捲走」在這頁根本不存在；二是問事類別列
   * 塞進 340px 側欄會被截斷，而 `board.tsx` 的單欄寬度當初正是為了
   * 「類別列不被截斷」才從 560 放寬到 720。
   *
   * 這條測試把那個結論釘住，避免日後有人看到「閱讀型畫面都分欄了」
   * 就順手把棋盤頁也改掉。
   */
  test('棋盤頁在桌面寬度下維持單欄', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('reading-split')).toHaveCount(0);
  });

  /** 類別列不得被截斷——單欄寬度 720 的存在理由 */
  test('棋盤頁問事類別列完整顯示不被截斷', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/board');
    await expect(page.getByTestId('chess-board')).toBeVisible({ timeout: 30_000 });

    // 最後一個類別（出行）必須完整落在視窗內。塞進窄側欄時它會被截掉。
    const lastChip = page.getByText('出行', { exact: true }).first();
    await expect(lastChip).toBeVisible();

    const box = await lastChip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
  });
});
