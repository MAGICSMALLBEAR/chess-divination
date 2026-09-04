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

/** 嘗試使用 Web Share API（行動裝置原生分享選單） */
export async function shareNative(content: ShareContent): Promise<boolean> {
  try {
    const result = await Share.share({
      message: content.text,
      title: content.title,
      url: content.url,
    });
    // react-native-web 的 Share.share 直接回傳 navigator.share() 的結果，
    // 成功時 resolve 的是 undefined——讀 result.action 會拋 TypeError，
    // 被下面的 catch 接走，於是「分享成功」被回報成失敗，呼叫端接著跳出
    // 多餘的「分享到 LINE？」或偷偷覆寫剪貼簿。使用者取消時 navigator.share
    // 是 reject（AbortError），仍會走 catch 回 false，語意正確。
    if (!result || result.action !== Share.dismissedAction) {
      return true;
    }
  } catch { console.warn('原生分享失敗'); }
  return false;
}

/** 分享到 LINE */
export function shareToLine(content: ShareContent): boolean {
  if (Platform.OS === 'web') {
    const encoded = encodeURIComponent(content.text);
    const url = `https://line.me/R/msg/text/?${encoded}`;
    window.open(url, '_blank');
    return true;
  }
  // 原生端使用 LINE URL scheme
  const encoded = encodeURIComponent(content.text);
  const url = `line://msg/text/${encoded}`;
  Linking.canOpenURL(url).then(can => {
    if (can) Linking.openURL(url);
  }).catch(() => {});
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
  // 原生端降級為通用分享
  shareNative(content);
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
