// 易經學習 e2e
//
// 單元測試（learning.test.ts）驗出題與排程；這裡驗使用者走得通：從設定頁進得來、答得完一輪、
// 進度真的存下來、答錯看得到正解、沒有要練的時候明說。
// 作答靠讀屏念的那句卦形說明來算正解——順便證明卦形題對讀屏不是一張沒有內容的「圖片」。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

const LEARNING_KEY = '@chess_divination_learning';
const TRIGRAM_LABELS = ['乾・天', '兌・澤', '離・火', '震・雷', '巽・風', '坎・水', '艮・山', '坤・地'];

/** 讀屏說明「由下往上：陽、陰、陰」→ 卦序（陽 0、陰 1，初爻為最高位） */
async function trigramFromPrompt(page: Page): Promise<number> {
  const label = await page.getByTestId('learn-prompt').getByRole('img').first().getAttribute('aria-label');
  const lines = label!.replace(/^.*：/, '').split('、').map(s => (s === '陽' ? 0 : 1));
  expect(lines).toHaveLength(3);
  return lines[0] * 4 + lines[1] * 2 + lines[2];
}

async function storedProgress(page: Page) {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), LEARNING_KEY) as Promise<
    Record<string, { box: number; lapses: number }>
  >;
}

test.describe('易經學習', () => {
  test('從設定頁進入，八卦答完一輪：全對、進度存下、剩下的新卡數正確', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('settings-learn').click({ timeout: 30_000 });
    await expect(page.getByTestId('learn-title')).toBeVisible();
    await expect(page.getByTestId('learn-summary-trigram')).toContainText('已學 0／8');
    await expect(page.getByTestId('learn-summary-hexagram')).toContainText('已學 0／64');

    // 一次最多 5 張新卡
    await page.getByTestId('learn-start-trigram').click();
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByTestId('learn-progress')).toContainText(`第 ${i}／5 題`);
      const answer = TRIGRAM_LABELS[await trigramFromPrompt(page)];
      await page.getByTestId(`learn-option-${answer}`).click();
      await expect(page.getByTestId('learn-feedback')).toContainText('答對了');
      await page.getByTestId('learn-next').click();
    }

    await expect(page.getByTestId('learn-finished')).toContainText('答對 5／5 題');
    await expect(page.getByTestId('learn-summary-trigram')).toContainText('已學 5／8');
    // 新卡剩 3 張，今天沒有到期的複習
    await expect(page.getByTestId('learn-start-trigram')).toContainText('3');
    const progress = await storedProgress(page);
    expect(Object.keys(progress).filter(k => k.startsWith('trigram:'))).toHaveLength(5);
    expect(Object.values(progress).every(p => p.box === 1 && p.lapses === 0)).toBe(true);

    // 重新載入：進度還在（存在本機，不是只在記憶體裡）
    await page.reload();
    await expect(page.getByTestId('learn-summary-trigram')).toContainText('已學 5／8', { timeout: 30_000 });
  });

  test('答錯：標出正解與解說，那張卡記一次失誤、回第一格', async ({ page }) => {
    await page.goto('/learn');
    await page.getByTestId('learn-start-trigram').click({ timeout: 30_000 });
    const index = await trigramFromPrompt(page);
    // 挑一個畫面上真的有、而且不是正解的選項
    const options = await page.locator('[data-testid^="learn-option-"]').allInnerTexts();
    const pickWrong = options.map(s => s.trim()).find(o => o !== TRIGRAM_LABELS[index])!;
    await page.getByTestId(`learn-option-${pickWrong}`).click();

    await expect(page.getByTestId('learn-feedback')).toContainText(`答案是 ${TRIGRAM_LABELS[index]}`);
    await expect(page.getByTestId('learn-explain')).toContainText('五行屬');
    // 答完之後選項鎖住：不能改答案刷成答對
    await expect(page.getByTestId(`learn-option-${TRIGRAM_LABELS[index]}`)).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(async () => (await storedProgress(page))[`trigram:${index}`])
      .toMatchObject({ box: 1, lapses: 1 });
  });

  test('六十四卦：答完之後把卦拆回上下卦', async ({ page }) => {
    await page.goto('/learn');
    await page.getByTestId('learn-start-hexagram').click({ timeout: 30_000 });
    await page.locator('[data-testid^="learn-option-"]').first().click();
    await expect(page.getByTestId('learn-explain')).toContainText(/上卦 .・.，下卦 .・./);
  });

  test('全部學過且都沒到期：不給一顆按了沒反應的按鈕，而是說明天再來', async ({ page }) => {
    const future = '2099-01-01';
    const state = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`trigram:${i}`, { box: 3, due: future, reviews: 3, lapses: 0 }]));
    await page.addInitScript(([k, v]) => window.localStorage.setItem(k as string, v as string),
      [LEARNING_KEY, JSON.stringify(state)] as const);
    await page.goto('/learn');
    await expect(page.getByTestId('learn-done-trigram')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('learn-start-trigram')).toHaveCount(0);
    // 其他牌組不受影響
    await expect(page.getByTestId('learn-start-hexagram')).toBeVisible();
  });

  test('英文：說明與按鈕沒有殘留中文（卦名是資料值，不在此列）', async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );
    await page.goto('/learn');
    await expect(page.getByTestId('learn-title')).toHaveText('Learn the I Ching', { timeout: 30_000 });
    const deckText = await page.getByTestId('learn-deck-hexagram').innerText();
    expect(deckText).not.toMatch(/[一-鿿]/);
    await page.getByTestId('learn-start-trigram').click();
    const label = await page.getByTestId('learn-prompt').getByRole('img').first().getAttribute('aria-label');
    expect(label).toMatch(/^From the bottom up: (yang|yin)/);
  });
});
