// 靈棋十二子的 E2E
//
// 為什麼要在真瀏覽器測而不只靠單元測試：這條流程的價值在於「擲完真的看得到
// 卦辭、而且那一次真的進了歷史記錄」。單元測試驗得了 lingqiOracle 與
// recordFromLingqi，驗不了畫面有沒有把它們接起來——Session 42 留下的原型
// 正是每一塊都對、就是沒有卦辭。

import { test, expect, DEFAULT_SETTINGS, HISTORY_KEY, SETTINGS_KEY } from './fixtures';

/** 擲一次並等結果出現 */
async function cast(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('lingqi-cast')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('lingqi-cast').click();
  await expect(page.getByTestId('lingqi-result')).toBeVisible({ timeout: 30_000 });
}

test.describe('靈棋十二子', () => {
  test('擲卦後看得到卦名與卦辭本文，不是只有卦目標記', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const result = page.getByTestId('lingqi-result');
    // 象以「之象」結尾；卦名則以記錄的標題為準——原典有少數卦目名
    // 不以「卦」結尾（抑災勢、救助教、鬼災勢、歲登勢、人事勢），
    // 用 /卦$/ 比對會在擲到那五卦時失敗（既有測試的隱性 flaky）。
    const title = await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].poemTitle,
      HISTORY_KEY,
    ) as string;
    await expect(result.getByText(title, { exact: true })).toBeVisible();
    await expect(result.getByText(/之象$/).first()).toBeVisible();

    // 象曰與詩曰兩段都要在——原型只印卦目標記，這兩段就是這次補的東西。
    // exact 是因為深度解讀的句子裡也會提到「象曰」（以象為鏡、以詩曰收束），
    // 比對標題必須逐字吻合，否則一條文字匹配到三處。
    await expect(result.getByText('象曰', { exact: true })).toBeVisible();
    await expect(result.getByText('詩曰', { exact: true })).toBeVisible();

    // 卦辭本文得有實際字句，而不是只有段落標題。
    // 取結果區的全部文字，扣掉標籤後仍應有相當篇幅的漢字。
    const text = (await result.innerText()).replace(/象曰|詩曰|又曰/g, '');
    expect(text.replace(/[^一-鿿]/g, '').length).toBeGreaterThan(40);
  });

  test('擲出的卦進入歷史記錄，且標題是卦名而非籤詩', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const history = await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]'),
      HISTORY_KEY,
    );
    expect(history).toHaveLength(1);
    expect(history[0].mode).toBe('lingqi');
    expect(history[0].lingqiKey).toMatch(/^[0-4]-[0-4]-[0-4]$/);
    // poemId 0 是刻意的——它不可被拿去查籤詩表，見 services/poemList.ts
    expect(history[0].poemId).toBe(0);
    expect(history[0].poemLevel).toBe('');
    // 卦目名稱少數不以「卦」結尾（抑災勢等），「是卦名」以與畫面一致為準
    expect(history[0].poemTitle.length).toBeGreaterThan(0);
    await expect(page.getByTestId('lingqi-result')).toContainText(history[0].poemTitle);

    // 畫面上顯示的標題就是那個卦名，不是籤詩 #1「龍騰九霄」
    await expect(page.getByTestId('lingqi-result')).not.toContainText('龍騰九霄');
  });

  test('再擲一次回到問事畫面，不會停在上一卦', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);
    await page.getByTestId('lingqi-recast').click();
    await expect(page.getByTestId('lingqi-result')).toHaveCount(0);
    await expect(page.getByTestId('lingqi-cast')).toBeVisible();
  });

  test('收藏鈕會寫進記錄，再按一次取消', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const isFavorited = () => page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].isFavorited,
      HISTORY_KEY,
    );
    expect(await isFavorited()).toBe(false);

    await page.getByTestId('lingqi-favorite').click();
    await expect.poll(isFavorited).toBe(true);

    await page.getByTestId('lingqi-favorite').click();
    await expect.poll(isFavorited).toBe(false);
  });

  test('分享在 Web 端降級為文字，內容是卦辭而非籤詩版式', async ({ page }) => {
    // Web 端截不了圖也沒有系統分享選單，會一路降到「LINE / 複製」的詢問。
    // 取消 → 複製到剪貼簿，這裡攔下剪貼簿內容看它寫了什麼。
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/lingqi');
    await cast(page);

    // 卦名取自記錄而非畫面 regex——原典少數卦目名不以「卦」結尾（抑災勢等）
    const name = await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].poemTitle,
      HISTORY_KEY,
    ) as string;

    // 會連跳兩個原生對話框：先 confirm（LINE？取消則複製），複製完再 alert 告知。
    // 用常駐 handler 而非 page.once——只接第一個的話，第二個會落到 Playwright
    // 的自動關閉上，而複製與通知之間的時序就此變成看運氣（這條原本就是這樣 flaky 的）。
    page.on('dialog', d => (d.type() === 'confirm' ? d.dismiss() : d.accept()));
    await page.getByTestId('lingqi-share').click();

    // 剪貼簿是在對話框關掉之後才寫入的，點擊 resolve 不代表已經寫完
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
    await expect.poll(clipboard).toContain(name);

    const copied = await clipboard();
    // 靈棋沒有吉凶等級與棋子——籤詩版式的這兩段不該出現
    expect(copied).not.toContain('抽得：');
    expect(copied).not.toMatch(/】\s*·/);
  });

  /**
   * 深度解讀是規則式組出來的（services/lingqiInterpretation.ts），
   * 單元測試驗得了句子，驗不了「畫面真的把它印在卦辭之後」——
   * Session 42 的原型正是每一塊都對、就是沒有卦辭，所以這條走真瀏覽器。
   */
  test('卦辭之後接著規則式深度解讀與三步行動計畫', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const deep = page.getByTestId('lingqi-deep');
    await expect(deep).toBeVisible({ timeout: 30_000 });
    // 結構導讀必含三才三句（任何擲法都會印），且行動計畫三條都在
    await expect(deep.getByText(/上才（天時）/)).toBeVisible();
    await expect(deep.getByText(/中才（人和）/)).toBeVisible();
    await expect(deep.getByText(/下才（地利）/)).toBeVisible();
    await expect(deep.getByText('建議行動')).toBeVisible();
    await expect(deep.getByText(/^3\. /m)).toBeVisible();

    // 歷史記錄還原時（不是重擲）深度解讀也在——lingqi.tsx 以
    // record?.questionCategory ?? selectedCategory 取分類，還原時不該閃一下 general
    const title = (await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].poemTitle,
      HISTORY_KEY,
    )) as string;
    await page.goto('/');
    await page.getByText(title, { exact: true }).first().click();
    await expect(page.getByTestId('lingqi-deep')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('lingqi-deep').getByText(/上才（天時）/)).toBeVisible();
  });

  test('首頁最近紀錄點靈棋那筆，回到靈棋頁而不是 reveal 頁', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);
    const notation = await page.getByTestId('lingqi-result').innerText();

    await page.goto('/');
    // 最近紀錄那一列印的是卦名；點進去該回到靈棋頁並還原同一卦
    const title = (await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '[]')[0].poemTitle,
      HISTORY_KEY,
    )) as string;
    await page.getByText(title, { exact: true }).first().click();

    await expect(page.getByTestId('lingqi-result')).toBeVisible({ timeout: 30_000 });
    // 還原的是同一卦，不是重擲一次
    expect(await page.getByTestId('lingqi-result').innerText()).toContain(title);
    expect(notation).toContain(title);
  });
});

