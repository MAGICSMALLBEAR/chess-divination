// 社群分享服務
// 支援 LINE、Facebook 等社群平台的一鍵分享，
// 以及 Web Share API / 複製到剪貼簿等通用方案。

import { Platform, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { t } from './i18n';

export interface ShareContent {
  title: string;
  text: string;
  url?: string;
}

/**
 * 分享去處。原生分享選單拿不到時（桌面瀏覽器、拒絕授權），
 * 由 ShareTargetSheet 讓使用者自己挑一個。
 */
export type ShareTarget = 'line' | 'facebook' | 'copy';

/**
 * 分享出去的落點。Facebook 的 sharer 只認 `u` 參數，`quote` 早已被
 * 忽略——沒有這個網址，分享出去會是一則完全空白的貼文。
 */
export const SHARE_URL = 'https://chess-divination-app.vercel.app';

/**
 * 原生分享選單的三種結果。
 *
 * 為什麼不是布林：`false` 原本同時代表「使用者按了取消」與「這台裝置根本
 * 沒有分享功能」，而這兩件事該做的相反——前者要什麼都別做，後者才該把
 * 降級的去處選單端出來。混在一起的後果是**使用者按了取消，卻立刻被塞了
 * 第二張選單**；首頁的每日運勢更糟，取消之後剪貼簿會被靜靜覆寫。
 *
 * 這與 `copyToClipboard` 曾經「在分享失敗後再開一次分享選單」是同一個病，
 * 只是那次長在服務裡，這次長在呼叫端與回傳值的語意之間。
 */
export type ShareNativeOutcome = 'shared' | 'dismissed' | 'unavailable';

/** 嘗試使用 Web Share API（行動裝置原生分享選單） */
export async function shareNative(content: ShareContent): Promise<ShareNativeOutcome> {
  try {
    const result = await Share.share({
      message: content.text,
      title: content.title,
      url: content.url,
    });
    // react-native-web 的 Share.share 直接回傳 navigator.share() 的結果，
    // 成功時 resolve 的是 undefined——讀 result.action 會拋 TypeError，
    // 被下面的 catch 接走，於是「分享成功」被回報成失敗。
    if (!result || result.action !== Share.dismissedAction) return 'shared';
    // 原生端（iOS）取消是 resolve 出 dismissedAction，不是拋錯
    return 'dismissed';
  } catch (e) {
    // Web 端取消 navigator.share 是 reject 一個 AbortError；
    // 沒有 navigator.share 時 react-native-web 則 reject 一般的 Error
    //（'Share is not supported in this browser'）。兩者都走到這裡，
    // 靠 name 分開——分不開的話，桌面瀏覽器與「使用者改變主意」會得到
    // 同一種待遇。
    if (e instanceof Error && e.name === 'AbortError') return 'dismissed';
    console.warn('原生分享失敗');
    return 'unavailable';
  }
}

/** 分享到 LINE */
export function shareToLine(content: ShareContent): boolean {
  const encoded = encodeURIComponent(content.text);
  // 網頁版的分享網址。LINE 已安裝時它會被 universal link 接走直接開 App，
  // 沒安裝則落到 LINE 的網頁，兩種情況使用者都看得到東西發生。
  const webUrl = `https://line.me/R/msg/text/?${encoded}`;

  if (Platform.OS === 'web') {
    window.open(webUrl, '_blank');
    return true;
  }

  // 原生端優先用 LINE 的 URL scheme（直接跳進 App 的對話選擇畫面）。
  //
  // `canOpenURL` 為否時原本什麼都不做——沒裝 LINE 的人按下「LINE」，
  // 選單關掉、沒有 LINE、沒有訊息、沒有任何跡象，看起來就是按鈕壞了。
  // 改為退到網頁版網址：能不能完成分享交給 LINE 決定，但「按了有反應」
  // 這件事必須成立。
  const schemeUrl = `line://msg/text/${encoded}`;
  Linking.canOpenURL(schemeUrl)
    .then(can => Linking.openURL(can ? schemeUrl : webUrl))
    .catch(() => { void Linking.openURL(webUrl).catch(() => {}); });
  return true;
}

/** 分享到 Facebook */
export function shareToFacebook(content: ShareContent): boolean {
  if (Platform.OS === 'web') {
    const encodedText = encodeURIComponent(content.text);
    const encodedUrl = content.url ? encodeURIComponent(content.url) : '';
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    return true;
  }
  // 原生端降級為通用分享。結果不影響回傳值——這條路徑只在原生的
  // 分享選單已經失敗過之後才走得到，能做的就只剩再試一次。
  void shareNative(content);
  return true;
}

/**
 * 把內容送到使用者選的去處，回傳要說給使用者聽的訊息鍵（null＝不必說話）。
 *
 * 集中在服務層而不是各頁自己寫：揭曉頁與靈棋頁的分享降級路徑一字不差，
 * 分開寫遲早會有一邊漏掉 Facebook 那段的剪貼簿處理。
 *
 * 為什麼 Facebook 要先複製一份：`sharer.php` 只帶得走網址，籤詩內容
 * 到不了貼文裡。不複製的話，使用者選了 Facebook 只會得到一個光禿禿的
 * 連結，而他要分享的那首籤詩不見了。
 */
export async function shareToTarget(target: ShareTarget, content: ShareContent): Promise<string | null> {
  if (target === 'line') {
    shareToLine(content);
    return null;
  }

  if (target === 'facebook') {
    const copied = await copyToClipboard(content.text);
    shareToFacebook({ ...content, url: content.url ?? SHARE_URL });
    return copied ? 'share.fbCopied' : null;
  }

  return (await copyToClipboard(content.text)) ? 'reveal.copied' : 'reveal.copyManual';
}

/** 複製到剪貼簿 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 原生端用 expo-clipboard 真的複製。
    //
    // 原本這裡呼叫 Share.share——註解寫「Expo 沒有 clipboard API」，但
    // expo-clipboard 早就是相依套件（backup.ts 一直在用）。後果是：呼叫端
    // 把「複製」當成分享失敗後的降級路徑，使用者一關掉分享選單，同一個
    // 分享選單立刻又跳出來，而且從頭到尾沒有任何東西被複製。
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** 格式化占卜結果為分享文字 */
export function formatDivinationShareText(params: {
  poemTitle: string;
  poemLevel: string;
  hexagramName: string;
  lines: string[];
  vernacular: string;
  pieceChars: string[];
  /**
   * 牌陣名（已譯）。自由佈局與非棋盤模式不傳。
   *
   * 分享出去的內容原本只有籤詩與卦象，看不出這是哪個牌陣的結果——
   * 選了兩軍對壘陣或抉擇陣，分享給人看跟隨手擺三顆棋長得一模一樣。
   */
  spreadName?: string;
  reading?: {
    primaryName: string;
    changedName: string;
    movingLineName: string;
    relation: string;
    level: string;
  };
}): string {
  const parts = [
    `🏮【${t('home.title')}】${params.poemLevel} · ${params.poemTitle}`,
    t('share.hexagram', { name: params.hexagramName }),
    '',
    ...params.lines,
    '',
    `📜 ${params.vernacular.slice(0, 80)}...`,
    '',
    `🎲 ${t('share.drawn', { pieces: params.pieceChars.join(' ') })}`,
  ];

  if (params.spreadName) {
    parts.push(`♟ ${t('share.spread', { name: params.spreadName })}`);
  }

  if (params.reading) {
    parts.push(
      `☯ ${t('share.changed', {
        from: params.reading.primaryName,
        to: params.reading.changedName,
        line: params.reading.movingLineName,
      })}`,
      `　 ${t('share.bodyUse', {
        relation: params.reading.relation,
        level: params.reading.level,
      })}`,
    );
  }

  parts.push(
    '',
    '🔗 chess-divination-app.vercel.app',
    t('home.tagline'),
  );

  return parts.join('\n');
}

/**
 * 格式化靈棋結果為分享文字。
 *
 * 另立一支而不共用上面那支：靈棋沒有吉凶等級、沒有棋子、沒有六爻盤，
 * 硬塞進籤詩的版式會分享出「 · 明陽卦」這種前面缺一塊的標題，
 * 以及一行空的「抽得：」。它有的是卦目、象、象曰與詩曰。
 */
export function formatLingqiShareText(params: {
  notation: string;
  name: string;
  image: string;
  cast?: { upper: number; middle: number; lower: number };
  xiang: string[];
  shi: string[];
  question?: string;
}): string {
  const parts = [
    `🏮【${t('home.title')}】${params.name} · ${params.image}`,
    `　 ${params.notation}`,
  ];

  if (params.cast) {
    parts.push(`🎲 ${t('share.lingqiCast', { u: params.cast.upper, m: params.cast.middle, l: params.cast.lower })}`);
  }
  if (params.question) parts.push('', `❓ ${params.question}`);

  parts.push(
    '',
    ...params.xiang,
    '',
    ...params.shi,
    '',
    `📜 ${t('share.lingqiSource')}`,
    '',
    '🔗 chess-divination-app.vercel.app',
    t('home.tagline'),
  );

  return parts.join('\n');
}
