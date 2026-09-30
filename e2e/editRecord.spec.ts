// 改得回來嗎 e2e（S94：路線圖 #34、#35、#36）
//
// #34／#35：結果頁的問題區塊可以事後改問題與類別。兩個入口（reveal 抽棋／棋盤共用、lingqi 自成一頁）
//          各驗一次——「同一功能的第二個入口最容易被漏掉」。改類別之前要先講後果，改過之後要如實標出來。
// #36：資料夾可以改名，歸檔不動。

import { test, expect, HISTORY_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

const BASE = {
  poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
  drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'],
  drawnPieceChars: ['帥', '車'], isFavorited: false, engineVersion: 4,
  hexagramName: '乾為天', hexagramIndex: 0, movingLine: 2, hourBranch: 3,
  timestamp: Date.now() - 86_400_000,
};

async function seed(page: Page, records: unknown[], settings?: Record<string, unknown>) {
  await page.addInitScript(([hKey, sKey, recs, s]) => {
    if (!window.localStorage.getItem('e2e-seeded')) {
      window.localStorage.setItem(hKey as string, JSON.stringify(recs));
      window.localStorage.setItem('e2e-seeded', '1');
    }
    if (s) window.localStorage.setItem(sKey as string, JSON.stringify(s));
  }, [HISTORY_KEY, SETTINGS_KEY, records, settings ?? null] as const);
}

const history = (page: Page) =>
  page.evaluate(key => JSON.parse(window.localStorage.getItem(key) ?? '[]'), HISTORY_KEY);

test.describe('事後修正問題與類別（#34、#35）', () => {
  test('揭曉頁：改問題與類別，先看到後果提示，存了之後標出「改過」', async ({ page }) => {
    await seed(page, [{ ...BASE, id: 'r1', mode: 'draw', questionText: '換工做？', questionCategory: 'career' }]);
    await page.goto('/reveal?recordId=r1&mode=draw');

    const box = page.getByTestId('record-question').filter({ visible: true });
    await expect(box).toContainText('換工做？', { timeout: 30_000 });
    await expect(box.getByTestId('record-question-category')).toHaveText('問事類別：事業');
    await expect(box.getByTestId('record-question-changed')).toHaveCount(0);

    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-input').fill('要不要換工作？');
    // 還沒換類別時不提示；一換就要在按儲存之前講清楚後果
    await expect(box.getByTestId('record-question-cat-warning')).toHaveCount(0);
    await box.getByTestId('record-question-cat-wealth').click();
    await expect(box.getByTestId('record-question-cat-warning')).toContainText('用神');
    await box.getByTestId('record-question-save').click();

    await expect(box).toContainText('要不要換工作？');
    await expect(box.getByTestId('record-question-category')).toHaveText('問事類別：財運');
    await expect(box.getByTestId('record-question-changed')).toContainText('類別於');
    const [saved] = await history(page);
    expect(saved).toMatchObject({ questionText: '要不要換工作？', questionCategory: 'wealth' });
    expect(typeof saved.categoryChangedAt).toBe('number');
  });

  test('揭曉頁：改了類別，六爻盤的用神真的跟著換（提示說的後果要成立）', async ({ page }) => {
    // 卦象與 divination.spec「用神斷語」同一組：水雷屯、健康（疾病）以世爻為用神
    await seed(page, [{
      ...BASE, id: 'r1', mode: 'draw', poemId: 3, poemTitle: '水雷屯', poemLevel: '中吉',
      engineVersion: 3, hexagramName: '水雷屯', hexagramIndex: 43, movingLine: 2, hourBranch: 3,
      questionCategory: 'career',
    }]);
    await page.goto('/reveal?recordId=r1&mode=draw');
    const box = page.getByTestId('record-question').filter({ visible: true });
    await expect(box.getByTestId('record-question-category')).toHaveText('問事類別：事業', { timeout: 30_000 });
    await expect(page.getByText('用神斷語', { exact: true })).toBeVisible();
    await expect(page.getByText(/用神世爻（.+持世）/)).toHaveCount(0);

    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-cat-health').click();
    await box.getByTestId('record-question-save').click();

    await expect(box.getByTestId('record-question-category')).toHaveText('問事類別：健康');
    await expect(page.getByText(/用神世爻（.+持世）/)).toBeVisible();
  });

  test('揭曉頁：只改錯字、類別不動，不會標「改過」；取消不存', async ({ page }) => {
    await seed(page, [{ ...BASE, id: 'r1', mode: 'draw', questionText: '原本的問題', questionCategory: 'career' }]);
    await page.goto('/reveal?recordId=r1&mode=draw');
    const box = page.getByTestId('record-question').filter({ visible: true });
    await expect(box).toContainText('原本的問題', { timeout: 30_000 });

    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-input').fill('不會存的字');
    await box.getByTestId('record-question-cancel').click();
    await expect(box).toContainText('原本的問題');

    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-input').fill('改過錯字的問題');
    await box.getByTestId('record-question-save').click();
    await expect(box).toContainText('改過錯字的問題');
    await expect(box.getByTestId('record-question-changed')).toHaveCount(0);
  });

  test('揭曉頁：沒寫問題的記錄也補得上', async ({ page }) => {
    await seed(page, [{ ...BASE, id: 'r1', mode: 'draw' }]);
    await page.goto('/reveal?recordId=r1&mode=draw');
    const box = page.getByTestId('record-question').filter({ visible: true });
    await expect(box).toContainText('這次沒有寫下問題', { timeout: 30_000 });
    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-input').fill('補上的問題');
    await box.getByTestId('record-question-save').click();
    await expect(box).toContainText('補上的問題');
  });

  test('靈棋頁：同樣改得了', async ({ page }) => {
    await seed(page, [{
      ...BASE, id: 'lq', mode: 'lingqi', poemId: 0, poemTitle: '大通卦', poemLevel: '', lingqiKey: '1-1-1',
      questionText: '靈棋的問題', questionCategory: 'career',
    }]);
    await page.goto('/lingqi?recordId=lq');
    const box = page.getByTestId('record-question').filter({ visible: true });
    await expect(box).toContainText('靈棋的問題', { timeout: 30_000 });
    await box.getByTestId('record-question-edit').click();
    await box.getByTestId('record-question-cat-wealth').click();
    await box.getByTestId('record-question-save').click();
    await expect(box.getByTestId('record-question-category')).toHaveText('問事類別：財運');
    await expect(box.getByTestId('record-question-changed')).toBeVisible();
  });
});

test.describe('資料夾改名（#36）', () => {
  test('改名後名稱換掉、歸檔還在', async ({ page }) => {
    await seed(page, [{ ...BASE, id: 'f1', mode: 'draw' }], {
      ...DEFAULT_SETTINGS,
      folders: [{ id: 'folder-1', name: '舊名字', color: '#C9A96E', recordIds: ['f1'] }],
    });
    await page.goto('/collection');
    await page.getByText(/^資料夾 \(\d+\)$/).click({ timeout: 30_000 });
    await page.getByTestId('folder-open-folder-1').click();

    await page.getByTestId('folder-rename').click();
    await page.getByTestId('folder-rename-input').fill('');
    await expect(page.getByTestId('folder-rename-save')).toBeDisabled();
    await page.getByTestId('folder-rename-input').fill('新名字');
    await page.getByTestId('folder-rename-save').click();

    await expect(page.getByText('新名字').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByTestId('folder-grid').getByTestId('record-pieces')).toHaveCount(1);
    const settings = await page.evaluate(key => JSON.parse(window.localStorage.getItem(key) ?? '{}'), SETTINGS_KEY);
    expect(settings.folders).toEqual([{ id: 'folder-1', name: '新名字', color: '#C9A96E', recordIds: ['f1'] }]);
  });
});
