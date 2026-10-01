// P4 三項（10/1）：收藏頁類別篩選、結果頁長按術語速查、分享卡與報告署名。
//
// 三項各自守一條「使用者看得到的結果」，而不是只驗元件掛上了：
// - 類別篩選：選「事業」列出的正是事業與它的子領域那幾筆；自訂類別印名字不印 custom-…
// - 長按速查：長按一塊跳出的是那一塊的詞條；報告長圖裡的盤面不帶任何可長按的東西
// - 署名：分享卡與報告上真的印出名字；關掉（設定或單次）就真的不印

import { test, expect, HISTORY_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';
import type { Page } from '@playwright/test';

const CUSTOM = { key: 'custom-1700000000000', label: '搬家', icon: 'star' };

function record(id: string, questionCategory?: string, extra: Record<string, unknown> = {}) {
  return {
    id, mode: 'draw', timestamp: Date.now() - 3_600_000,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'], drawnPieceChars: ['帥', '車'],
    isFavorited: false, hexagramIndex: 0, movingLine: 3, hexagramName: '乾為天',
    ...(questionCategory ? { questionCategory } : {}),
    ...extra,
  };
}

/** 寫在 fixture 之後，覆蓋它的設定（addInitScript 依註冊順序執行） */
async function seed(page: Page, history: unknown[], settings: Record<string, unknown> = {}) {
  await page.addInitScript(([hk, h, sk, s]) => {
    window.localStorage.setItem(hk as string, JSON.stringify(h));
    window.localStorage.setItem(sk as string, JSON.stringify(s));
  }, [HISTORY_KEY, history, SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...settings }] as const);
}

async function visibleIds(page: Page): Promise<string[]> {
  const grid = page.getByTestId('card-grid').filter({ visible: true }).first();
  const ids = await grid.locator('[data-testid^="record-delete-"]').evaluateAll(
    els => els.map(el => el.getAttribute('data-testid')!.replace('record-delete-', '')),
  );
  return ids.sort();
}

/** 長按：滑鼠按住超過 delayLongPress（400ms）再放開 */
async function longPress(page: Page, testId: string) {
  const target = page.getByTestId(testId).filter({ visible: true }).first();
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 10));
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test.describe('收藏頁類別篩選（P4）', () => {
  const HISTORY = [
    record('career', 'career'),
    record('jobSearch', 'jobSearch'),
    record('wealth', 'wealth'),
    record('none'),
    record('custom', CUSTOM.key),
  ];

  test('選事業列出事業與求職；自訂類別印名字；再按一次取消', async ({ page }) => {
    await seed(page, HISTORY, { customCategories: [CUSTOM] });
    await page.goto('/collection');
    await expect.poll(() => visibleIds(page), { timeout: 30_000 }).toHaveLength(5);

    const row = page.getByTestId('collection-category-filters');
    // 只列出現過的主類別：求職併進事業，不自成一顆
    await expect(row.getByTestId('filter-category-jobSearch')).toHaveCount(0);
    await expect(row.getByTestId(`filter-category-${CUSTOM.key}`)).toHaveText('搬家');
    await expect(row).not.toContainText('custom-');

    await row.getByTestId('filter-category-career').click();
    await expect(row.getByTestId('filter-category-career')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => visibleIds(page)).toEqual(['career', 'jobSearch']);

    // 沒選類別的記錄歸「綜合」——結果頁上就是這樣顯示的
    await row.getByTestId('filter-category-general').click();
    await expect.poll(() => visibleIds(page)).toEqual(['none']);

    await row.getByTestId('filter-category-general').click();
    await expect.poll(() => visibleIds(page)).toHaveLength(5);
  });

  test('只有一種類別時不出現類別列（按下去與「全部」一樣）', async ({ page }) => {
    await seed(page, [record('a', 'career'), record('b', 'jobSearch')]);
    await page.goto('/collection');
    await expect.poll(() => visibleIds(page), { timeout: 30_000 }).toHaveLength(2);
    await expect(page.getByTestId('collection-category-filters')).toHaveCount(0);
  });

  test('結果頁的類別也印自訂名字，不印 custom-…（既有缺陷）', async ({ page }) => {
    await seed(page, HISTORY, { customCategories: [CUSTOM] });
    await page.goto('/reveal?recordId=custom&mode=draw');
    const label = page.getByTestId('record-question-category');
    await expect(label).toContainText('搬家', { timeout: 30_000 });
    await expect(label).not.toContainText('custom-');
  });
});

