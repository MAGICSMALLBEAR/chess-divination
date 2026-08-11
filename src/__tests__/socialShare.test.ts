import { Platform, Linking, Share } from 'react-native';
import {
  shareNative,
  shareToLine,
  shareToFacebook,
  copyToClipboard,
  formatDivinationShareText,
} from '../services/socialShare';

const originalOS = Platform.OS;

function setPlatform(os: 'web' | 'ios' | 'android') {
  (Platform as { OS: string }).OS = os;
}

/**
 * shareToLine 在原生端是同步回傳、非同步開連結（內部的 canOpenURL().then 沒有被 await）。
 * 不排空這個 promise，它會在下一個測試才 resolve 並打到當時裝的 spy 上。
 */
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

beforeEach(() => {
  // react-native 的 Linking / Share 在 jest-expo 下本身已是 mock，
  // restoreAllMocks 還原不了，jest.spyOn 會拿回同一個 spy 並保留呼叫紀錄。
  // 必須額外 clearAllMocks 才能讓「不應被呼叫」這類斷言成立。
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  setPlatform(originalOS as 'ios');
});

describe('formatDivinationShareText', () => {
  const base = {
    poemTitle: '乾為天',
    poemLevel: '大吉',
    hexagramName: '乾為天',
    lines: ['天行健者自強息', '龍飛在天利見人'],
    vernacular: '此卦象徵剛健中正，凡事亨通。',
    pieceChars: ['帥', '車'],
  };

  test('包含籤詩標題、吉凶等級與卦名', () => {
    const text = formatDivinationShareText(base);
    expect(text).toContain('乾為天');
    expect(text).toContain('大吉');
    expect(text).toContain('卦：乾為天');
  });

  test('逐行保留籤詩內容', () => {
    const text = formatDivinationShareText(base);
    for (const line of base.lines) {
      expect(text).toContain(line);
    }
    // 詩句應各自成行，不得被併成一行
    const rows = text.split('\n');
    expect(rows).toContain('天行健者自強息');
    expect(rows).toContain('龍飛在天利見人');
  });

  test('抽得的棋子以空白分隔列出', () => {
    expect(formatDivinationShareText(base)).toContain('帥 車');
  });

  test('附上站台網址與標語', () => {
    const text = formatDivinationShareText(base);
    expect(text).toContain('chess-divination-app.vercel.app');
    expect(text).toContain('以棋問道 · 觀象知機');
  });

  describe('白話文截斷', () => {
    test('超過 80 字時截斷並補省略號', () => {
      const long = '甲'.repeat(200);
      const text = formatDivinationShareText({ ...base, vernacular: long });
      expect(text).toContain('甲'.repeat(80) + '...');
      expect(text).not.toContain('甲'.repeat(81) + '...');
    });

    test('短白話文原樣保留（仍帶省略號，與長文一致）', () => {
      const text = formatDivinationShareText({ ...base, vernacular: '短句。' });
      expect(text).toContain('短句。');
    });

    test('空白話文不應產生 undefined', () => {
      const text = formatDivinationShareText({ ...base, vernacular: '' });
      expect(text).not.toContain('undefined');
    });
  });

  describe('卦例區塊', () => {
    const reading = {
      primaryName: '乾為天',
      changedName: '天風姤',
      movingLineName: '初九',
      relation: '體剋用',
      level: '吉',
    };

    test('提供 reading 時列出本卦→變卦、動爻與體用', () => {
      const text = formatDivinationShareText({ ...base, reading });
      expect(text).toContain('乾為天 → 天風姤');
      expect(text).toContain('動爻 初九');
      expect(text).toContain('體剋用');
      expect(text).toContain('吉');
    });

    test('未提供 reading 時不出現體用字樣', () => {
      const text = formatDivinationShareText(base);
      expect(text).not.toContain('體用');
      expect(text).not.toContain('動爻');
    });

    /** 卦例必須排在網址之前，否則分享出去的文字會以技術資訊收尾 */
    test('卦例位於網址之前', () => {
      const text = formatDivinationShareText({ ...base, reading });
      expect(text.indexOf('體用')).toBeLessThan(text.indexOf('chess-divination-app'));
    });
  });

  test('任何欄位都不應讓輸出出現 undefined 或 null', () => {
    const text = formatDivinationShareText({ ...base, pieceChars: [] });
    expect(text).not.toMatch(/undefined|null/);
  });
});

