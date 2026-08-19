// 上架螢幕截圖自動擷取
//
// 對象是 `npx expo export --platform web` 的靜態產物（與線上 Vercel 同一份），
// 而非開發伺服器——上架素材要呈現使用者真正會看到的畫面。
//
// 執行：npm run screenshots
// 產出：screenshots/out/<裝置>/<場景>.png
//
// 六個場景取自 SCREENSHOTS_GUIDE.md。每個場景都先種入示範資料，
// 否則統計、收藏、圖鑑在全新 profile 下都是空畫面，不能當上架素材。

import { test, expect, type Page } from '@playwright/test';

const SETTINGS_KEY = '@chess_divination_settings';
const HISTORY_KEY = '@chess_divination_history';
const FAVORITES_KEY = '@chess_divination_favorites';
const DAILY_KEY = '@chess_divination_daily';

/**
 * 固定的每日運勢。
 * 每日運勢是由「當日之卦」推出來的，不種資料就等於讓擷取當天的日期決定
 * 商店主圖——曾經擷到「下下·舉步維艱」當第一張。素材必須可重現，
 * 不能每跑一次就換一個結果。內容取自實際存在的 #14 火天大有。
 */
const DAILY_FORTUNE = {
  luckyPiece: 'cannon',
  luckyColor: '紅',
  luckyDirection: '南',
  luckyNumber: 9,
  fortuneLevel: '大吉',
  fortuneText: '火天大有 · 大有之年——如炮之勢，一鳴驚人。過去的積累正要收成，順天休命、善用資源，福報自厚。',
  poemId: 14,
  luckyElement: '火',
};

const SETTINGS = {
  userName: '',
  drawAnimationSpeed: 'normal',
  themeMode: 'dark',
  soundEnabled: false,
  hapticEnabled: false,
  pieceCountPreset: 2,
  hasCompletedOnboarding: true,
};

/**
 * 示範用占卜記錄。
 * 刻意鋪陳在最近七天內並混入不同吉凶等級與模式，
 * 讓趨勢圖有起伏、吉凶分佈有多個區塊、棋子排行不只一種棋。
 */
function buildDemoHistory() {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // 吉凶等級必須用 poems.ts 真正在用的五級（大吉／上吉／中吉／中平／下下）。
  // 曾誤植「吉」「平」這兩個不存在的值，結果吉凶分佈圖有三列恆為 0、
  // 趨勢圖的好壞分類還會默默漏算——測試不會紅，但素材看起來像壞掉的。
  // outcome 用來讓占驗簿有內容：全空的話那張卡只會顯示「尚無占驗記錄」。
  const seed = [
    { poemId: 1, title: '乾為天', level: '大吉', chars: ['帥', '車'], types: ['king', 'chariot'], colors: ['red', 'red'], hexName: '乾為天', hexIndex: 0, mode: 'draw', cat: 'career', outcome: 'accurate' },
    { poemId: 11, title: '地天泰', level: '大吉', chars: ['仕', '炮'], types: ['advisor', 'cannon'], colors: ['red', 'black'], hexName: '地天泰', hexIndex: 56, mode: 'draw', cat: 'wealth', outcome: 'accurate' },
    { poemId: 3, title: '水雷屯', level: '中吉', chars: ['馬', '兵'], types: ['horse', 'pawn'], colors: ['black', 'red'], hexName: '水雷屯', hexIndex: 43, mode: 'board', cat: 'marriage', outcome: 'partial' },
    { poemId: 24, title: '地雷復', level: '中吉', chars: ['車', '相'], types: ['chariot', 'elephant'], colors: ['red', 'black'], hexName: '地雷復', hexIndex: 59, mode: 'draw', cat: 'health', outcome: 'accurate' },
    { poemId: 46, title: '地風升', level: '上吉', chars: ['炮', '帥'], types: ['cannon', 'king'], colors: ['black', 'black'], hexName: '地風升', hexIndex: 60, mode: 'board', cat: 'study', outcome: 'accurate' },
    { poemId: 2, title: '坤為地', level: '上吉', chars: ['將', '士'], types: ['king', 'advisor'], colors: ['black', 'black'], hexName: '坤為地', hexIndex: 63, mode: 'draw', cat: 'general', outcome: 'partial' },
    { poemId: 5, title: '水天需', level: '中平', chars: ['車', '馬'], types: ['chariot', 'horse'], colors: ['red', 'red'], hexName: '水天需', hexIndex: 40, mode: 'draw', cat: 'travel', outcome: 'inaccurate' },
    { poemId: 29, title: '坎為水', level: '下下', chars: ['卒', '象'], types: ['pawn', 'elephant'], colors: ['black', 'black'], hexName: '坎為水', hexIndex: 45, mode: 'board', cat: 'general', outcome: undefined },
  ];

  return seed.map((s, i) => ({
    id: `demo-${i}`,
    poemId: s.poemId,
    poemTitle: s.title,
    poemContent: '天行健者自強息\n龍飛在天利見人\n剛正中和無往咎\n乾坤定位萬象新',
    poemLevel: s.level,
    drawnPieceTypes: s.types,
    drawnPieceColors: s.colors,
    drawnPieceChars: s.chars,
    mode: s.mode,
    questionCategory: s.cat,
    questionText: '',
    timestamp: now - i * day * 0.8,
    isFavorited: i < 3,
    engineVersion: 3,
    // 刻意留一筆未回填：占驗簿的分母只算已回填者，全部填滿就看不出這個設計
    outcome: s.outcome
      ? { status: s.outcome, verifiedAt: now - i * day * 0.3 }
      : undefined,
    hexagramName: s.hexName,
    hexagramIndex: s.hexIndex,
    movingLine: (i % 6) + 1,
    hourBranch: (i % 12) + 1,
  }));
}

