// 圖鑑「我抽過」（路線圖 #29）與記錄匯出 CSV（路線圖 #30）e2e
//
// #29：標記要出現在對的卡上（v1 舊記錄只標籤詩不標卦典、靈棋只標靈棋），
//      沒抽過的卡不印任何東西（不點名缺哪幾張），「看最近一次」開的是最新那一筆。
// #30：從設定頁走完整條路——隱私開關、下載的檔案內容、關掉開關時個人欄位留空。

import fs from 'fs';
import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const DAY = 86_400_000;

function record(id: string, over: Record<string, unknown> = {}) {
  return {
    id, mode: 'draw', timestamp: Date.now() - DAY,
    poemId: 5, poemTitle: '', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4, ...over,
  };
}

const HISTORY = [
  record('p5-old', { timestamp: Date.now() - 9 * DAY, questionText: '=舊的問題' }),
  record('p5-new', { timestamp: Date.now() - 1 * DAY, questionText: '要不要換工作', note: '私人筆記' }),
  // v1：卦序錯，只該標籤詩 #7
  record('v1', { poemId: 7, engineVersion: undefined }),
  record('lq', { mode: 'lingqi', poemId: 0, poemTitle: '大通卦', poemLevel: '', lingqiKey: '1-1-1' }),
];

async function seed(page: Page) {
  await page.addInitScript(([key, recs]) => {
    if (!window.localStorage.getItem(key as string)) window.localStorage.setItem(key as string, JSON.stringify(recs));
  }, [HISTORY_KEY, HISTORY] as const);
}

test.describe('圖鑑「我抽過」（#29）', () => {
  test('籤詩：抽過的卡標次數，沒抽過的什麼都不印；v1 舊記錄也算籤詩', async ({ page }) => {
    await seed(page);
    await page.goto('/library');
    await expect(page.getByTestId('poem-card-5').getByTestId('drawn-tag')).toHaveText('抽過 2 次', { timeout: 30_000 });
    await expect(page.getByTestId('poem-card-7').getByTestId('drawn-tag')).toHaveText('抽過 1 次');
    await expect(page.getByTestId('poem-card-1').getByTestId('drawn-tag')).toHaveCount(0);
    // 靈棋記錄的 poemId 是 0，不能被當成任何一首籤詩
    await expect(page.getByTestId('drawn-tag')).toHaveCount(2);
  });

  test('卦典：v1 舊記錄不標（卦象與籤詩對不上）', async ({ page }) => {
    await seed(page);
    await page.goto('/library?tab=hexagrams');
    await expect(page.getByTestId('hexagram-card-5').getByTestId('drawn-tag')).toHaveText('抽過 2 次', { timeout: 30_000 });
    await expect(page.getByTestId('hexagram-card-7').getByTestId('drawn-tag')).toHaveCount(0);
  });

  test('靈棋：標在對的卦目上', async ({ page }) => {
    await seed(page);
    await page.goto('/library');
    await page.getByTestId('library-tab-lingqi').click();
    const card = page.getByTestId('lingqi-card').filter({ hasText: '大通卦' });
    await expect(card.getByTestId('drawn-tag')).toHaveText('抽過 1 次', { timeout: 30_000 });
    await expect(page.getByTestId('drawn-tag')).toHaveCount(1);
  });

  test('「看最近一次」開的是最新那一筆', async ({ page }) => {
    await seed(page);
    await page.goto('/library');
    await page.getByTestId('poem-card-5').click();
    await page.getByTestId('poem-card-5').getByTestId('drawn-open-latest').click();
    await expect(page).toHaveURL(/\/reveal\?.*recordId=p5-new/);
  });
});

test.describe('記錄匯出 CSV（#30）', () => {
  async function exportCsv(page: Page, includePersonal: boolean): Promise<string> {
    page.on('dialog', d => d.accept());
    await page.goto('/settings');
    await page.getByTestId('settings-export-csv').click();
    await expect(page.getByText('匯出 4 筆記錄成試算表？')).toBeVisible();
    if (!includePersonal) await page.getByRole('switch').filter({ visible: true }).last().click();
    const download = page.waitForEvent('download');
    await page.getByTestId('report-export-confirm').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^chess-divination-records-\d{4}-\d{2}-\d{2}\.csv$/);
    return fs.readFileSync((await file.path())!, 'utf-8');
  }

  test('下載的檔案：BOM、表頭、一筆一列、由舊到新、公式注入被擋', async ({ page }) => {
    await seed(page);
    const csv = await exportCsv(page, true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0].startsWith('日期時間,方式,')).toBe(true);
    expect(lines).toHaveLength(1 + HISTORY.length);
    expect(csv.indexOf('p5-old')).toBeLessThan(csv.indexOf('p5-new'));
    expect(csv).toContain("'=舊的問題");
    expect(csv).toContain('要不要換工作');
    expect(csv).toContain('私人筆記');
  });

  test('關掉「包含問題與筆記」：個人文字不進檔案', async ({ page }) => {
    await seed(page);
    const csv = await exportCsv(page, false);
    expect(csv).not.toContain('要不要換工作');
    expect(csv).not.toContain('私人筆記');
    expect(csv).not.toContain('舊的問題');
    // 其餘照舊
    expect(csv).toContain('p5-new');
  });

  test('沒有記錄時直接說，不開對話框', async ({ page }) => {
    const alerts: string[] = [];
    page.on('dialog', d => { alerts.push(d.message()); d.accept(); });
    await page.goto('/settings');
    await page.getByTestId('settings-export-csv').click();
    await expect.poll(() => alerts.join('\n')).toContain('還沒有任何占卜記錄可以匯出');
    await expect(page.getByTestId('report-export-confirm')).toHaveCount(0);
  });
});
