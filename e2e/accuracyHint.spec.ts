// 個人化應驗率提示（AccuracyHint）e2e
//
// 為什麼不只信單元測試：元件本身的 enoughSamples 判斷已由
// accuracyHint.test.tsx 用 mock getHistory 驗過，但那支測試繞過了
// 真正的 AsyncStorage（web 端即 localStorage）與 reveal/lingqi 兩頁
// 各自把 questionCategory 接進去的那段真接線——S66 的教訓是「全綠只代表
// 已寫的斷言成立」，接線本身要走一次真瀏覽器才能排除「元件對、接線錯」。
// 兩個入口（reveal.tsx 抽棋／棋盤共用、lingqi.tsx 自成一頁）都要各驗一次
// ——這正是 WORKLOG 反覆記下的「同一功能的第二個入口最容易被漏掉」。

import { test, expect, HISTORY_KEY } from './fixtures';
import type { Page } from '@playwright/test';

const AT = Date.now() - 2 * 86_400_000;

const DRAW_BASE = {
  poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
  drawnPieceTypes: ['general', 'chariot'], drawnPieceColors: ['red', 'black'],
  drawnPieceChars: ['帥', '車'], isFavorited: false, mode: 'draw' as const,
};

type OutcomeStatus = 'accurate' | 'partial' | 'inaccurate';

/** 4 則應驗＋1 則未應驗的「感情」已驗記錄，加權應驗率 = 4/5 = 80% */
function fiveVerifiedMarriageRecords() {
  const statuses: OutcomeStatus[] = ['accurate', 'accurate', 'accurate', 'accurate', 'inaccurate'];
  return statuses.map((status, i) => ({
    ...DRAW_BASE, id: `v${i}`, questionCategory: 'marriage',
    timestamp: AT - i * 1000,
    outcome: { status, verifiedAt: AT },
  }));
}

async function seed(page: Page, records: unknown[]) {
  await page.addInitScript(
    ([key, recs]) => window.localStorage.setItem(key as string, JSON.stringify(recs)),
    [HISTORY_KEY, records] as const,
  );
}

test.describe('個人化應驗率提示', () => {
  test('reveal 頁：樣本足夠時顯示類別、筆數與應驗率', async ({ page }) => {
    const target = {
      ...DRAW_BASE, id: 'target', questionCategory: 'marriage', timestamp: Date.now(),
    };
    await seed(page, [...fiveVerifiedMarriageRecords(), target]);

    await page.goto('/reveal?recordId=target&mode=draw');
    const hint = page.getByTestId('accuracy-hint');
    await expect(hint).toBeVisible({ timeout: 30_000 });
    await expect(hint).toContainText('感情');
    await expect(hint).toContainText('5');
    await expect(hint).toContainText('80');
  });

  test('reveal 頁：樣本不足（少於 5 則已驗）時不顯示', async ({ page }) => {
    const target = {
      ...DRAW_BASE, id: 'target', questionCategory: 'marriage', timestamp: Date.now(),
    };
    // 只給兩則已驗記錄，不到 MIN_INSIGHT_SAMPLES 門檻
    const few = fiveVerifiedMarriageRecords().slice(0, 2);
    await seed(page, [...few, target]);

    await page.goto('/reveal?recordId=target&mode=draw');
    // 用一定會出現的既有容器確認頁面真的載入完成，而不是提示恰好還沒渲染；
    // 籤詩標題在頁面上出現不只一處（標題列＋解讀散文帶到），不能拿來當
    // 「載入完成」的判準（strict mode 會撞上，與 WORKLOG 記過的同一種坑）。
    // SplitReading 依斷點只出其中一個 testID（mobile 是 reading-single、
    // 桌面才是 reading-split），兩者擇一出現才算載入完成
    await expect(
      page.getByTestId('reading-split').or(page.getByTestId('reading-single')),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('accuracy-hint')).toHaveCount(0);
  });

  test('lingqi 頁：第二個入口也接得到（子領域先映回主類別）', async ({ page }) => {
    // 用子領域 'relationship'（映回 marriage）驗證映射確實在真頁面上生效，
    // 不是只在單元測試裡對的
    const records = fiveVerifiedMarriageRecords();
    const target = {
      poemId: 0, poemLevel: '', poemTitle: '大通卦',
      drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
      lingqiKey: '1-1-1', mode: 'lingqi' as const,
      id: 'target-lingqi', questionCategory: 'relationship', timestamp: Date.now(),
      isFavorited: false,
    };
    await seed(page, [...records, target]);

    await page.goto('/lingqi?recordId=target-lingqi');
    const hint = page.getByTestId('accuracy-hint');
    await expect(hint).toBeVisible({ timeout: 30_000 });
    await expect(hint).toContainText('感情');
  });
});
