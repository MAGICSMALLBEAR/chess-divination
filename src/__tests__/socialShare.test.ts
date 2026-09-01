import { Platform, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  shareNative,
  shareToLine,
  shareToFacebook,
  copyToClipboard,
  formatDivinationShareText,
  formatLingqiShareText,
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

  /**
   * react-native-web 的 Share.share 直接回傳 navigator.share() 的結果，
   * 而後者成功時 resolve 的是 undefined——不是 { action }。
   * 舊寫法讀 result.action 會拋 TypeError 被 catch 接走，於是每一次
   * **成功**的 web 分享都被回報成失敗，籤詩頁接著跳出多餘的
   * 「分享到 LINE？」確認框，首頁則偷偷覆寫使用者的剪貼簿。
   *
   * 先前的測試一律 mock 成 { action: sharedAction }，真實形狀從沒被測到。
   */
  test('Web 端 navigator.share 成功（resolve undefined）視為分享成功', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue(undefined as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe(true);
  });

  test('使用者取消分享時回傳 false', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction } as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe(false);
  });

  /** web 端使用者取消 navigator.share 是 reject（AbortError），仍須回 false */
  test('Web 端使用者取消（reject AbortError）回傳 false', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const abort = Object.assign(new Error('Share canceled'), { name: 'AbortError' });
    jest.spyOn(Share, 'share').mockRejectedValue(abort);
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

  /**
   * 這兩條原本寫成「原生端降級為分享選單」，把缺陷本身當成規格記了下來。
   *
   * copyToClipboard 是呼叫端在分享失敗後走的降級路徑，它卻再開一次
   * Share.share——使用者一關掉分享選單，同一個選單立刻又跳出來，
   * 而且從頭到尾沒有任何東西被複製到剪貼簿。
   */
  test('原生端真的寫入剪貼簿，不再開分享選單', async () => {
    setPlatform('ios');
    const shareSpy = jest.spyOn(Share, 'share');
    const clipboardSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValue(undefined as never);

    await expect(copyToClipboard('文字')).resolves.toBe(true);
    expect(clipboardSpy).toHaveBeenCalledWith('文字');
    expect(shareSpy).not.toHaveBeenCalled();
  });

  test('原生端寫入剪貼簿失敗時回傳 false', async () => {
    setPlatform('ios');
    jest.spyOn(Clipboard, 'setStringAsync').mockRejectedValue(new Error('failed'));

    await expect(copyToClipboard('文字')).resolves.toBe(false);
  });
});


describe('靈棋分享文字', () => {
  const oracle = {
    notation: '三上一中一下',
    name: '明陽卦',
    image: '小吉之象',
    cast: { upper: 3, middle: 1, lower: 1 },
    xiang: ['仕宦及時', '祿與年期'],
    shi: ['東風吹動九衢開', '和氣還從日下來'],
  };

  test('卦名、象、卦目與卦辭都在', () => {
    const text = formatLingqiShareText(oracle);
    expect(text).toContain('明陽卦');
    expect(text).toContain('小吉之象');
    expect(text).toContain('三上一中一下');
    expect(text).toContain('東風吹動九衢開');
    expect(text).toContain('仕宦及時');
  });

  /**
   * 不共用籤詩那支的理由就在這裡：籤詩版的標題是
   * `${poemLevel} · ${poemTitle}`，靈棋沒有等級，套進去會變成
   * 前面缺一塊的「 · 明陽卦」，還會多一行空的「抽得：」。
   */
  test('標題不以分隔點開頭，也沒有空的棋子行', () => {
    const text = formatLingqiShareText(oracle);
    expect(text).not.toMatch(/】\s*·/);
    expect(text).not.toContain('抽得：');
  });

  test('有問題時帶上問題，沒有就不留空行標記', () => {
    expect(formatLingqiShareText({ ...oracle, question: '該接這份工作嗎' })).toContain('該接這份工作嗎');
    expect(formatLingqiShareText(oracle)).not.toContain('❓');
  });
});

/**
 * 分享出去要看得出用的是哪個牌陣。
 *
 * 在此之前分享內容只有籤詩與卦象：選了兩軍對壘陣或抉擇陣，分享給人看
 * 跟隨手擺三顆棋長得一模一樣。牌陣名由呼叫端譯好再傳進來（reveal.tsx），
 * 因為 SPREAD_LABEL_KEYS 是 i18n 鍵、不是字面值。
 */
describe('formatDivinationShareText 的牌陣', () => {
  const base = {
    poemTitle: '乾為天',
    poemLevel: '大吉',
    hexagramName: '乾為天',
    lines: ['天行健者自強息'],
    vernacular: '此卦象徵剛健中正。',
    pieceChars: ['帥', '車'],
  };

  test('有牌陣時印成獨立一行', () => {
    const text = formatDivinationShareText({ ...base, spreadName: '兩軍對壘陣' });
    expect(text).toContain('牌陣：兩軍對壘陣');
    const line = text.split('\n').find(l => l.includes('牌陣：'));
    expect(line).toContain('兩軍對壘陣');
  });

  test('沒有牌陣時不冒出空的一行', () => {
    const text = formatDivinationShareText(base);
    expect(text).not.toContain('牌陣');
  });

  test('抽棋與自由佈局同樣不帶——呼叫端傳 undefined', () => {
    const text = formatDivinationShareText({ ...base, spreadName: undefined });
    expect(text).not.toContain('牌陣');
  });
});