// 「依占卜模式的應驗率」的 E2E
//
// 這一段的存在理由：accuracyByMode() 有匯出、有單元測試，卻從來沒有任何
// 畫面呼叫它——功能清單寫著「分項應驗率：依吉凶等級／問事類別／占卜模式」，
// 而最後一項使用者從來沒看過。單元測試對「有沒有接到畫面上」是無感的，
// 這條就是補那個感官。

test.describe('依占卜模式的應驗率', () => {
  /** 種三筆已回填的記錄：抽棋準、棋盤不準、靈棋準 */
  async function seedVerified(page: import('@playwright/test').Page) {
    const base = {
      poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
      drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
      isFavorited: false, engineVersion: 2,
    };
    const at = Date.now() - 86_400_000;
    const records = [
      { ...base, id: 'm1', mode: 'draw', timestamp: at, outcome: { status: 'accurate', recordedAt: at } },
      { ...base, id: 'm2', mode: 'board', timestamp: at, outcome: { status: 'inaccurate', recordedAt: at } },
      {
        ...base, id: 'm3', mode: 'lingqi', poemId: 0, poemLevel: '', poemTitle: '大通卦',
        lingqiKey: '1-1-1', timestamp: at, outcome: { status: 'accurate', recordedAt: at },
      },
    ];
    await page.addInitScript(
      ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
      [HISTORY_KEY, records] as const,
    );
    await page.goto('/stats');
  }

  test('統計頁真的畫出這一節，三種模式都在', async ({ page }) => {
    await seedVerified(page);
    const section = page.getByTestId('accuracy-by-mode');
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section).toContainText('抽棋');
    await expect(section).toContainText('佈局');
    await expect(section).toContainText('靈棋');
  });

  /**
   * 原本的預設標籤是 `k === 'draw' ? '抽棋' : '棋盤'`——靈棋會被標成棋盤，
   * 於是這一節只剩兩列，而畫面看起來完全正常。列數是最直接的證據。
   */
  test('靈棋自成一列，沒有被併進佈局', async ({ page }) => {
    await seedVerified(page);
    const section = page.getByTestId('accuracy-by-mode');
    await expect(section).toBeVisible({ timeout: 30_000 });
    // 三筆記錄三種模式，各自一列。標籤壞掉時靈棋會併進佈局，只剩兩列
    await expect(section.getByText('靈棋', { exact: true })).toHaveCount(1);
    await expect(section.getByText('佈局', { exact: true })).toHaveCount(1);
    // 應驗率也要分得開：抽棋與靈棋 100%、佈局 0%
    await expect(section.getByText('0%', { exact: true })).toHaveCount(1);
    await expect(section.getByText('100%', { exact: true })).toHaveCount(2);
  });

  test('吉凶等級那一節只有一列——靈棋沒有等級，不該自成一組', async ({ page }) => {
    await seedVerified(page);
    const section = page.getByTestId('accuracy-by-level');
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section).toContainText('大吉');
    // 三筆記錄裡兩筆是大吉、一筆是靈棋（無等級）。靈棋若沒被濾掉，
    // 這裡會多出一列以空字串為名的分項——那一列的標籤是看不見的，
    // 只有列數看得出來
    await expect(section.getByText('/', { exact: false })).toHaveCount(1);
  });
});

