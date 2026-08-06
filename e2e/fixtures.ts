// E2E 共用 fixture
//
// 全新瀏覽器 profile 一律停在 onboarding 引導頁，
// 導致所有內容測試看不到目標元素。此處在頁面載入前先寫入
// 「已完成引導」的設定，讓測試直接進入主要流程。
// 引導頁本身由 onboarding.spec.ts 單獨測試。

import { test as base, expect } from '@playwright/test';

/** AsyncStorage 在 Web 端直接以此鍵名寫入 localStorage */
export const SETTINGS_KEY = '@chess_divination_settings';
export const HISTORY_KEY = '@chess_divination_history';

export const DEFAULT_SETTINGS = {
  userName: '',
  drawAnimationSpeed: 'fast',   // 測試時用最快動畫，縮短等待
  themeMode: 'dark',
  soundEnabled: false,          // 避免 Web Audio 在無互動時報錯
  hapticEnabled: false,
  pieceCountPreset: 2,
  hasCompletedOnboarding: true,
};

export const test = base.extend({
  page: async ({ page }, use) => {
    // addInitScript 在每次導覽的文件腳本執行前注入，
    // 因此 App 讀取設定時就已經看得到「已完成引導」。
    await page.addInitScript(
      ([key, settings]) => {
        window.localStorage.setItem(key as string, JSON.stringify(settings));
      },
      [SETTINGS_KEY, DEFAULT_SETTINGS] as const,
    );
    await use(page);
  },
});

export { expect };
