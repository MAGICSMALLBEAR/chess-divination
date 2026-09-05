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

    // 迴歸：首頁模式卡也印「抽棋占卜」，疊棧背景頁留在 DOM 裡但不可見
    // （S37／S46／S49 同一類問題）——filter 限定可見元素，才不會 strict 誤中
    await expect(page.getByText('抽棋占卜').filter({ visible: true })).toBeVisible();
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

  /**
   * 迴歸：首頁「快速抽一籤」的副標曾寫死「直接抽取 2 顆棋子獲得指引」。
   *
   * 兩件事都不成立：那顆按鈕只是進到抽棋頁（面向與棋數都還要自己選），
   * 而顆數是使用者在設定裡選的——把預設設成 3 的人，抽棋頁把 3 標成
   * 「建議」，首頁卻告訴他會抽 2 顆。這條把兩個畫面綁在一起，
   * 因為缺陷正是「兩處對不上」，只看其中一頁都是通順的。
   */
  test('首頁副標不會跟抽棋頁的建議顆數互相矛盾', async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => {
        window.localStorage.setItem(key as string, JSON.stringify(settings));
      },
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, pieceCountPreset: 3 }] as const,
    );

    await page.goto('/');
    const quickDraw = page.getByTestId('quick-draw').filter({ visible: true });
    await expect(quickDraw).toContainText('選好面向與棋數', { timeout: 30_000 });
    // 限定在這顆按鈕內：模式卡的「從 32 顆棋子中隨機抽取」講的是棋子池，
    // 那句是對的，不該被一起掃進來（與 copyNumbers 守門同一個區分）
    await expect(quickDraw).not.toContainText(/\d+\s*顆/);

    // 抽棋頁把使用者設的那一顆標成「建議」——首頁不寫死數字，兩處才對得上
    await page.goto('/draw');
    await expect(page.getByTestId('draw-count-suggested-3')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('draw-count-suggested-2')).toHaveCount(0);
  });
});

