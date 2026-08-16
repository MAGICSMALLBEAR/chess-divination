// 社群分享服務
// 支援 LINE、Facebook 等社群平台的一鍵分享，
// 以及 Web Share API / 複製到剪貼簿等通用方案。

import { Platform, Linking, Share } from 'react-native';
import { t } from './i18n';

export interface ShareContent {
  title: string;
  text: string;
  url?: string;
}

/** 嘗試使用 Web Share API（行動裝置原生分享選單） */
export async function shareNative(content: ShareContent): Promise<boolean> {
  try {
    const result = await Share.share({
      message: content.text,
      title: content.title,
      url: content.url,
    });
    if (result.action !== Share.dismissedAction) {
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

/** 複製到剪貼簿 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // React Native 端使用 Share（RN 沒有直接的 clipboard API 在 Expo 中）
    // 降級為分享選單
    await Share.share({ message: text });
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
