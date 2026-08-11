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

const SETTINGS = {
  userName: '',
  drawAnimationSpeed: 'standard',
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
  const seed = [
    { poemId: 1, title: '乾為天', level: '大吉', chars: ['帥', '車'], types: ['king', 'chariot'], colors: ['red', 'red'], hexName: '乾為天', hexIndex: 0, mode: 'draw', cat: 'career' },
    { poemId: 11, title: '地天泰', level: '大吉', chars: ['仕', '炮'], types: ['advisor', 'cannon'], colors: ['red', 'black'], hexName: '地天泰', hexIndex: 56, mode: 'draw', cat: 'wealth' },
    { poemId: 3, title: '水雷屯', level: '中吉', chars: ['馬', '兵'], types: ['horse', 'pawn'], colors: ['black', 'red'], hexName: '水雷屯', hexIndex: 43, mode: 'board', cat: 'love' },
    { poemId: 24, title: '地雷復', level: '中吉', chars: ['車', '相'], types: ['chariot', 'elephant'], colors: ['red', 'black'], hexName: '地雷復', hexIndex: 59, mode: 'draw', cat: 'health' },
    { poemId: 46, title: '地風升', level: '吉', chars: ['炮', '帥'], types: ['cannon', 'king'], colors: ['black', 'black'], hexName: '地風升', hexIndex: 60, mode: 'board', cat: 'study' },
    { poemId: 2, title: '坤為地', level: '吉', chars: ['將', '士'], types: ['king', 'advisor'], colors: ['black', 'black'], hexName: '坤為地', hexIndex: 63, mode: 'draw', cat: 'general' },
    { poemId: 5, title: '水天需', level: '平', chars: ['車', '馬'], types: ['chariot', 'horse'], colors: ['red', 'red'], hexName: '水天需', hexIndex: 40, mode: 'draw', cat: 'travel' },
    { poemId: 29, title: '坎為水', level: '平', chars: ['卒', '象'], types: ['pawn', 'elephant'], colors: ['black', 'black'], hexName: '坎為水', hexIndex: 45, mode: 'board', cat: 'general' },
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
    ([sKey, hKey, fKey, settings, hist, favs]) => {
      window.localStorage.setItem(sKey as string, JSON.stringify(settings));
      window.localStorage.setItem(hKey as string, JSON.stringify(hist));
      window.localStorage.setItem(fKey as string, JSON.stringify(favs));
    },
    [SETTINGS_KEY, HISTORY_KEY, FAVORITES_KEY, SETTINGS, history, favorites] as const,
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

  // 進入問事與數量選擇後啟動抽棋，擷取搖筒與棋子飛出的過程
  const startButton = page.getByText(/抽取|開始/).first();
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: shot(testInfo, '2-draw-animation') });
});

test('3-籤詩揭曉', async ({ page }, testInfo) => {
  // 直接開既有記錄，避免依賴動畫時序
  await goto(page, '/reveal?recordId=demo-0&mode=draw', 2000);
  await page.screenshot({ path: shot(testInfo, '3-poem-reveal') });
});

test('4-棋盤佈局', async ({ page }, testInfo) => {
  await goto(page, '/board', 500);
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
