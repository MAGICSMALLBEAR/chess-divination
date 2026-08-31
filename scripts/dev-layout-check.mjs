// 一次性版面檢查腳本（Session 46）——拍下兩軍對壘陣與靈棋深度解讀的實際畫面。
// 用法：node scripts/dev-layout-check.mjs（需先 npx expo export --platform web）
// 產出：test-results/dev-layout/*.png
import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { join } from 'path';

const PORT = 8099;
const BASE = `http://localhost:${PORT}`;

const server = spawn('npx', ['expo', 'serve', '--port', String(PORT)], {
  shell: true, stdio: 'ignore',
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error('server did not start');
}

async function placeAt(page, cellIndex) {
  await page.getByTestId('tray-piece-selectable').first().click();
  await page.getByTestId('board-drop-target').first().waitFor();
  await page.getByTestId('board-drop-target').nth(cellIndex).click();
}

// 同 e2e/fixtures.ts：全新 profile 會停在 onboarding 頁，先注入已完成引導
const SETTINGS = {
  userName: '', drawAnimationSpeed: 'fast', themeMode: 'dark',
  soundEnabled: false, hapticEnabled: false, pieceCountPreset: 2,
  hasCompletedOnboarding: true,
};
async function prepPage(context) {
  await context.addInitScript(
    ([key, settings]) => {
      window.localStorage.setItem(key, JSON.stringify(settings));
    },
    ['@chess_divination_settings', SETTINGS],
  );
}

mkdirSync('test-results/dev-layout', { recursive: true });

const browser = await chromium.launch();
try {
  await waitForServer();

  // ── 兩軍對壘陣（桌面，側置棋子池）──
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await prepPage(desktop);
  const page1 = await desktop.newPage();
  await page1.goto(`${BASE}/board`);
  await page1.getByText('兩軍對壘陣', { exact: true }).click();
  await page1.getByTestId('chess-board').waitFor();
  await placeAt(page1, 45);
  await placeAt(page1, 47);
  await placeAt(page1, 80);
  await placeAt(page1, 0);
  await placeAt(page1, 1);
  await placeAt(page1, 2);
  await page1.getByTestId('chess-board').scrollIntoViewIfNeeded();
  const b1 = await page1.getByTestId('chess-board').boundingBox();
  const tray1 = await page1.getByTestId('piece-tray').boundingBox();
  const clip1 = { x: Math.min(b1.x, tray1.x), y: Math.min(b1.y, tray1.y), width: Math.max(b1.x + b1.width, tray1.x + tray1.width) - Math.min(b1.x, tray1.x), height: Math.max(b1.y + b1.height, tray1.y + tray1.height) - Math.min(b1.y, tray1.y) };
  await page1.screenshot({ path: 'test-results/dev-layout/formation-desktop.png', clip: clip1 });
  await desktop.close();

  // ── 兩軍對壘陣（手機）──
  const mobile = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
  await prepPage(mobile);
  const page2 = await mobile.newPage();
  await page2.goto(`${BASE}/board`);
  await page2.getByText('兩軍對壘陣', { exact: true }).click();
  await page2.getByTestId('chess-board').waitFor();
  await page2.getByTestId('chess-board').scrollIntoViewIfNeeded();
  const b2 = await page2.getByTestId('chess-board').boundingBox();
  await page2.screenshot({ path: 'test-results/dev-layout/formation-mobile.png', clip: { x: 0, y: b2.y - 8, width: 393, height: b2.height + 16 } });
  await mobile.close();

  // ── 靈棋深度解讀（桌面）──
  const desktop2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await prepPage(desktop2);
  const page3 = await desktop2.newPage();
  await page3.goto(`${BASE}/lingqi`);
  await page3.getByTestId('lingqi-cast').click();
  await page3.getByTestId('lingqi-result').waitFor({ timeout: 30000 });
  await page3.getByTestId('lingqi-deep').waitFor({ timeout: 30000 });
  await page3.getByTestId('lingqi-deep').scrollIntoViewIfNeeded();
  const deep = await page3.getByTestId('lingqi-deep').boundingBox();
  await page3.screenshot({ path: 'test-results/dev-layout/lingqi-deep-desktop.png', clip: { x: 0, y: deep.y - 16, width: 1440, height: Math.min(deep.height + 32, 900) } });
  await desktop2.close();

  console.log('done');
} finally {
  await browser.close();
  server.kill();
}