describe('shareNative', () => {
  test('使用者完成分享時回傳 true', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe(true);
  });

  test('使用者取消分享時回傳 false', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction } as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe(false);
  });

  /** 分享失敗不得讓籤詩頁崩潰——這是加值動作，不是主線流程 */
  test('底層拋錯時回傳 false 而非往上拋', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no share sheet'));
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe(false);
  });

  test('把 title / text / url 轉交給原生分享', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
    await shareNative({ title: '象棋占卜', text: '內容', url: 'https://example.com' });
    expect(spy).toHaveBeenCalledWith({
      message: '內容',
      title: '象棋占卜',
      url: 'https://example.com',
    });
  });
});

describe('shareToLine', () => {
  test('Web 端開啟 LINE 分享網址', () => {
    setPlatform('web');
    const open = jest.fn();
    (globalThis as { window?: unknown }).window = { open };

    expect(shareToLine({ title: 't', text: '測試內容' })).toBe(true);
    expect(open).toHaveBeenCalledWith(
      `https://line.me/R/msg/text/?${encodeURIComponent('測試內容')}`,
      '_blank',
    );
  });

  /** 未編碼的 # 或 & 會讓 LINE 只收到片段文字 */
  test('Web 端對特殊字元做 URL 編碼', () => {
    setPlatform('web');
    const open = jest.fn();
    (globalThis as { window?: unknown }).window = { open };

    shareToLine({ title: 't', text: 'a&b#c 換行\n第二行' });
    const url = open.mock.calls[0][0] as string;
    expect(url).not.toContain('a&b#c');
    expect(url).toContain(encodeURIComponent('a&b#c 換行\n第二行'));
  });

  test('原生端改用 LINE 的 URL scheme', async () => {
    setPlatform('ios');
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    expect(shareToLine({ title: 't', text: 'hi-A' })).toBe(true);
    expect(Linking.canOpenURL).toHaveBeenCalledWith('line://msg/text/hi-A');

    await flushMicrotasks();
    expect(openURL).toHaveBeenCalledWith('line://msg/text/hi-A');
  });

  test('原生端未安裝 LINE 時不開啟連結，也不拋錯', async () => {
    setPlatform('ios');
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    expect(() => shareToLine({ title: 't', text: 'hi-B' })).not.toThrow();
    await flushMicrotasks();
    expect(openURL).not.toHaveBeenCalled();
  });
});

describe('shareToFacebook', () => {
  test('Web 端開啟 Facebook sharer 並帶上內容與網址', () => {
    setPlatform('web');
    const open = jest.fn();
    (globalThis as { window?: unknown }).window = { open };

    expect(shareToFacebook({ title: 't', text: '內容', url: 'https://example.com' })).toBe(true);
    const url = open.mock.calls[0][0] as string;
    expect(url).toContain('facebook.com/sharer/sharer.php');
    expect(url).toContain(encodeURIComponent('https://example.com'));
    expect(url).toContain(encodeURIComponent('內容'));
  });

  test('Web 端未提供 url 時仍可分享（u 參數留空）', () => {
    setPlatform('web');
    const open = jest.fn();
    (globalThis as { window?: unknown }).window = { open };

    expect(shareToFacebook({ title: 't', text: '內容' })).toBe(true);
    expect(open.mock.calls[0][0]).toContain('u=&quote=');
  });

  test('原生端降級為原生分享選單', () => {
    setPlatform('ios');
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);

    expect(shareToFacebook({ title: 't', text: '內容' })).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});

describe('copyToClipboard', () => {
  test('Web 端寫入剪貼簿並回傳 true', async () => {
    setPlatform('web');
    const writeText = jest.fn().mockResolvedValue(undefined);
    (globalThis as { navigator?: unknown }).navigator = { clipboard: { writeText } };

    await expect(copyToClipboard('文字')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('文字');
  });

  /** 未授權或非安全來源時 clipboard API 會拋錯，必須回 false 讓呼叫端改走其他方案 */
  test('Web 端剪貼簿被拒絕時回傳 false', async () => {
    setPlatform('web');
    (globalThis as { navigator?: unknown }).navigator = {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    };

    await expect(copyToClipboard('文字')).resolves.toBe(false);
  });

  test('Web 端沒有 clipboard API 時回傳 false 而非拋錯', async () => {
    setPlatform('web');
    (globalThis as { navigator?: unknown }).navigator = {};

    await expect(copyToClipboard('文字')).resolves.toBe(false);
  });

  test('原生端降級為分享選單', async () => {
    setPlatform('ios');
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);

    await expect(copyToClipboard('文字')).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith({ message: '文字' });
  });

  test('原生端分享失敗時回傳 false', async () => {
    setPlatform('ios');
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('failed'));

    await expect(copyToClipboard('文字')).resolves.toBe(false);
  });
});
