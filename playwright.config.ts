// Playwright E2E 設定
//
// 測的是 `npx expo export --platform web` 產出的靜態站台（dist/），
// 也就是實際部署到 Vercel 的同一份產物，而非開發伺服器——
// 開發伺服器帶有 HMR 與 dev-only 行為，測過不代表線上會過。
//
// 執行：
//   npm run build:web && npm run e2e
// 或讓 webServer 自動啟動（需先有 dist/）：
//   npm run e2e

import { defineConfig, devices } from '@playwright/test';

const PORT = 8099;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // 占卜流程含動畫（墨滴擴散、棋子飛入），逾時放寬
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // CI 上禁止 test.only 漏提交
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // 所有 worker 共用同一個 expo serve；過度平行會讓頁面載入競爭到逾時。
  workers: process.env.CI ? 1 : 4,

  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // 用 Pixel 5（Chromium 核心）而非 iPhone（WebKit）：
      // 只需安裝一種瀏覽器，本機與 CI 的環境需求一致。
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      // 寬螢幕多欄佈局的迴歸驗證
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command: `npx expo serve --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
