// 分享截圖成品檢查的測試
//
// 這個模組守的是一個「成功卻是壞的」故障：view-shot 截不到圖會 reject
// （呼叫端接得到），但截出一張空白圖時 promise 正常 resolve，使用者
// 就這樣分享出去一張白紙，而我們什麼都不會知道。
//
// 因此測試的重點有三：量得準（base64 與檔案兩種來源）、
// 量不到時不亂擋（null 一律放行，防線本身不該變成故障點）、
// 以及 reveal.tsx 那張離屏卡片不會又被加回 opacity: 0。

import fs from 'fs';
import path from 'path';

const mockSize = jest.fn<number, [string]>();

// expo-file-system 的原生模組在 jest 下不存在，且這裡要驗的是
// 「File.size 拿到什麼就怎麼判斷」，用假的 File 反而測得更準
jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: class {
    size: number;
    constructor(uri: string) { this.size = mockSize(uri); }
  },
}));

import {
  dataUriByteLength, captureByteLength, isPlausibleCapture,
  MIN_PLAUSIBLE_CAPTURE_BYTES,
} from '../services/shareCapture';

beforeEach(() => {
  mockSize.mockReset();
  mockSize.mockReturnValue(0);
});

describe('dataUriByteLength', () => {
  test('每 4 個 base64 字元換算 3 位元組', () => {
    expect(dataUriByteLength('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUriByteLength('data:image/png;base64,AAAAAAAA')).toBe(6);
  });

  test('結尾的 = 補位不算進位元組數', () => {
    // 這是最容易寫錯的一段：忽略 padding 會讓 1 位元組的圖算成 3
    expect(dataUriByteLength('data:image/png;base64,AA==')).toBe(1);
    expect(dataUriByteLength('data:image/png;base64,AAA=')).toBe(2);
  });

  test('空載荷是 0 而不是 null——「量到了，是空的」', () => {
    expect(dataUriByteLength('data:image/png;base64,')).toBe(0);
  });

  test('不是 base64 資料 URI 一律回傳 null', () => {
    expect(dataUriByteLength('file:///tmp/a.png')).toBeNull();
    expect(dataUriByteLength('data:image/svg+xml,%3Csvg/%3E')).toBeNull();
    expect(dataUriByteLength('')).toBeNull();
  });

  /**
   * 真實的 web 截圖是一條數百 KB 的字串。這條同時守著
   * 「別為了量長度而切子字串」——切了會多複製一份整張圖。
   */
  test('大載荷算得出來且與長度成正比', () => {
    const payload = 'A'.repeat(400_000);
    expect(dataUriByteLength(`data:image/png;base64,${payload}`)).toBe(300_000);
  });
});

describe('captureByteLength', () => {
  test('data URI 走 base64 換算，不碰檔案系統', () => {
    expect(captureByteLength('data:image/png;base64,AAAA')).toBe(3);
    expect(mockSize).not.toHaveBeenCalled();
  });

  test('file:// 走檔案大小', () => {
    mockSize.mockReturnValue(123_456);
    expect(captureByteLength('file:///tmp/shot.png')).toBe(123_456);
    expect(mockSize).toHaveBeenCalledWith('file:///tmp/shot.png');
  });

  test('讀不到的檔案是 0，不是 null——0 會被擋下來', () => {
    // File.size 對不存在／讀不到的檔案就是回 0
    mockSize.mockReturnValue(0);
    expect(captureByteLength('file:///tmp/missing.png')).toBe(0);
    expect(isPlausibleCapture(captureByteLength('file:///tmp/missing.png'))).toBe(false);
  });

  test('File 建構丟例外時回傳 null 而非讓分享整個炸掉', () => {
    mockSize.mockImplementation(() => { throw new Error('EPERM'); });
    expect(captureByteLength('file:///tmp/shot.png')).toBeNull();
  });

  test('認不得的 URI 形式回傳 null', () => {
    expect(captureByteLength('content://media/external/1')).toBeNull();
    expect(captureByteLength('ph://ABC-123')).toBeNull();
  });
});

describe('isPlausibleCapture', () => {
  test('門檻以上放行、以下擋掉', () => {
    expect(isPlausibleCapture(MIN_PLAUSIBLE_CAPTURE_BYTES)).toBe(true);
    expect(isPlausibleCapture(MIN_PLAUSIBLE_CAPTURE_BYTES - 1)).toBe(false);
  });

  /**
   * 這條是這個模組的自我約束：量不到大小時（認不得的 URI、讀檔失敗）
   * 一律放行。防線只該擋「明確太小」，不該因為自己看不懂而擋下
   * 一次本來會成功的分享。
   */
  test('量不到大小時放行', () => {
    expect(isPlausibleCapture(null)).toBe(true);
  });

  test('門檻遠低於真卡片、遠高於空白圖', () => {
    // 400×680 帶不透明底色與文字的 PNG 至少數十 KB；
    // 全透明或單色的同尺寸 PNG 只有 1–3KB。門檻落在中間的空隙裡。
    expect(MIN_PLAUSIBLE_CAPTURE_BYTES).toBeGreaterThan(3 * 1024);
    expect(MIN_PLAUSIBLE_CAPTURE_BYTES).toBeLessThan(20 * 1024);
  });
});

/**
 * A25 的另一半：分享卡是離屏渲染的，過去同時加了 opacity: 0。
 * iOS 端的 view-shot 走 drawViewHierarchyInRect（照螢幕上的樣子重畫），
 * alpha 為 0 的子樹截出空白是有回報的行為——我們沒有實機可以排除它，
 * 而 opacity 對「藏起來」這件事本來就是多餘的（卡片已經在畫面外 9999pt）。
 *
 * 這條守著它不被順手加回來，也守著代替它的 aria-hidden 還在：
 * 少了 aria-hidden，報讀器會把整首籤詩念第二遍。
 */
describe('離屏分享卡的隱藏方式', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'reveal.tsx'), 'utf-8',
  );

  test('shareHidden 樣式不含 opacity', () => {
    const block = src.match(/shareHidden:\s*\{([^}]*)\}/);
    expect(block).not.toBeNull();
    expect(block![1]).not.toMatch(/opacity/);
    // 真正負責隱藏的是離屏定位，這個得在
    expect(block![1]).toMatch(/position:\s*'absolute'/);
  });

  test('分享卡外層有 aria-hidden', () => {
    const usage = src.match(/<View style=\{styles\.shareHidden\}([^>]*)>/);
    expect(usage).not.toBeNull();
    expect(usage![1]).toContain('aria-hidden');
  });
});