test.describe('固定牌陣流程', () => {
  test('三才時間陣依序限定落子，並把角色解讀帶到結果頁', async ({ page }) => {
    await page.goto('/board');
    await page.getByText('三才時間陣', { exact: true }).click();

    // 選好棋子後，固定牌陣只會開放一個指定位置。
    await expect(page.getByText('下一子：過去')).toBeVisible();
    await page.getByTestId('tray-piece-selectable').first().click();
    await expect(page.getByTestId('board-drop-target')).toHaveCount(1);
    await page.getByTestId('board-drop-target').click();

    await expect(page.getByText('下一子：當下')).toBeVisible();
    await page.getByTestId('tray-piece-selectable').first().click();
    await page.getByTestId('board-drop-target').click();

    await expect(page.getByText('下一子：下一步')).toBeVisible();
    await page.getByTestId('tray-piece-selectable').first().click();
    await page.getByTestId('board-drop-target').click();

    await expect(page.getByText('牌陣已完成')).toBeVisible();
    await page.getByText('解讀佈局', { exact: true }).click();
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    // 牌陣名同時出現在標題與位置摘要內文，exact:false 會命中兩個元素
    // 而觸發 strict mode 錯誤。這裡真正要確認的是「角色解讀有帶到結果頁」，
    // 故改以只存在於角色解讀中的字串比對。
    await expect(page.getByText('過去・', { exact: false }).first())
      .toBeVisible({ timeout: 30_000 });
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

test.describe('分享去處選單', () => {
  /**
   * 迴歸背景（S55）：原本的降級是一個二選一確認框（確認＝LINE、取消＝複製），
   * 於是 `shareToFacebook()` 寫好了卻永遠沒有入口，而「取消」實際上是一個
   * 動作而不是取消——按下去會偷偷覆寫剪貼簿。單元測試驗得了 shareToTarget
   * 分得對，驗不了「使用者按分享真的看得到這三個去處」，故走真瀏覽器。
   */
  /**
   * 攔下剪貼簿寫入而不是讀真的剪貼簿：`navigator.clipboard.writeText` 需要
   * 使用者手勢，測試沒辦法先塞一筆進去當對照；攔下來還能直接數「寫了幾次」，
   * 那正是「取消不該寫」要問的問題。
   */
  async function stubClipboard(page: Page) {
    await page.addInitScript(() => {
      const copies: string[] = [];
      (window as unknown as { __copies: string[] }).__copies = copies;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => { copies.push(text); return Promise.resolve(); },
          readText: () => Promise.resolve(copies[copies.length - 1] ?? ''),
        },
      });
    });
  }

  const copies = (page: Page) =>
    page.evaluate(() => (window as unknown as { __copies: string[] }).__copies);

  async function openShareSheet(page: Page) {
    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });
    await page.getByTestId('poem-share').click({ timeout: 30_000 });
  }

  test('按分享後三個去處都在，Facebook 也在', async ({ page }) => {
    await openShareSheet(page);

    await expect(page.getByTestId('share-target-line')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('share-target-facebook')).toBeVisible();
    await expect(page.getByTestId('share-target-copy')).toBeVisible();
  });

  /**
   * 取消要真的是取消。舊的確認框沒有這個狀態——兩顆按鈕都是動作，
   * 想「算了」的人只能按取消，然後剪貼簿就被覆寫了。
   */
  test('取消就是什麼都不做，不會偷偷覆寫剪貼簿', async ({ page }) => {
    await stubClipboard(page);
    await openShareSheet(page);

    await page.getByTestId('share-target-cancel').click();
    await expect(page.getByTestId('share-target-copy')).toBeHidden({ timeout: 15_000 });
    expect(await copies(page)).toEqual([]);
  });

  /**
   * 迴歸（S56）：`shareNative` 原本用一個布林同時代表「使用者按了取消」與
   * 「這台裝置沒有分享功能」。桌面瀏覽器沒有 `navigator.share`，所以降級
   * 選單一直是對的；但**手機瀏覽器有**，於是使用者叫出系統分享選單、
   * 按了取消，馬上就被塞第二張選單——他剛剛才說不要。
   *
   * 這裡把 `navigator.share` 裝成「使用者取消」（reject AbortError），
   * 斷言我們的選單不該出現。
   */
  test('使用者取消系統分享選單後，不該再跳出去處選單', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(Object.assign(new Error('Abort'), { name: 'AbortError' })),
      });
    });
    await openShareSheet(page);

    // 給它足夠時間出現才算數——馬上斷言不存在，任何延遲都會讓測試假綠
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('share-target-copy')).toBeHidden();
  });

  /**
   * 首頁的每日運勢是第三個分享入口，S55 加去處選單時只接了揭曉頁與靈棋頁。
   * S56 又只修到「取消不再偷偷覆寫剪貼簿」那一半，於是桌面瀏覽器按下分享
   * 變成：靜靜複製一份、一句話都不說，看起來就是按鈕壞了。
   *
   * 這條走的是首頁，不是揭曉頁——同一個缺陷連續兩輪都因為「只看揭曉頁」
   * 而留在原地。
   */
  test('首頁每日運勢：沒有系統分享功能時也端得出去處選單', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new Error('Share is not supported in this browser')),
      });
    });
    await page.goto('/');
    await page.getByLabel('分享每日運勢').click({ timeout: 30_000 });

    await expect(page.getByTestId('share-target-line')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('share-target-facebook')).toBeVisible();
    await expect(page.getByTestId('share-target-copy')).toBeVisible();
  });

  /** 首頁的取消也要是取消：S56 修的正是「取消之後剪貼簿被靜靜覆寫」 */
  test('首頁每日運勢：取消去處選單不會寫剪貼簿', async ({ page }) => {
    await stubClipboard(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new Error('Share is not supported in this browser')),
      });
    });
    await page.goto('/');
    await page.getByLabel('分享每日運勢').click({ timeout: 30_000 });
    await expect(page.getByTestId('share-target-cancel')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('share-target-cancel').click();
    await expect(page.getByTestId('share-target-copy')).toBeHidden({ timeout: 15_000 });
    expect(await copies(page)).toEqual([]);
  });

  /** 反過來：真的沒有分享功能時，選單一定要出現，否則使用者無路可走 */
  test('沒有系統分享功能時，去處選單要出現', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new Error('Share is not supported in this browser')),
      });
    });
    await openShareSheet(page);

    await expect(page.getByTestId('share-target-copy')).toBeVisible({ timeout: 15_000 });
  });
  test('選複製文字才寫進剪貼簿', async ({ page }) => {
    await stubClipboard(page);
    page.on('dialog', d => d.accept());
    await openShareSheet(page);

    await page.getByTestId('share-target-copy').click();
    await expect.poll(() => copies(page), { timeout: 15_000 }).toHaveLength(1);
    expect((await copies(page))[0]).toContain('籤');
  });
});

