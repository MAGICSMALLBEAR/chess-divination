// 同一件事的占卜（路線圖 #11）e2e
//
// 單元測試（related.test.ts、storage.test.ts）驗的是連結規則與資料；這裡驗的是使用者
// 真的走得通：入口在、選單開得起來、連結後並列看得到、取消回得去，而且兩個入口
// （揭曉頁與靈棋頁）都接上——「同一個功能的第二個入口最容易被漏掉」是這個專案
// 記過很多次的教訓。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

/** 六爻記錄。hexagramIndex／movingLine 讓揭曉頁與並列比較都算得出卦例 */
function draw(id: string, daysAgo: number, over: Record<string, unknown> = {}) {
  return {
    id, poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'], drawnPieceChars: ['帥', '車'],
    isFavorited: false, engineVersion: 4, mode: 'draw',
    hexagramIndex: 0, movingLine: 3, hexagramName: '乾為天',
    timestamp: Date.now() - daysAgo * DAY,
    ...over,
  };
}

function lingqi(id: string, daysAgo: number, over: Record<string, unknown> = {}) {
  return {
    id, poemId: 0, poemTitle: '大通卦', poemContent: '一二三四', poemLevel: '',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
    mode: 'lingqi', lingqiKey: '1-1-1', isFavorited: false, engineVersion: 3,
    timestamp: Date.now() - daysAgo * DAY,
    ...over,
  };
}

async function seedHistory(page: Page, records: unknown[]) {
  await page.addInitScript(
    ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
    [HISTORY_KEY, records] as const,
  );
}

async function storedRelatedTo(page: Page, id: string) {
  return page.evaluate(([key, recordId]) => {
    const list = JSON.parse(window.localStorage.getItem(key as string) ?? '[]') as { id: string; relatedTo?: string }[];
    return list.find(r => r.id === recordId)?.relatedTo ?? null;
  }, [HISTORY_KEY, id] as const);
}

