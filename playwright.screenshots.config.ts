// 上架截圖專用 Playwright 設定
//
// 與 playwright.config.ts 分開，因為兩者目的不同：
// E2E 驗證行為（用單一 viewport 即可），截圖產出素材（需各家商店的指定尺寸）。
// 混在一起會讓 `npm run e2e` 多跑一輪純截圖，也讓截圖被 retry 機制干擾。
//
// 尺寸換算：實際像素 = viewport CSS px × deviceScaleFactor。
// 例：430×932 @3x = 1290×2796（iPhone 6.9"）。

import { defineConfig, devices } from '@playwright/test';

const PORT = 8098;
const BASE_URL = `http://localhost:${PORT}`;

/** 各商店要求的截圖規格 */
const TARGETS = [
  // Apple App Store
  { name: 'ios-6.9-1290x2796', width: 430, height: 932, scale: 3 },
  { name: 'ios-6.3-1179x2556', width: 393, height: 852, scale: 3 },
  { name: 'ios-6.7-1284x2778', width: 428, height: 926, scale: 3 },
  // Google Play
  { name: 'android-1080x1920', width: 360, height: 640, scale: 3 },
];

export default defineConfig({
  testDir: './screenshots',
  timeout: 90_000,
  expect: { timeout: 15_000 },

  // 截圖不需要 retry：失敗要直接看到，不該用重試掩蓋
  retries: 0,
  // 平行擷取會讓動畫與版面量測競爭資源，導致畫面不一致
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: BASE_URL,
  },

  projects: TARGETS.map(t => ({
    name: t.name,
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: t.width, height: t.height },
      deviceScaleFactor: t.scale,
      isMobile: true,
      hasTouch: true,
    },
  })),

  webServer: {
    command: `npx expo serve --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