test.describe('記錄搜尋與卡片留白', () => {
  /**
   * 種三筆記錄：一筆寫了自由筆記、一筆回填了占驗自述、一筆是靈棋。
   * 用 localStorage 直接種而非跑完整流程——要驗的是收藏頁怎麼呈現與比對
   * 這些欄位，不是它們怎麼被寫進去的。
   */
  async function seedRecords(page: Page) {
    const base = {
      poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
      drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'],
      drawnPieceChars: ['帥', '車'], isFavorited: false, engineVersion: 4,
    };
    const at = Date.now() - 86_400_000;
    const records = [
      { ...base, id: 'n1', mode: 'draw', timestamp: at, note: '主管換人，整件事重來' },
      {
        ...base, id: 'n2', mode: 'draw', timestamp: at - 1000,
        outcome: { status: 'accurate', note: '三週後真的錄取了', verifiedAt: at },
      },
      {
        ...base, id: 'n3', mode: 'lingqi', poemId: 0, poemLevel: '', poemTitle: '大通卦',
        drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
        lingqiKey: '1-1-1', timestamp: at - 2000,
      },
    ];
    await page.addInitScript(
      ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
      [HISTORY_KEY, records] as const,
    );
    await page.goto('/collection');
  }

  /**
   * 迴歸背景（S54）：`recordMatchesSearch` 比對了問題本文，卻沒有比對
   * 使用者自己寫的兩則筆記——`note` 與 `outcome.note` 都是後來才加的欄位，
   * 加的時候沒有回頭看誰在比對記錄。使用者最記得的常常正是自己寫的那句話。
   */
  test('搜尋得到自己寫下的自由筆記', async ({ page }) => {
    await seedRecords(page);
    const search = page.getByPlaceholder('搜尋籤詩內容');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('主管換人');
    await expect(page.getByTestId('card-grid').first().getByTestId('record-pieces')).toHaveCount(1);
  });

  test('搜尋得到占驗回填時寫的自述', async ({ page }) => {
    await seedRecords(page);
    const search = page.getByPlaceholder('搜尋籤詩內容');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('錄取');
    await expect(page.getByTestId('card-grid').first().getByTestId('record-pieces')).toHaveCount(1);
  });

  /**
   * 靈棋擲的是卦目、不落子，`drawnPieceChars` 是空的。原本仍照畫一個
   * 圓角色塊，於是每一筆靈棋記錄的左側都掛著一格沒有字的方塊——
   * 與 S44 的空等級標籤是同一個毛病。三筆記錄只該有兩個棋子格。
   */
  test('靈棋記錄不留一格沒有字的棋子方塊', async ({ page }) => {
    await seedRecords(page);
    const grid = page.getByTestId('card-grid').first();
    await expect(grid).toContainText('大通卦', { timeout: 30_000 });
    await expect(grid.getByTestId('record-pieces')).toHaveCount(2);
  });

  /**
   * 搜尋沒有命中，不等於這個人沒有記錄。
   *
   * 三個分頁共用同一個搜尋框，空狀態卻一律說「尚無占卜記錄／開始占卜後
   * 記錄將顯示於此」——對一個存了三筆、只是打錯關鍵字的人，這句話既不是
   * 事實，給的指示也沒有用（他該做的是換個字，不是去占卜）。
   * 圖鑑早就分得清楚（`library.notFound`），收藏頁沒有跟上。
   */
  test('搜尋沒有命中時說的是找不到，不是「你還沒有記錄」', async ({ page }) => {
    await seedRecords(page);
    const search = page.getByPlaceholder('搜尋籤詩內容');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('這串字不可能命中任何記錄');

    await expect(page.getByTestId('collection-no-match').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('找不到符合的記錄').first()).toBeVisible();
    await expect(page.getByText('尚無占卜記錄')).toBeHidden();
  });

  /** 清空搜尋要回到記錄本身，而不是停在「找不到」 */
  test('清空搜尋後記錄回來，空狀態也跟著消失', async ({ page }) => {
    await seedRecords(page);
    const search = page.getByPlaceholder('搜尋籤詩內容');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('這串字不可能命中任何記錄');
    await expect(page.getByTestId('collection-no-match').first()).toBeVisible({ timeout: 15_000 });

    await search.fill('');
    await expect(page.getByTestId('collection-no-match')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('card-grid').first().getByTestId('record-pieces')).toHaveCount(2);
  });
});