test.describe('結果頁長按術語速查（P4）', () => {
  test('長按三卦欄跳出那一卦的詞條；關閉後消失', async ({ page }) => {
    await seed(page, [record('target', 'career')]);
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('liuyao-term-primary')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('reveal-glossary-peek-tip')).toBeVisible();

    await longPress(page, 'liuyao-term-changed');
    const sheet = page.getByTestId('glossary-peek');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId('glossary-peek-changed')).toContainText('變卦');
    await expect(sheet.locator('[data-testid^="glossary-peek-"][data-testid$="primary"]')).toHaveCount(0);

    await page.getByTestId('glossary-peek-close').click();
    await expect(sheet).toHaveCount(0);
  });

  test('長按納甲盤的一爻：列出六神與這一爻的六親', async ({ page }) => {
    await seed(page, [record('target', 'career')]);
    await page.goto('/reveal?recordId=target&mode=draw');
    // 乾為天初爻：子孫甲子水
    await expect(page.getByTestId('liuyao-term-row-1')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('liuyao-term-row-1')).toContainText('子孫');
    await longPress(page, 'liuyao-term-row-1');
    const sheet = page.getByTestId('glossary-peek');
    await expect(sheet.getByTestId('glossary-peek-sixSpirits')).toBeVisible();
    await expect(sheet.getByTestId('glossary-peek-offspring')).toContainText('子孫');
    // 沒有的標記不列（不是每一爻都把整本詞典再印一次）
    await expect(sheet.getByTestId('glossary-peek-monthBroken')).toHaveCount(0);
  });

  test('短按不會打開（那是捲動與點選的手勢）；速查表能帶到詞典', async ({ page }) => {
    await seed(page, [record('target', 'career')]);
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('liuyao-term-bodyUse')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('liuyao-term-bodyUse').click();
    await page.waitForTimeout(600);
    await expect(page.getByTestId('glossary-peek')).toHaveCount(0);

    await longPress(page, 'liuyao-term-bodyUse');
    await expect(page.getByTestId('glossary-peek-bodyUse')).toBeVisible();
    await page.getByTestId('glossary-peek-open').click();
    await expect(page.getByTestId('glossary-title')).toBeVisible();
  });

  test('報告長圖裡的盤面沒有可長按的區塊（沒有 Provider，版面與以前相同）', async ({ page }) => {
    await seed(page, [record('target', 'career')]);
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('liuyao-term-primary')).toBeVisible({ timeout: 30_000 });
    const download = page.waitForEvent('download');
    await page.getByTestId('poem-export-report').click();
    await page.getByTestId('report-export-confirm').click();
    await download;
    // 報告卡已渲染出第二份盤面（liuyao-judgment 有兩份），但可長按的區塊仍只有結果頁那一份
    await expect(page.getByTestId('liuyao-judgment')).toHaveCount(2);
    await expect(page.getByTestId('liuyao-term-primary')).toHaveCount(1);
  });
});

