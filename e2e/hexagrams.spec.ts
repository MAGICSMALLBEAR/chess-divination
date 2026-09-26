// 卦典 e2e（Session 80）
//
// 單元測試（hexagramCatalog.test.ts）守的是「卦典寫的事實對得上真相來源」；
// 這裡守的是使用者走得到：分頁切得過去、卡片展開看得到六條爻辭、點互錯綜
// 會真的跳到那一卦並捲進畫面、揭曉頁的入口帶著本卦過來。
// 「捲進畫面」要用真瀏覽器量：卡片座標由 onLayout 回報，jsdom 沒有排版。

import { test, expect, HISTORY_KEY } from './fixtures';
import { ALL_POEMS } from '../src/data/poems';

test.describe('卦典', () => {
  test('切到卦典分頁：64 卦，展開水雷屯看得到六條爻辭與互錯綜', async ({ page }) => {
    await page.goto('/library');
    await page.getByTestId('library-tab-hexagrams').click();
    await expect(page.getByTestId('library-count')).toContainText('64');
    // 等級與五行篩選是籤詩的，卦典不該出現
    await expect(page.getByText('五行', { exact: true })).toHaveCount(0);

    const card = page.getByTestId('hexagram-card-3');
    await card.click();
    await expect(card.getByTestId('hexagram-judgment')).toContainText('屯：元亨，利貞。勿用有攸往，利建侯。');
    await expect(card.getByTestId('hexagram-image')).toContainText('雲雷，屯；君子以經綸。');
    const yao = card.getByTestId('hexagram-yao-texts');
    await expect(yao).toContainText('初九：磐桓');
    await expect(yao).toContainText('上六：乘馬班如，泣血漣如。');
    await expect(card.getByTestId('hexagram-relation-nuclear')).toContainText('山地剝');
    await expect(card.getByTestId('hexagram-relation-opposite')).toContainText('火風鼎');
    await expect(card.getByTestId('hexagram-relation-reversed')).toContainText('山水蒙');
  });

  test('點錯卦跳到那一卦：目標展開、來源收起、目標捲進畫面', async ({ page }) => {
    await page.goto('/library');
    await page.getByTestId('library-tab-hexagrams').click();

    // 目標要離來源夠遠，才量得出「有沒有捲過去」：屯 #3 → 錯卦鼎 #50。
    // 泰／否、既濟／未濟這類相鄰的配對，不捲也在畫面裡，測不出東西
    const source = page.getByTestId('hexagram-card-3');
    await source.click();
    await source.getByTestId('hexagram-relation-opposite').click();

    const target = page.getByTestId('hexagram-card-50');
    await expect(target.getByTestId('hexagram-yao-texts')).toBeVisible();
    await expect(target.getByTestId('hexagram-yao-texts')).toContainText('鼎顛趾');
    await expect(source.getByTestId('hexagram-yao-texts')).toHaveCount(0);
    await expect(target).toBeInViewport({ timeout: 5_000 });
  });

  test('綜卦是自己的卦（乾）：印「即本卦」且不能按', async ({ page }) => {
    await page.goto('/library?tab=hexagrams');
    const card = page.getByTestId('hexagram-card-1');
    await card.click();
    const reversed = card.getByTestId('hexagram-relation-reversed');
    await expect(reversed).toContainText('即本卦');
    // toBeDisabled 只認特定 role 上的 aria-disabled；這一列刻意不是連結，直接看屬性
    await expect(reversed).toHaveAttribute('aria-disabled', 'true');
    await expect(card.getByTestId('hexagram-relation-opposite')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('搜尋一句爻辭，找到它在哪一卦；搜尋中點關係卦會清掉搜尋並跳過去', async ({ page }) => {
    await page.goto('/library?tab=hexagrams');
    const search = page.getByPlaceholder('搜尋卦名或爻辭...');
    await search.fill('潛龍勿用');
    await expect(page.getByTestId('library-count')).toContainText('1');
    const qian = page.getByTestId('hexagram-card-1');
    await qian.click();

    await qian.getByTestId('hexagram-relation-opposite').click();
    await expect(search).toHaveValue('');
    await expect(page.getByTestId('library-count')).toContainText('64');
    const kun = page.getByTestId('hexagram-card-2');
    await expect(kun.getByTestId('hexagram-yao-texts')).toContainText('履霜，堅冰至');
  });

  test('看這一卦的籤詩：切到籤詩分頁、展開同一號籤詩', async ({ page }) => {
    await page.goto('/library?tab=hexagrams');
    const card = page.getByTestId('hexagram-card-40');
    await card.click();
    await card.getByTestId('hexagram-open-poem').click();

    await expect(page.getByTestId('library-tab-poems')).toHaveAttribute('aria-selected', 'true');
    const poem = ALL_POEMS.find(p => p.id === 40)!;
    const vernacular = page.getByText(poem.vernacular, { exact: true });
    await expect(vernacular).toBeVisible();
    await expect(vernacular).toBeInViewport({ timeout: 5_000 });
  });

  test('揭曉頁的入口帶著本卦過來：卦典開在那一卦、已展開、捲進畫面', async ({ page }) => {
    // 火水未濟 #64 是卦典最後一張，入口若沒帶卦序或沒捲動，一定看不到
    await page.addInitScript(
      ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
      [HISTORY_KEY, [{
        id: 'target', timestamp: Date.now(),
        poemId: 64, poemTitle: '未濟', poemContent: '一二三四', poemLevel: '平',
        drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'],
        drawnPieceChars: ['帥', '車'], isFavorited: false, mode: 'draw',
        // 先天序：上離 2 × 8 + 下坎 5 = 21
        hexagramIndex: 21, movingLine: 3, hexagramName: '火水未濟',
      }]] as const,
    );

    await page.goto('/reveal?recordId=target&mode=draw');
    const link = page.getByTestId('reveal-hexagram-link');
    await expect(link).toBeVisible({ timeout: 30_000 });
    // 盤面上本卦的卦辭與大象（S81）：一爻動讀本卦卦辭，不列變卦的
    const judgment = page.getByTestId('liuyao-judgment');
    await expect(judgment).toContainText('未濟：亨。小狐汔濟，濡其尾，无攸利。');
    await expect(judgment).toContainText('火在水上');
    await expect(link).toContainText('火水未濟');
    await link.click();

    const card = page.getByTestId('hexagram-card-64');
    await expect(card.getByTestId('hexagram-yao-texts')).toContainText('濡其尾');
    await expect(card).toBeInViewport({ timeout: 5_000 });
  });
});