test.describe('資料夾歸檔', () => {
  /**
   * 迴歸背景（S52）：資料夾原本只做了一半——`setSelectedFolderId` 從來沒被
   * 呼叫過（資料夾點不開，卡片只列得下三筆），`removeFromFolder()` 也沒有
   * 任何呼叫端（歸錯了只能連整個資料夾一起刪）。這條走完「建立 → 歸檔 →
   * 打開 → 移出」，四步缺一就紅。
   */
  test('建立資料夾、歸檔一筆記錄、打開它、再移出', async ({ page }) => {
    // 先產生一筆記錄
    await drawPieces(page, 2);
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/reveal/, { timeout: 30_000 });

    await page.goto('/collection');

    // 切到資料夾分頁並建立一個資料夾
    await page.getByText(/^資料夾 \(\d+\)$/).click({ timeout: 15_000 });
    await page.getByText('＋ 新增資料夾').click();
    await page.getByPlaceholder('資料夾名稱').fill('測試夾');
    await page.getByText('新增', { exact: true }).click();
    await expect(page.getByText('測試夾')).toBeVisible({ timeout: 15_000 });

    // 回到歷史分頁，把那筆記錄歸檔進去
    await page.getByText(/^歷史記錄 \(\d+\)$/).click();
    await page.locator('[data-testid^="record-folder-"]').first().click();
    const pick = page.locator('[data-testid^="folder-pick-"]').first();
    await expect(pick).toBeVisible({ timeout: 15_000 });
    await pick.click();

    // 資料夾分頁：計數變 1，而且點得開
    await page.getByText(/^資料夾 \(\d+\)$/).click();
    const openFolder = page.locator('[data-testid^="folder-open-"]').first();
    await expect(openFolder).toBeVisible({ timeout: 15_000 });
    await openFolder.click();

    // 打開後看得到那筆記錄本身（不是只有三筆預覽的縮寫）
    const folderGrid = page.getByTestId('folder-grid');
    await expect(folderGrid.locator('[data-testid^="record-folder-"]')).toHaveCount(1, { timeout: 15_000 });

    // 在資料夾內再點一次同一個資料夾＝移出
    await folderGrid.locator('[data-testid^="record-folder-"]').first().click();
    await page.locator('[data-testid^="folder-pick-"]').first().click();
    await expect(page.getByText('這個資料夾還沒有記錄')).toBeVisible({ timeout: 15_000 });

    // 返回鍵回到資料夾清單
    await page.getByTestId('folder-back').click();
    await expect(page.getByText('＋ 新增資料夾')).toBeVisible({ timeout: 15_000 });
  });

  /**
   * 既有使用者的資料夾裡可能留著指不到記錄的 id：`removeHistory` 一直沒有
   * 把被刪的記錄從資料夾拿掉（S54 修掉來源），但已經存下的那些治不了。
   * 卡片的筆數因此要數「還指得到東西的」，否則會說「2 筆」而打開只有 1 筆。
   */
  test('資料夾的筆數不把已刪除的記錄算進去', async ({ page }) => {
    const at = Date.now() - 86_400_000;
    const record = {
      poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
      drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
      isFavorited: false, engineVersion: 4, id: 'f1', mode: 'draw', timestamp: at,
    };
    await page.addInitScript(
      ([hKey, sKey, recs, settings]) => {
        window.localStorage.setItem(hKey as string, JSON.stringify(recs));
        window.localStorage.setItem(sKey as string, JSON.stringify(settings));
      },
      [
        HISTORY_KEY, SETTINGS_KEY, [record],
        {
          ...DEFAULT_SETTINGS,
          folders: [{ id: 'folder-1', name: '舊夾', color: '#C9A96E', recordIds: ['f1', 'deleted-long-ago'] }],
        },
      ] as const,
    );
    await page.goto('/collection');

    await page.getByText(/^資料夾 \(\d+\)$/).click({ timeout: 30_000 });
    const card = page.getByTestId('folder-open-folder-1');
    await expect(card).toBeVisible({ timeout: 15_000 });
    // 「1 筆」而不是「2 筆」——多出來的那個 id 指不到任何記錄
    await expect(card).toContainText('1 筆');

    // 打開之後也真的只有一筆，兩處講的是同一個數字
    await card.click();
    await expect(page.getByTestId('folder-grid').getByTestId('record-pieces')).toHaveCount(1);
  });

  /**
   * 資料夾詳細頁的搜尋沒有命中時，最露餡的一頁：標題那行印著「1 筆」，
   * 下面同時寫「這個資料夾還沒有記錄」——兩句話在同一個畫面上互相打臉，
   * 而且後者附的指示（去記錄上點資料夾圖示）解決不了他遇到的事。
   *
   * 與 S54 修資料夾死 id 是同一個判準：筆數與內容必須對得起來。
   * 那次修的是資料，這次修的是說詞。
   */
  test('資料夾裡搜尋沒命中時，不會一邊說「1 筆」一邊說「還沒有記錄」', async ({ page }) => {
    const at = Date.now() - 86_400_000;
    const record = {
      poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
      drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
      isFavorited: false, engineVersion: 4, id: 'f1', mode: 'draw', timestamp: at,
    };
    await page.addInitScript(
      ([hKey, sKey, recs, settings]) => {
        window.localStorage.setItem(hKey as string, JSON.stringify(recs));
        window.localStorage.setItem(sKey as string, JSON.stringify(settings));
      },
      [
        HISTORY_KEY, SETTINGS_KEY, [record],
        {
          ...DEFAULT_SETTINGS,
          folders: [{ id: 'folder-1', name: '舊夾', color: '#C9A96E', recordIds: ['f1'] }],
        },
      ] as const,
    );
    await page.goto('/collection');

    await page.getByText(/^資料夾 \(\d+\)$/).click({ timeout: 30_000 });
    await page.getByTestId('folder-open-folder-1').click({ timeout: 15_000 });
    await expect(page.getByTestId('folder-grid').getByTestId('record-pieces')).toHaveCount(1);

    await page.getByPlaceholder('搜尋籤詩內容').fill('這串字不可能命中任何記錄');

    await expect(page.getByText('找不到符合的記錄').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('這個資料夾還沒有記錄')).toBeHidden();
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

test.describe('占卜圖鑑', () => {
  test('圖鑑顯示全部 64 首籤詩', async ({ page }) => {
    await page.goto('/library');

    await expect(page.getByText('占卜圖鑑')).toBeVisible();
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

  /**
   * 靈棋分頁。單元測試驗得了 lingqiMatchesSearch 的比對，驗不了
   * 「125 卦目真的在圖鑑上瀏覽得到」——在此之前靈棋擲出來的卦只能
   * 從歷史與收藏回頭看，沒有目錄。
   */
  test('切到靈棋分頁看得到 125 卦目', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText('共 64 首')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('library-tab-lingqi').click();
    await expect(page.getByTestId('library-count')).toHaveText('共 125 卦');
    await expect(page.getByTestId('lingqi-card')).toHaveCount(125);
    // 等級與五行篩選對靈棋無意義，切過去應該收起來
    await expect(page.getByText('五行')).toBeHidden();
  });

  test('靈棋卡片展開後看得到象曰與原典出處', async ({ page }) => {
    await page.goto('/library');
    await page.getByTestId('library-tab-lingqi').click();
    await page.getByPlaceholder('搜尋卦目...').fill('大通卦');
    await expect(page.getByTestId('lingqi-card')).toHaveCount(1);

    const card = page.getByTestId('lingqi-card').first();
    // 收合時印的是詩曰；象曰要展開才有
    await expect(card).toContainText('升騰之象');
    await expect(card.getByText('象曰', { exact: true })).toBeHidden();

    await card.click();
    await expect(card.getByText('象曰', { exact: true })).toBeVisible();
    await expect(card).toContainText('從小至大');
  });

  test('搜尋詩句也找得到卦目，切回籤詩分頁仍是 64 首', async ({ page }) => {
    await page.goto('/library');
    await page.getByTestId('library-tab-lingqi').click();
    // 使用者記得的往往是句子而不是卦名
    await page.getByPlaceholder('搜尋卦目...').fill('乘龍福自臻');
    await expect(page.getByTestId('lingqi-card')).toHaveCount(1);
    await expect(page.getByTestId('lingqi-card').first()).toContainText('大通卦');

    await page.getByTestId('library-tab-poems').click();
    // 搜尋字串仍在，但籤詩這邊比對不到——換分頁不會憑空冒出結果
    await expect(page.getByText('找不到符合的籤詩')).toBeVisible();
    await page.getByPlaceholder('搜尋籤詩...').fill('');
    await expect(page.getByTestId('library-count')).toHaveText('共 64 首');
  });
});

test.describe('頁面可達性', () => {
  // 靜態匯出的每個路由都應能載入且不是空白頁
  const routes = [
    { path: '/', marker: '象棋占卜' },
    { path: '/draw', marker: '抽棋占卜' },
    { path: '/board', marker: '棋盤佈局' },
    { path: '/library', marker: '占卜圖鑑' },
    { path: '/stats', marker: '占卜統計' },
    { path: '/achievements', marker: '成就徽章' },
    { path: '/settings', marker: '設定' },
  ];

  for (const { path, marker } of routes) {
    test(`${path} 可正常載入`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(path);
      // 疊棧背景頁的同名文字留在 DOM 裡但不可見（S37／S46／S49）
      await expect(page.getByText(marker).filter({ visible: true })).toBeVisible({ timeout: 15_000 });

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

  /**
   * 子領域（S50 上線）在此之前只是 `!== 'marriage'` 的另一個字串：
   * 取用神走的是映回後的感情規則，但畫面上的提示只認 'marriage'，
   * 於是使用者選了「復合／修復關係」就既沒有斷語、也沒有補設定的提示。
   */
  test('感情子領域也給得出「請補性別」的提示', async ({ page }) => {
    await seedRecord(page, 'reconciliation');

    await expect(page.getByText(/感情問事的用神取法男女相反/)).toBeVisible({ timeout: 30_000 });
  });

  test('事業子領域預設展開的是事業詳解，不是綜合', async ({ page }) => {
    await seedRecord(page, 'jobSearch');

    // 規則式解讀也會引到同一句事業斷語，故取分頁內容那一則（第一個獨立節點）
    await expect(page.getByText('事業初創或新專案起步，困難是正常的。堅持下去必有突破。', { exact: true }).first())
      .toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('萬事起頭難，這是一切的必經之路。不要被眼前的困難嚇倒，每一步都在為未來鋪路。', { exact: true }))
      .toHaveCount(0);
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

/**
 * 三個占卜頁用的是同一個選類別元件，記憶卻只有兩頁做。
 * 同樣不測「重新載入後仍在」——理由同上一個 describe，
 * 改為斷言「按下去就寫進設定」，那正是缺的那一段。
 */
test.describe('問事類別記憶', () => {
  const storedCategory = (page: Parameters<typeof drawPieces>[0]) =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '{}').questionCategory,
      SETTINGS_KEY,
    );

  /**
   * 點下去，直到設定裡真的出現那個值。
   *
   * 為什麼要重點而不是點一次就 poll：測的是 `expo export` 出來的靜態站台，
   * 按鈕先由預渲染的 HTML 畫出來，React 掛上 onPress 是之後的事。落在
   * 這兩者之間的那一次點擊什麼都不會發生，於是後面的 poll 等到逾時——
   * Playwright 的可操作性檢查（可見、穩定、可接收事件）看不出「處理器
   * 還沒掛上」，只有重點才跨得過去。選同一個類別是冪等的，多點幾次無害。
   */
  async function pickUntilStored(
    page: Parameters<typeof drawPieces>[0], label: string, expected: string,
  ) {
    await expect.poll(async () => {
      await page.getByRole('button', { name: label }).click();
      return storedCategory(page);
    }, { timeout: 15_000 }).toBe(expected);
  }

  for (const [name, path, marker] of [
    ['抽棋頁', '/draw', '抽棋占卜'],
    ['棋盤頁', '/board', '棋盤佈局'],
    ['靈棋頁', '/lingqi', '靈棋十二子'],
  ] as const) {
    test(`${name}選了面向就記下來`, async ({ page }) => {
      await page.goto(path);
      // marker 與首頁模式卡同名，疊棧背景頁會誤中（S37／S46／S49）
      await expect(page.getByText(marker).filter({ visible: true })).toBeVisible({ timeout: 15_000 });

      await pickUntilStored(page, '事業', 'career');

      // 情境層選的是子領域，存的也該是子領域——存成主類別等於把使用者
      // 講清楚的那一層丟掉
      await pickUntilStored(page, '求職', 'jobSearch');
    });
  }
});
