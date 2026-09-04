import { Platform, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  shareNative,
  shareToLine,
  shareToFacebook,
  shareToTarget,
  copyToClipboard,
  formatDivinationShareText,
  formatLingqiShareText,
  SHARE_URL,
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

/**
 * shareNative 回傳三態而非布林。
 *
 * 布林的 `false` 同時代表「使用者按了取消」與「這台裝置沒有分享功能」，
 * 而這兩件事該做的相反：前者什麼都別做，後者才該端出降級的去處選單。
 * 混在一起的後果是使用者按取消卻立刻被塞第二張選單，首頁更糟——
 * 取消之後剪貼簿被靜靜覆寫。
 */
describe('shareNative', () => {
  test('使用者完成分享時回傳 shared', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('shared');
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
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('shared');
  });

  /** 原生（iOS）取消是 resolve 出 dismissedAction，不是拋錯 */
  test('原生端使用者取消回傳 dismissed，不是 unavailable', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction } as never);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('dismissed');
  });

  /**
   * Web 端取消 navigator.share 是 reject 一個 AbortError。這一條與下一條
   * 是同一個 catch 的兩種輸入，卻必須分出兩個結果——分不開的話，
   * 「使用者改變主意」會得到跟「桌面瀏覽器沒有分享功能」一樣的待遇。
   */
  test('Web 端使用者取消（reject AbortError）回傳 dismissed', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const abort = Object.assign(new Error('Share canceled'), { name: 'AbortError' });
    jest.spyOn(Share, 'share').mockRejectedValue(abort);
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('dismissed');
  });

  /**
   * 桌面瀏覽器沒有 navigator.share 時，react-native-web 是 reject 一個
   * 普通的 Error（'Share is not supported in this browser'）——這才是
   * 該端出降級選單的情況。
   */
  test('沒有分享功能時回傳 unavailable', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share is not supported in this browser'));
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('unavailable');
  });

  /** 分享失敗不得讓籤詩頁崩潰——這是加值動作，不是主線流程 */
  test('底層拋錯時回傳 unavailable 而非往上拋', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no share sheet'));
    await expect(shareNative({ title: 't', text: 'x' })).resolves.toBe('unavailable');
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

  /**
   * 這一條原本寫成「未安裝 LINE 時**不開啟連結**」，斷言 `openURL` 沒被呼叫
   * ——又是一次把缺陷本身當成規格記下來（`copyToClipboard` 那兩條的前科）。
   *
   * 使用者的視角是：按下「LINE」，選單關掉，然後什麼都沒有。沒有 LINE、
   * 沒有訊息、沒有任何跡象，看起來就是按鈕壞了。退到網頁版網址至少讓
   * 「按了有反應」成立，能不能完成分享則交給 LINE 決定。
   */
  test('原生端未安裝 LINE 時退到網頁版網址，而不是什麼都不做', async () => {
    setPlatform('ios');
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    expect(() => shareToLine({ title: 't', text: 'hi-B' })).not.toThrow();
    await flushMicrotasks();
    expect(openURL).toHaveBeenCalledWith('https://line.me/R/msg/text/?hi-B');
  });

  /** canOpenURL 本身拋錯（權限、平台差異）時同樣要有反應，且不得往上拋 */
  test('原生端 canOpenURL 拋錯時仍退到網頁版網址', async () => {
    setPlatform('ios');
    jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('not allowed'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    expect(() => shareToLine({ title: 't', text: 'hi-C' })).not.toThrow();
    await flushMicrotasks();
    await flushMicrotasks();
    expect(openURL).toHaveBeenCalledWith('https://line.me/R/msg/text/?hi-C');
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

/**
 * shareToTarget：分享去處選單挑完之後走的那一段。
 *
 * 為什麼要有這一層：揭曉頁與靈棋頁的降級路徑一字不差，分開寫遲早會有一邊
 * 漏掉 Facebook 那段的剪貼簿處理。回傳的是訊息鍵而非直接 notify——服務層
 * 不碰 i18n 與對話框，畫面才決定得了要不要說、怎麼說。
 */
describe('shareToTarget', () => {
  function stubWeb(clipboardOk = true) {
    setPlatform('web');
    const open = jest.fn();
    (globalThis as { window?: unknown }).window = { open };
    const writeText = clipboardOk
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new Error('denied'));
    (globalThis as { navigator?: unknown }).navigator = { clipboard: { writeText } };
    return { open, writeText };
  }

  test('LINE：開 LINE，不動剪貼簿，也不必說話', async () => {
    const { open, writeText } = stubWeb();

    await expect(shareToTarget('line', { title: 't', text: '內容' })).resolves.toBeNull();
    expect(open.mock.calls[0][0]).toContain('line.me');
    expect(writeText).not.toHaveBeenCalled();
  });

  /**
   * 這一條是 Facebook 這個去處存在的理由本身：`sharer.php` 只帶得走網址，
   * quote 早被 Meta 忽略。不先複製一份，使用者選了 Facebook 只會得到一個
   * 光禿禿的連結，而他要分享的那首籤詩不見了。
   */
  test('Facebook：先把內容複製起來，再開 sharer，並告知已複製', async () => {
    const { open, writeText } = stubWeb();

    await expect(shareToTarget('facebook', { title: 't', text: '內容' }))
      .resolves.toBe('share.fbCopied');
    expect(writeText).toHaveBeenCalledWith('內容');
    expect(open.mock.calls[0][0]).toContain('facebook.com/sharer/sharer.php');
  });

  test('Facebook：沒帶 url 時補上 App 網址，否則會是一則空貼文', async () => {
    const { open } = stubWeb();

    await shareToTarget('facebook', { title: 't', text: '內容' });
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent(SHARE_URL));
  });

  test('Facebook：呼叫端自己帶了 url 就用它的，不覆寫', async () => {
    const { open } = stubWeb();

    await shareToTarget('facebook', { title: 't', text: '內容', url: 'https://example.com/x' });
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent('https://example.com/x'));
  });

  /** 複製失敗仍然要開 sharer——分享得出去總比什麼都沒發生好，只是不謊稱已複製 */
  test('Facebook：剪貼簿被拒時照樣開 sharer，但不說「已複製」', async () => {
    const { open } = stubWeb(false);

    await expect(shareToTarget('facebook', { title: 't', text: '內容' })).resolves.toBeNull();
    expect(open.mock.calls[0][0]).toContain('facebook.com/sharer/sharer.php');
  });

  test('複製：成功與失敗各回一個訊息鍵，兩種都要說一聲', async () => {
    stubWeb();
    await expect(shareToTarget('copy', { title: 't', text: '內容' }))
      .resolves.toBe('reveal.copied');

    stubWeb(false);
    await expect(shareToTarget('copy', { title: 't', text: '內容' }))
      .resolves.toBe('reveal.copyManual');
  });
});
