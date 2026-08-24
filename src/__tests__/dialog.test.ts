// 跨平台對話框：行為測試 + 守門。
//
// 背景：`Alert` 在 react-native-web 是空殼（class Alert { static alert() {} }），
// 呼叫它什麼都不會發生。線上 PWA 因此有一批動作完全是死的——還原備份、
// 刪除記錄、清空歷史、刪除資料夾與自訂類別、棋盤返回確認。有確認鈕的更糟：
// onPress 永遠不會被呼叫，整個功能等於不存在，且沒有任何錯誤訊息。
//
// 下方的守門測試禁止畫面層再直接用 Alert——這個缺陷能活這麼久，正是因為
// 沒有任何東西擋著它。

import fs from 'fs';
import path from 'path';

import * as nativeDialog from '../services/dialog';
// jest-expo 的預設平台是 ios，寫 '../services/dialog' 會解析到原生版，
// 要測 web 版必須明確指名（音效測試同此作法）
import * as webDialog from '../services/dialog.web';

import { Alert } from 'react-native';

// 用 spy 而非 jest.mock('react-native', …)：整個替換掉這個模組會讓
// expo-modules-core 取不到 Platform.select，整個 suite 連載入都失敗。
const alertMock = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

afterEach(() => {
  alertMock.mockClear();
});

describe('原生版', () => {
  test('notify 轉呼叫 Alert.alert', () => {
    nativeDialog.notify('標題', '說明');
    expect(alertMock).toHaveBeenCalledWith('標題', '說明');
  });

  test('confirmAction 按下確認回 true', async () => {
    const promise = nativeDialog.confirmAction({
      title: '清空歷史', confirmLabel: '清空', cancelLabel: '取消', destructive: true,
    });
    const buttons = alertMock.mock.calls[0][2];
    buttons[1].onPress();
    await expect(promise).resolves.toBe(true);
  });

  test('confirmAction 按下取消回 false', async () => {
    const promise = nativeDialog.confirmAction({
      title: '清空歷史', confirmLabel: '清空', cancelLabel: '取消',
    });
    const buttons = alertMock.mock.calls[0][2];
    buttons[0].onPress();
    await expect(promise).resolves.toBe(false);
  });

  /** Android 可用返回鍵／點外面關掉對話框，兩者都不觸發任何 onPress。
   *  少了 onDismiss，Promise 會永遠懸著，await 之後的程式全部不執行。 */
  test('Android 關閉對話框（onDismiss）回 false，不會懸著', async () => {
    const promise = nativeDialog.confirmAction({
      title: '清空歷史', confirmLabel: '清空', cancelLabel: '取消',
    });
    const options = alertMock.mock.calls[0][3];
    expect(options?.onDismiss).toBeDefined();
    options.onDismiss();
    await expect(promise).resolves.toBe(false);
  });

  test('destructive 對應 iOS 的紅字樣式，取消鈕為 cancel', () => {
    nativeDialog.confirmAction({
      title: '刪除', confirmLabel: '刪除', cancelLabel: '取消', destructive: true,
    });
    const buttons = alertMock.mock.calls[0][2];
    expect(buttons[0].style).toBe('cancel');
    expect(buttons[1].style).toBe('destructive');
  });

  test('非破壞性操作不用 destructive 樣式', () => {
    nativeDialog.confirmAction({ title: '分享', confirmLabel: '好', cancelLabel: '取消' });
    expect(alertMock.mock.calls[0][2][1].style).toBe('default');
  });
});

describe('Web 版', () => {
  const originalWindow = (global as any).window;
  afterEach(() => { (global as any).window = originalWindow; });

  test('confirmAction 用 window.confirm，按確定回 true', async () => {
    const confirmSpy = jest.fn(() => true);
    (global as any).window = { confirm: confirmSpy, alert: jest.fn() };

    await expect(webDialog.confirmAction({
      title: '清空歷史', message: '此動作無法復原', confirmLabel: '清空', cancelLabel: '取消',
    })).resolves.toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('清空歷史\n\n此動作無法復原');
  });

  test('按取消回 false', async () => {
    (global as any).window = { confirm: jest.fn(() => false), alert: jest.fn() };
    await expect(webDialog.confirmAction({
      title: '清空歷史', confirmLabel: '清空', cancelLabel: '取消',
    })).resolves.toBe(false);
  });

  test('notify 用 window.alert；沒有說明時只顯示標題', () => {
    const alertSpy = jest.fn();
    (global as any).window = { confirm: jest.fn(), alert: alertSpy };
    webDialog.notify('已清空');
    expect(alertSpy).toHaveBeenCalledWith('已清空');
  });

  /** 靜態匯出的預渲染階段沒有 window；那時沒有使用者可以回答，
   *  一律當成「未同意」，絕不能因為拿不到答案就往下執行刪除 */
  test('沒有 window 時 confirmAction 回 false 而非拋錯', async () => {
    delete (global as any).window;
    await expect(webDialog.confirmAction({
      title: '刪除', confirmLabel: '刪除', cancelLabel: '取消',
    })).resolves.toBe(false);
  });

  test('沒有 window 時 notify 靜默略過', () => {
    delete (global as any).window;
    expect(() => webDialog.notify('x')).not.toThrow();
  });
});

describe('兩個平台的介面一致', () => {
  test('匯出的函式名稱相同', () => {
    expect(Object.keys(nativeDialog).sort()).toEqual(Object.keys(webDialog).sort());
  });
});

describe('守門：畫面層不得直接使用 Alert', () => {
  const SRC = path.join(__dirname, '..');

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        walk(full, out);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }

  /**
   * 唯一允許碰 Alert 的地方是 dialog.ts 本身——那正是把它包起來的那一層。
   * 其他任何檔案用了，就是又走回「web 上按了沒反應」的老路。
   */
  const ALLOWED = ['services\\dialog.ts', 'services/dialog.ts'];

  test('src/ 下沒有其他檔案呼叫 Alert.alert', () => {
    const offenders = walk(SRC)
      .filter(file => !ALLOWED.some(allowed => file.endsWith(allowed)))
      .filter(file => /\bAlert\s*\.\s*alert\s*\(/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  test('src/ 下沒有其他檔案從 react-native 匯入 Alert', () => {
    const offenders = walk(SRC)
      .filter(file => !ALLOWED.some(allowed => file.endsWith(allowed)))
      .filter(file => {
        const source = fs.readFileSync(file, 'utf8');
        // 只看 import 語句本身，避免把註解裡提到的 Alert 也算進來
        return /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/s.test(source);
      })
      .map(file => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  /** 畫面層也不該再各自寫 window.confirm／window.alert 的平台判斷 */
  test('畫面層不直接使用 window.confirm／window.alert', () => {
    const offenders = walk(path.join(SRC, 'app'))
      .concat(walk(path.join(SRC, 'components')))
      .filter(file => /window\s*\.\s*(confirm|alert)\s*\(/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
