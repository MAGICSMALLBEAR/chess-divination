// 巢狀可按元件的事件範圍
//
// 這個檔案存在的理由是一項**審查誤判**。Session 32 的審查認為
// react-native-web 底下 DOM click 會往外冒泡、RN-web 的 handler 不擋，
// 因此「按分享圖示會同時跳到抽棋頁」。
//
// 實際讀 react-native-web 0.21 的 PressResponder 原始碼，其 onClick
// 在未 disabled 時一律先呼叫 event.stopPropagation()，註解也明講
// 「onPress 只會在 click target 最近的那一個 PressResponder 祖先上觸發」。
// 也就是說巢狀 Touchable 本來就不會連鎖。
//
// 但「讀原始碼覺得沒事」和「瀏覽器裡真的沒事」是兩回事，而這件事
// 沒有任何測試守著——所以把結論釘在真瀏覽器裡。若哪天升級 RNW
// 改掉了這個行為，這裡會紅，而不是等使用者回報「按分享跳走了」。

import { test, expect } from './fixtures';

test.describe('巢狀可按元件不會連鎖觸發', () => {
  test.beforeEach(async ({ page }) => {
    // Web Share API 在 headless Chromium 不存在，socialShare 會走 catch
    // 再降級到剪貼簿（需要權限、會讓測試分心）。這裡直接注入一個成功的
    // navigator.share，把測試focus在「有沒有導頁」這一件事上。
    await page.addInitScript(() => {
      (window as unknown as { __shared: number }).__shared = 0;
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => {
          (window as unknown as { __shared: number }).__shared += 1;
          return Promise.resolve();
        },
      });
    });
  });

  test('按每日運勢的分享圖示不會連帶開啟抽棋頁', async ({ page }) => {
    await page.goto('/');

    const share = page.getByTestId('daily-share');
    await expect(share).toBeVisible();

    const before = page.url();
    await share.click();

    // 分享確實發生了（證明按到的是內層按鈕，不是整張卡片被擋住）
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __shared: number }).__shared))
      .toBe(1);

    // 而外層那張卡片的 onPress（router.push('/draw')）沒有被觸發
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
  });

  test('按整張每日運勢卡片仍會進入抽棋頁', async ({ page }) => {
    await page.goto('/');

    // 對照組：外層卡片本身還是可按的。少了這一條，上面那條測試
    // 就算整張卡片壞掉不能按也照樣會過。
    await page.getByText('今日棋運').click();
    await expect(page).toHaveURL(/\/draw/);
  });
});