test.describe('分享卡與報告署名（P4）', () => {
  async function exportReport(page: Page, toggleSignature = false) {
    await page.getByTestId('poem-export-report').click();
    if (toggleSignature) await page.getByTestId('report-export-signature').click();
    const download = page.waitForEvent('download');
    await page.getByTestId('report-export-confirm').click();
    await download;
    // 報告卡渲染完成的記號：盤面出現第二份
    await expect(page.getByTestId('liuyao-judgment')).toHaveCount(2);
  }

  test('有名字（預設開）：分享卡與報告都印「占者：Alex」，確認框上看得到名字', async ({ page }) => {
    await seed(page, [record('target', 'career')], { userName: '  Alex ' });
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('share-card-date')).toContainText('占者：Alex', { timeout: 30_000 });

    await page.getByTestId('poem-export-report').click();
    await expect(page.getByText('署名：Alex')).toBeVisible();
    await page.getByTestId('report-export-cancel').click();
    await exportReport(page);
    await expect(page.getByTestId('report-signature')).toHaveText('占者：Alex');
  });

  test('匯出時單次關掉：報告不印；下次打開開關又回到預設', async ({ page }) => {
    await seed(page, [record('target', 'career')], { userName: 'Alex' });
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('share-card-date')).toContainText('Alex', { timeout: 30_000 });
    await exportReport(page, true);
    await expect(page.getByTestId('report-signature')).toHaveCount(0);

    await page.getByTestId('poem-export-report').click();
    await expect(page.getByTestId('report-export-signature').getByRole('switch')).toBeChecked();
  });

  test('設定關掉署名：分享卡不印，確認框的開關預設關', async ({ page }) => {
    await seed(page, [record('target', 'career')], { userName: 'Alex', signCards: false });
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('share-card-date')).toBeAttached({ timeout: 30_000 });
    await expect(page.getByTestId('share-card-date')).not.toContainText('Alex');
    await page.getByTestId('poem-export-report').click();
    await expect(page.getByTestId('report-export-signature').getByRole('switch')).not.toBeChecked();
  });

  test('沒填名字：不出現署名開關，什麼都不印', async ({ page }) => {
    await seed(page, [record('target', 'career')]);
    await page.goto('/reveal?recordId=target&mode=draw');
    await expect(page.getByTestId('share-card-date')).toBeAttached({ timeout: 30_000 });
    await expect(page.getByTestId('share-card-date')).not.toContainText('占者');
    await page.getByTestId('poem-export-report').click();
    await expect(page.getByTestId('report-export-signature')).toHaveCount(0);
  });

  test('設定頁的開關寫入設定，說明裡帶著名字', async ({ page }) => {
    await seed(page, [], { userName: 'Alex' });
    await page.goto('/settings');
    await expect(page.getByTestId('settings-sign-hint')).toContainText('占者：Alex', { timeout: 30_000 });
    await page.getByTestId('settings-sign-cards').click();
    await expect.poll(() => page.evaluate(k => JSON.parse(window.localStorage.getItem(k)!).signCards, SETTINGS_KEY))
      .toBe(false);
  });
});

test.describe('AI 提示詞的自訂類別（S97）', () => {
  /** 攔下揭曉頁送給 /api/interpret 的請求本體 */
  async function interpretPayload(page: Page): Promise<Record<string, unknown>> {
    let payload: Record<string, unknown> | null = null;
    await page.route('**/api/interpret', route => {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ interpretation: '解讀' }) });
    });
    await page.getByText('請 AI 解讀此卦').click({ timeout: 30_000 });
    await expect.poll(() => payload).not.toBeNull();
    return payload!;
  }

  test('自訂類別：送出使用者取的名字', async ({ page }) => {
    await seed(page, [record('target', CUSTOM.key)], { customCategories: [CUSTOM] });
    await page.goto('/reveal?recordId=target&mode=draw');
    const body = await interpretPayload(page);
    expect(body.questionCategory).toBe(CUSTOM.key);
    expect(body.questionCategoryLabel).toBe('搬家');
  });

  test('自訂類別已刪除：不送名字（伺服器端就整行省略）', async ({ page }) => {
    await seed(page, [record('target', CUSTOM.key)]);
    await page.goto('/reveal?recordId=target&mode=draw');
    const body = await interpretPayload(page);
    expect(body.questionCategoryLabel).toBeUndefined();
  });

  test('內建類別不帶名字欄位', async ({ page }) => {
    await seed(page, [record('target', 'career')], { customCategories: [CUSTOM] });
    await page.goto('/reveal?recordId=target&mode=draw');
    const body = await interpretPayload(page);
    expect(body.questionCategoryLabel).toBeUndefined();
  });
});