test.describe('同一件事的占卜', () => {
  test('揭曉頁：手動連結先前那一次 → 並列卦象 → 取消連結', async ({ page }) => {
    await seedHistory(page, [
      // 同一張盤（乾為天、三爻動）與另一張盤（換了動爻），問題各不相同——沒有任何自動建議
      draw('old-same', 9, { questionText: '要不要換工作', questionCategory: 'career' }),
      draw('old-diff', 20, { movingLine: 5, questionText: '想去旅行', questionCategory: 'travel' }),
      draw('target', 0, { questionText: '換工作的事再看一次', questionCategory: 'career' }),
    ]);

    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('related-open')).toBeVisible({ timeout: 30_000 });
    // 問題不同 → 不建議；連結必須由使用者主動發起
    await expect(page.getByTestId('related-suggestion')).toHaveCount(0);
    await expect(page.getByTestId('related-compare')).toHaveCount(0);

    await page.getByTestId('related-open').click();
    const picker = page.getByTestId('related-picker');
    await expect(picker).toBeVisible();
    // 同類別的排在前面
    const rows = picker.locator('[data-testid^="related-candidate-"]');
    await expect(rows).toHaveCount(2);
    expect(await rows.first().getAttribute('data-testid')).toBe('related-candidate-old-same');
    await expect(rows.first()).toContainText('類別相同');

    await page.getByTestId('related-candidate-old-same').click();
    await expect(picker).toHaveCount(0);

    // 連結存進去了，並列出現：同一張盤，本卦、變卦、動爻都相同
    await expect.poll(() => storedRelatedTo(page, 'target')).toBe('old-same');
    const compare = page.getByTestId('related-compare');
    await expect(compare).toBeVisible();
    await expect(compare).toContainText('乾為天');
    const facts = page.getByTestId('related-facts');
    await expect(facts).toContainText('兩次的本卦相同');
    await expect(facts).toContainText('兩次的變卦相同');
    await expect(facts).toContainText('兩次的動爻相同');
    // 通行說法要註明是通行說法，且 App 明說不替使用者決定信哪一次
    await expect(page.getByTestId('related-note')).toContainText('一事不二占');
    await expect(page.getByTestId('related-note')).toContainText('不替你決定');
    // 連結之後入口收起，不會同時出現「再連結一次」
    await expect(page.getByTestId('related-open')).toHaveCount(0);

    await page.getByTestId('related-unlink').click();
    await expect.poll(() => storedRelatedTo(page, 'target')).toBeNull();
    await expect(page.getByTestId('related-compare')).toHaveCount(0);
    await expect(page.getByTestId('related-open')).toBeVisible();
  });

  test('本卦相同但動爻不同：並列如實說不同，不把它們說成同一張盤', async ({ page }) => {
    await seedHistory(page, [
      draw('old', 9, { movingLine: 5 }),
      draw('target', 0, { movingLine: 3 }),
    ]);

    await page.goto('/reveal?recordId=target&mode=draw');
    await page.getByTestId('related-open').click();
    await page.getByTestId('related-candidate-old').click();

    const facts = page.getByTestId('related-facts');
    await expect(facts).toContainText('兩次的本卦相同');
    await expect(facts).toContainText('兩次的動爻不同');
    await expect(facts).toContainText('兩次的變卦不同');
  });

  test('問題文字完全相同：只「建議」，按下連結才成立', async ({ page }) => {
    await seedHistory(page, [
      draw('old', 9, { questionText: '我該換工作嗎' }),
      draw('target', 0, { questionText: '我該 換工作嗎' }),
    ]);

    await page.goto('/reveal?recordId=target&mode=draw');
    const suggestion = page.getByTestId('related-suggestion');
    await expect(suggestion).toBeVisible({ timeout: 30_000 });
    // 只是建議：沒按之前，資料裡不能已經有連結
    expect(await storedRelatedTo(page, 'target')).toBeNull();
    await expect(page.getByTestId('related-compare')).toHaveCount(0);

    await page.getByTestId('related-suggestion-link').click();
    await expect.poll(() => storedRelatedTo(page, 'target')).toBe('old');
    await expect(page.getByTestId('related-compare')).toBeVisible();
    await expect(page.getByTestId('related-suggestion')).toHaveCount(0);
  });

  test('沒有任何較早的記錄：整塊不出現（沒有東西可連結、也沒有東西可說）', async ({ page }) => {
    await seedHistory(page, [draw('only', 0)]);

    await page.goto('/reveal?recordId=only&mode=draw');
    await expect(
      page.getByTestId('reading-split').or(page.getByTestId('reading-single')),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('related-readings').locator('*')).toHaveCount(0);
  });

  test('被連結的那一筆看得到「之後又占過」，點下去到那一筆', async ({ page }) => {
    await seedHistory(page, [
      draw('old', 9),
      draw('target', 0, { relatedTo: 'old' }),
    ]);

    await page.goto('/reveal?recordId=old&mode=draw');
    const later = page.getByTestId('related-later');
    await expect(later).toBeVisible({ timeout: 30_000 });
    await expect(later).toContainText('1 次');
    // 舊的這一筆沒有更早的東西可連結，也不該有「連結先前」的入口
    await expect(page.getByTestId('related-open')).toHaveCount(0);

    await page.getByTestId('related-later-target').click();
    await expect(page).toHaveURL(/recordId=target/, { timeout: 30_000 });
    await expect(page.getByTestId('related-compare')).toBeVisible();
  });

  /**
   * 指向的記錄已經不存在（被刪、備份殘留）：顯示端不信任 id，當作沒有連結，
   * 而不是顯示一張空的或壞掉的並列卡。
   */
  test('連結指向已不存在的記錄：當作沒有連結，入口照常', async ({ page }) => {
    await seedHistory(page, [
      draw('older', 9),
      draw('target', 0, { relatedTo: 'ghost' }),
    ]);

    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('related-open')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('related-compare')).toHaveCount(0);
  });

  test('靈棋頁（第二個入口）也接得到；六爻對靈棋只並列名稱、不逐項比較', async ({ page }) => {
    await seedHistory(page, [
      draw('old-draw', 9, { questionText: '換工作' }),
      lingqi('old-lq', 5),
      lingqi('target-lq', 0),
    ]);

    await page.goto('/lingqi?recordId=target-lq&mode=lingqi');
    await expect(page.getByTestId('related-open')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('related-open').click();
    // 兩筆較早的都列出來（靈棋與六爻），由使用者決定
    await expect(page.locator('[data-testid^="related-candidate-"]')).toHaveCount(2);

    // 連到六爻那一筆：不同套的卦，不說相同或不同
    await page.getByTestId('related-candidate-old-draw').click();
    await expect.poll(() => storedRelatedTo(page, 'target-lq')).toBe('old-draw');
    await expect(page.getByTestId('related-facts')).toContainText('不同的占法');
    await expect(page.getByTestId('related-facts')).not.toContainText('兩次的本卦相同');
    await expect(page.getByTestId('related-facts')).not.toContainText('兩次的本卦不同');

    // 改連到靈棋那一筆：同一套，可以逐項比
    await page.getByTestId('related-unlink').click();
    await page.getByTestId('related-open').click();
    await page.getByTestId('related-candidate-old-lq').click();
    await expect.poll(() => storedRelatedTo(page, 'target-lq')).toBe('old-lq');
    await expect(page.getByTestId('related-facts')).toContainText('兩次的本卦相同');
  });

  test('切成英文：說明與提醒是英文，沒有殘留中文（卦名是資料值，不在此列）', async ({ page }) => {
    await seedHistory(page, [
      draw('old', 9, { questionText: 'q' }),
      draw('target', 0, { relatedTo: 'old', questionText: 'q' }),
    ]);
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );

    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('related-note')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('related-note')).toContainText('does not decide which to trust');
    await expect(page.getByTestId('related-facts')).toContainText('the same both times');
    const note = await page.getByTestId('related-note').innerText();
    expect(note).not.toMatch(/[一-鿿]/);
  });

  /**
   * S76 補完：連結原本只在揭曉頁與靈棋頁看得到，收藏清單上看不出哪幾筆是同一件事。
   * 標記的規則與揭曉頁相同（resolvePrevious）——指不到東西的連結兩端都不標。
   */
  test('收藏頁：有效連結的兩端標「同一件事」，無關與失效連結的不標；取消後標記消失', async ({ page }) => {
    await seedHistory(page, [
      draw('older', 9),
      draw('target', 0, { relatedTo: 'older' }),
      draw('stranger', 5),
      draw('dangling', 1, { relatedTo: 'gone' }),
    ]);

    await page.goto('/collection');
    await expect(page.getByTestId('record-related-target')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('record-related-target')).toHaveText('同一件事');
    await expect(page.getByTestId('record-related-older')).toBeVisible();
    await expect(page.getByTestId('record-related-stranger')).toHaveCount(0);
    await expect(page.getByTestId('record-related-dangling')).toHaveCount(0);

    // 從卡片點進去取消連結，再用返回鍵回到收藏頁：標記要跟著消失。
    // 必須走站內導覽而不是 goto——goto 會重新掛載（也會重跑 addInitScript 把連結灌回去），
    // 遮住「收藏頁只在掛載時讀一次」的缺陷（S74 首頁同一個教訓）。
    await page.getByTestId('record-related-target').click();
    await page.getByTestId('related-unlink').click({ timeout: 30_000 });
    await expect.poll(() => storedRelatedTo(page, 'target')).toBeNull();
    await page.goBack();
    await expect(page.getByTestId('record-related-stranger')).toHaveCount(0);
    await expect(page.getByTestId('record-related-target')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId('record-related-older')).toHaveCount(0);
  });
});
