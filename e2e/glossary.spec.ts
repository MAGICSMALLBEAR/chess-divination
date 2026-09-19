// 命理術語詞典 e2e
//
// 單元測試（glossary.test.ts）守的是「詞典寫的事實對得上程式」；這裡守的是
// 使用者真的走得到、看得到：兩個入口都通、搜尋在真的 TextInput 上會動、
// 切成英文後不是一整頁中文。走真瀏覽器的理由與 S66 相同——元件與資料各自
// 全綠，不代表那條路由有註冊、入口有接上、頁面在靜態匯出後真的長得出來。

import { test, expect, SETTINGS_KEY, DEFAULT_SETTINGS, HISTORY_KEY } from './fixtures';
import { GLOSSARY, GLOSSARY_GROUPS } from '../src/data/glossary';

test.describe('術語詞典', () => {
  test('設定頁的工具區進得去，列出全部詞條與六個分組', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('settings-glossary').click();

    await expect(page.getByTestId('glossary-title')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('glossary-count')).toContainText(String(GLOSSARY.length));
    for (const group of GLOSSARY_GROUPS) {
      await expect(page.getByTestId(`glossary-group-${group}`)).toBeVisible();
    }
    // 兩段都要在畫面上——第二段（在本 App）才是這份詞典的價值
    const useGod = page.getByTestId('glossary-entry-useGod');
    await expect(useGod).toContainText('用神');
    await expect(useGod).toContainText('在本 App');
  });

  test('搜尋：用漢字術語查會縮小結果，查無結果顯示空狀態，清掉又回來', async ({ page }) => {
    await page.goto('/glossary');
    const search = page.getByTestId('glossary-search');
    await expect(search).toBeVisible({ timeout: 30_000 });

    await search.fill('月破');
    await expect(page.getByTestId('glossary-entry-monthBroken')).toBeVisible();
    // 不相干的詞條與整個分組都要消失，而不是只是沒排在最前面
    await expect(page.getByTestId('glossary-entry-primary')).toHaveCount(0);
    await expect(page.getByTestId('glossary-group-hexagram')).toHaveCount(0);
    await expect(page.getByTestId('glossary-count')).not.toContainText(String(GLOSSARY.length));

    await search.fill('這個詞不存在zzzz');
    await expect(page.getByTestId('glossary-empty')).toBeVisible();
    await expect(page.getByTestId('glossary-count')).toContainText('0');

    await search.fill('');
    await expect(page.getByTestId('glossary-empty')).toHaveCount(0);
    await expect(page.getByTestId('glossary-count')).toContainText(String(GLOSSARY.length));
  });

  test('揭曉頁的盤面下方有入口，點了進詞典，返回回到揭曉頁', async ({ page }) => {
    await page.addInitScript(
      ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
      [HISTORY_KEY, [{
        id: 'target', timestamp: Date.now(),
        poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
        drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'],
        drawnPieceChars: ['帥', '車'], isFavorited: false, mode: 'draw',
        hexagramIndex: 0, movingLine: 3, hexagramName: '乾為天',
      }]] as const,
    );

    await page.goto('/reveal?recordId=target&mode=draw');
    const link = page.getByTestId('reveal-glossary-link');
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.click();

    await expect(page.getByTestId('glossary-title')).toBeVisible();
    await page.getByText('返回').filter({ visible: true }).first().click();
    await expect(page.getByTestId('reveal-glossary-link')).toBeVisible();
  });

  test('切成英文：術語仍是漢字、附英文對照，說明是英文，搜英文與搜漢字都命中', async ({ page }) => {
    await page.addInitScript(
      ([key, settings]) => window.localStorage.setItem(key as string, JSON.stringify(settings)),
      [SETTINGS_KEY, { ...DEFAULT_SETTINGS, lang: 'en' }] as const,
    );
    await page.goto('/glossary');

    const useGod = page.getByTestId('glossary-entry-useGod');
    await expect(useGod).toBeVisible({ timeout: 30_000 });
    await expect(useGod).toContainText('用神');
    await expect(useGod).toContainText('Use-god');
    await expect(useGod).toContainText('In this app');
    // 說明是英文，不是照抄中文
    await expect(useGod).toContainText('The line that stands for what you asked about');

    const search = page.getByTestId('glossary-search');
    await search.fill('void');
    await expect(page.getByTestId('glossary-entry-void')).toBeVisible();
    await search.fill('世爻');
    await expect(page.getByTestId('glossary-entry-worldResponding')).toBeVisible();
  });
});
