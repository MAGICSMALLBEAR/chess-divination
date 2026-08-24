// E2E：主題切換
//
// 其餘 e2e 一律以 DEFAULT_SETTINGS.themeMode = 'dark' 執行，
// 宣紙主題因此從未被任何自動化測試看過——
// 「切了主題畫面卻不變，要重開 App 才生效」的缺陷正是這樣活下來的。
// 這支專門守住切換行為與宣紙主題下的可讀性。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';
import { DarkTheme, LightTheme } from '../src/constants/theme';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/**
 * 讀「外觀設定」卡片的背景色。
 *
 * body 的底色來自 +html.tsx、在 React 樹之外，量不到主題；
 * 這張卡片用的是 theme.bgDark，明暗兩主題的值不同，最適合當探針。
 */
async function sectionBg(page: Page): Promise<string> {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('div')]
      .find(d => d.textContent === '外觀設定');
    let el: HTMLElement | null = label as HTMLElement | null;
    for (let i = 0; i < 6 && el; i++) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg;
      el = el.parentElement;
    }
    return 'n/a';
  });
}

const DARK_BG = hexToRgb(DarkTheme.bgDark);
const LIGHT_BG = hexToRgb(LightTheme.bgDark);

test.describe('主題切換', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('外觀設定')).toBeVisible();
  });

  test('預設為墨色主題', async ({ page }) => {
    expect(await sectionBg(page)).toBe(DARK_BG);
  });

  /**
   * 迴歸：設定頁原本只寫入 settings 而未通知 ThemeProvider，
   * 按鈕會亮起、設定也存了，畫面卻要重開 App 才變色。
   */
  test('切到宣紙立即生效，不需重新載入', async ({ page }) => {
    await page.getByText('宣紙', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(LIGHT_BG);
  });

  test('切回墨色同樣立即生效', async ({ page }) => {
    await page.getByText('宣紙', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(LIGHT_BG);

    await page.getByText('墨色', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(DARK_BG);
  });

  /**
   * 這裡驗「有沒有寫進儲存」而不是重新載入後的畫面：
   * fixture 的 addInitScript 每次導覽都會重寫設定，reload 會把 themeMode
   * 蓋回 dark——那是測試環境的行為，不是產品行為。
   * 「以宣紙開機會得到宣紙」由下方另一組測試涵蓋。
   */
  test('選擇會寫進儲存，不只是畫面暫時變色', async ({ page }) => {
    await page.getByText('宣紙', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(LIGHT_BG);

    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key as string) ?? '{}'),
      SETTINGS_KEY,
    );
    expect(stored.themeMode).toBe('light');
  });
});

test.describe('跟隨系統', () => {
  test('系統為淺色時採用宣紙', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings');
    await expect(page.getByText('外觀設定')).toBeVisible();

    await page.getByText('跟隨系統', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(LIGHT_BG);
  });

  test('系統為深色時採用墨色', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/settings');
    await expect(page.getByText('外觀設定')).toBeVisible();

    await page.getByText('跟隨系統', { exact: true }).click();
    await expect.poll(() => sectionBg(page)).toBe(DARK_BG);
  });
});

test.describe('宣紙主題下的主要畫面', () => {
  // 以宣紙為起始設定，直接檢查各頁在淺色下的呈現
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => {
        window.localStorage.setItem(key as string, JSON.stringify(settings));
      },
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, themeMode: 'light' }] as const,
    );
  });

  test('首頁在宣紙主題下正常呈現', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('選擇占卜方式')).toBeVisible();
    await expect(page.getByText('抽棋占卜')).toBeVisible();
  });

  test('抽棋頁在宣紙主題下正常呈現', async ({ page }) => {
    await page.goto('/draw');
    await expect(page.getByText('選擇抽取棋子數量')).toBeVisible();
    await expect(page.getByText('雙棋', { exact: true })).toBeVisible();
  });

  test('宣紙主題下完成一次抽棋並看到結果', async ({ page }) => {
    await page.goto('/draw');
    await page.getByText('綜合', { exact: true }).click();
    await page.getByText('雙棋', { exact: true }).click();
    await page.getByText('揭露籤詩').click({ timeout: 30_000 });

    await expect(page.getByText('占卜結果')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('本卦', { exact: true })).toBeVisible();
  });

  /** 淺色主題最容易踩到的坑：淺底配淺字 */
  test('宣紙主題的主要文字不是淺色，避免白底白字', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('外觀設定')).toBeVisible();

    const color = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')]
        .find(d => d.textContent === '主題模式');
      return el ? getComputedStyle(el).color : 'n/a';
    });

    const [r, g, b] = (color.match(/\d+/g) ?? []).map(Number);
    // 相對亮度低於 0.5 才算深色文字（係數為 sRGB 感知權重）
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    expect(luminance).toBeLessThan(0.5);
  });
});