test.beforeEach(async ({ page }) => {
  const history = buildDemoHistory();
  const favorites = history.filter(r => r.isFavorited).map(r => r.id);

  await page.addInitScript(
    ([sKey, hKey, fKey, dKey, settings, hist, favs, fortune]) => {
      window.localStorage.setItem(sKey as string, JSON.stringify(settings));
      window.localStorage.setItem(hKey as string, JSON.stringify(hist));
      window.localStorage.setItem(fKey as string, JSON.stringify(favs));

      // 快取以當地日期比對，跨日或跨時區都得算在瀏覽器端，不能用 toISOString
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      window.localStorage.setItem(dKey as string, JSON.stringify({ ...(fortune as object), date: today }));
    },
    [SETTINGS_KEY, HISTORY_KEY, FAVORITES_KEY, DAILY_KEY,
     SETTINGS, history, favorites, DAILY_FORTUNE] as const,
  );
});

/**
 * 等版面收斂再截圖。
 * useGrid / useMeasuredWidth 以 onLayout 非同步量測容器，
 * 太早截會拍到多欄佈局尚未套用、或圖表仍是最小寬度的畫面。
 */
async function settle(page: Page, extra = 0) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200 + extra);
}

async function goto(page: Page, path: string, extra = 0) {
  await page.goto(path);
  await settle(page, extra);
}

test('1-首頁每日運勢', async ({ page }, testInfo) => {
  await goto(page, '/');
  await expect(page.getByText('象棋占卜').first()).toBeVisible();
  await page.screenshot({ path: shot(testInfo, '1-home-daily-fortune') });
});

test('2-抽棋動畫', async ({ page }, testInfo) => {
  await goto(page, '/draw');

  // 抽棋是由「棋子數量」卡片直接啟動的，沒有獨立的「開始」按鈕。
  // 這裡不吞例外：選不到卡片就該讓截圖失敗，而不是靜靜拍下問事表單當素材。
  await page.getByText('雙棋', { exact: true }).click();

  // 「誠心問道」只在搖筒動畫階段出現，用它確認畫面真的進到動畫
  await expect(page.getByText('誠心問道')).toBeVisible({ timeout: 10_000 });

  // 等棋子落定再拍，而不是固定等一個秒數：搖筒轉到側面時只剩一道邊緣線，
  // 抓到那一格就成了一張近乎全黑的素材。落定後棋子漢字與摘要都在畫面上。
  await expect(page.getByText('揭露籤詩')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800); // 讓結果區的淡入補完

  await page.screenshot({ path: shot(testInfo, '2-draw-animation') });
});

test('3-籤詩揭曉', async ({ page }, testInfo) => {
  // 直接開既有記錄，避免依賴動畫時序
  await goto(page, '/reveal?recordId=demo-0&mode=draw', 2000);
  await page.screenshot({ path: shot(testInfo, '3-poem-reveal') });
});

test('4-棋盤佈局', async ({ page }, testInfo) => {
  await goto(page, '/board', 500);

  // 空棋盤展示不了這個模式的重點（擺位參與動爻計算），
  // 所以實際擺三顆棋再拍。「+」放置點只在選中棋子後才渲染，
  // 因此每一顆都得走「選子 → 落子」兩步，不能先選三顆再一次放。
  // 棋子與放置點都是 SVG，靠漢字定位會抓到不可點的 <text>，故走 testID
  const tray = page.getByTestId('tray-piece-selectable');
  for (const nth of [12, 30, 55]) {
    await tray.first().click();
    const drops = page.getByTestId('board-drop-target');
    await expect(drops.first()).toBeVisible({ timeout: 5_000 });
    await drops.nth(nth).click();
  }

  // 三顆到齊，底部才會從「已放置 n/3」變成可解讀的狀態
  await expect(page.getByText(/已放置\s*3\s*\/\s*3/)).toBeVisible({ timeout: 5_000 });

  // 點放置點會觸發 scrollIntoView，窄螢幕上會把標題捲出畫面外。
  // 截圖是固定視窗的，捲動位置就是成品的一部分，必須先歸零。
  // 捲的是 react-native-web 的 ScrollView 容器，不是 window——
  // window.scrollTo 在這個版面上完全沒有作用。
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollTop > 0) el.scrollTop = 0;
    });
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: shot(testInfo, '4-board-layout') });
});

test('5-統計儀表板', async ({ page }, testInfo) => {
  await goto(page, '/stats', 800);
  await page.screenshot({ path: shot(testInfo, '5-stats-dashboard') });
});

test('6-籤詩圖鑑', async ({ page }, testInfo) => {
  await goto(page, '/library', 500);
  await page.screenshot({ path: shot(testInfo, '6-poem-library') });
});

/** 依裝置分資料夾，檔名帶場景序號，方便直接對應上架後台的排序 */
function shot(testInfo: { project: { name: string } }, name: string) {
  return `screenshots/out/${testInfo.project.name}/${name}.png`;
}
