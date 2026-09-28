// 成就逐項進度 e2e（路線圖 #28）
//
// 說明寫著「累積 10 次占卜」，在此之前卻看不到自己做到第幾次。這裡驗畫面上真的印出來、
// 數字與解鎖條件一致，以及解鎖了、或「第一次…」那一類不印。

import { test, expect, HISTORY_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from './fixtures';

function record(id: string, level: string) {
  return {
    id, mode: 'draw', timestamp: Date.now() - 86_400_000,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: level,
    drawnPieceTypes: ['general'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    isFavorited: false, engineVersion: 4,
  };
}

test('累積 7 次：「棋道修行者」印 7／10，已解鎖的「初窺棋道」不印進度', async ({ page }) => {
  const history = Array.from({ length: 7 }, (_, i) => record(`r${i}`, i < 2 ? '上吉' : '大吉'));
  await page.addInitScript(([key, recs]) => {
    if (!window.localStorage.getItem(key as string)) window.localStorage.setItem(key as string, JSON.stringify(recs));
  }, [HISTORY_KEY, history] as const);
  await page.goto('/achievements');

  await expect(page.getByTestId('achievement-progress-ten_draws')).toHaveText('7／10', { timeout: 30_000 });
  await expect(page.getByTestId('achievement-progress-fifty_draws')).toHaveText('7／50');
  // 等級：只抽過大吉與上吉兩種
  await expect(page.getByTestId('achievement-progress-all_levels')).toHaveText('2／5');
  // 讀屏念得到進度
  await expect(page.getByTestId('achievement-ten_draws')).toHaveAttribute('aria-label', /7／10/);

  await expect(page.getByTestId('achievement-first_draw')).toHaveAttribute('aria-label', /已解鎖/);
  await expect(page.getByTestId('achievement-progress-first_draw')).toHaveCount(0);
  // 「第一次…」類沒解鎖也不印 0／1
  await expect(page.getByTestId('achievement-progress-first_board')).toHaveCount(0);
});

// 進度走到 target 的那一項，不可以還掛著鎖。抓過的實際情況：昨天用過、連續 6 天、
// 今天還沒占卜 → getStreak() 已把今天算進去（7），但七日成就原本只在占卜時解鎖，
// 於是畫面上是「七日問道：未解鎖，7／7」配一條滿的進度條。
test('連續第 7 天還沒占卜就打開成就頁：「七日問道」是解鎖的，不是 7／7 配一把鎖', async ({ page }) => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yesterday = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  await page.addInitScript(([key, settings]) => {
    window.localStorage.setItem(key as string, JSON.stringify(settings));
  }, [SETTINGS_KEY, { ...DEFAULT_SETTINGS, usageDates: [yesterday], currentStreak: 6 }] as const);
  await page.goto('/achievements');

  await expect(page.getByTestId('achievement-week_streak')).toHaveAttribute('aria-label', /已解鎖/, { timeout: 30_000 });
  // 解鎖了就不該再印進度（更不該是 7／7）
  await expect(page.getByTestId('achievement-progress-week_streak')).toHaveCount(0);
  await expect(page.getByTestId('achievement-week_streak')).not.toHaveAttribute('aria-label', /，7／7/);
});