// 靈棋計入成就的 E2E
//
// 這一段補的缺口與上一段同型：靈棋自成為完整占卜模式起，成就系統仍只認
// draw 與 board——只擲靈棋的人一個成就都解不開，連「累積 N 次占卜」的
// 計數都不會動。單元測試驗得了 checkAchievements 的條件，驗不了成就頁
// 載入時真的把靈棋那幾筆算進去。

test.describe('靈棋計入成就', () => {
  /** 種 n 筆靈棋記錄，不含任何抽棋或棋盤 */
  async function seedLingqiOnly(page: import('@playwright/test').Page, n: number) {
    const at = Date.now() - 86_400_000;
    const records = Array.from({ length: n }, (_, i) => ({
      id: `l${i}`, poemId: 0, poemTitle: '大通卦', poemContent: '一二三四', poemLevel: '',
      drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
      mode: 'lingqi', lingqiKey: '1-1-1', timestamp: at - i, isFavorited: false, engineVersion: 3,
    }));
    await page.addInitScript(
      ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
      [HISTORY_KEY, records] as const,
    );
    await page.goto('/achievements');
    await expect(page.getByText('成就徽章').first()).toBeVisible({ timeout: 30_000 });
  }

  /** 成就頁載入時會補算一次，等它寫回設定 */
  async function unlockedIds(page: import('@playwright/test').Page) {
    return (await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '{}').unlockedAchievements ?? [],
      SETTINGS_KEY,
    )) as string[];
  }

  test('只擲靈棋也解得開累積成就', async ({ page }) => {
    await seedLingqiOnly(page, 10);

    await expect
      .poll(() => unlockedIds(page), { message: '成就頁應把靈棋算進累積次數' })
      .toEqual(expect.arrayContaining(['first_lingqi', 'ten_draws']));

    // 抽棋與棋盤都沒用過，不該被順手解開
    const ids = await unlockedIds(page);
    expect(ids).not.toContain('first_draw');
    expect(ids).not.toContain('first_board');
  });

  test('新成就在畫面上是看得到的兩張徽章', async ({ page }) => {
    await seedLingqiOnly(page, 1);
    await expect(page.getByText('靈棋初擲', { exact: true })).toBeVisible();
    await expect(page.getByText('三法俱通', { exact: true })).toBeVisible();
  });

  /**
   * 上面兩條都先開了成就頁——而成就頁載入時本來就會補算一次，
   * 於是「擲卦當下什麼都沒發生」這件事被它遮住了。
   *
   * 真正的缺陷在這裡：recordUsage／syncAchievements 只掛在 reveal 頁上，
   * 靈棋自成一頁不走 reveal，只擲靈棋的人 usageDates 一天都不會被記下，
   * 首頁的連續天數與七日問道因此永遠是 0。
   */
  test('擲完就算數：不開成就頁也記下使用日與成就', async ({ page }) => {
    await page.goto('/lingqi');
    await cast(page);

    const settings = async () => (await page.evaluate(
      key => JSON.parse(window.localStorage.getItem(key as string) ?? '{}'),
      SETTINGS_KEY,
    )) as { usageDates?: string[]; currentStreak?: number; unlockedAchievements?: string[] };

    await expect
      .poll(async () => (await settings()).usageDates?.length ?? 0, { message: '擲靈棋要記一天使用日' })
      .toBe(1);
    expect((await settings()).currentStreak).toBe(1);

    await expect
      .poll(async () => (await settings()).unlockedAchievements ?? [], { message: '擲靈棋要當場解開靈棋初擲' })
      .toContain('first_lingqi');
  });

  /**
   * 首頁的「連續 N 天」讀的就是那份 usageDates（且滿 2 天才顯示）。
   * 昨天用過、今天擲一次靈棋，天數就該接上去——在此之前這一擲不算數，
   * 連續紀錄會在只擲靈棋的那一天斷掉。
   */
  test('首頁的連續天數接得上靈棋這一擲', async ({ page }) => {
    // 用 setDate 而非減 86400000：有日光節約時間的時區減毫秒會算到前天／今天
    // （與 services/date.ts 的 yesterdayString 同一個理由）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, usageDates: [ymd], currentStreak: 1 }] as const,
    );

    await page.goto('/lingqi');
    await cast(page);

    await page.goto('/');
    await expect(page.getByText('連續 2 天')).toBeVisible({ timeout: 30_000 });
  });
});
