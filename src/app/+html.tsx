import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    // lang 只能是建置時的預設值——靜態 HTML 不知道這位使用者選了什麼。
    // 實際語言由下方的 langScript 在啟動時補正，之後切換語言時由
    // services/i18n 的 setLang 同步（見該檔的 syncDocumentLang）。
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <ScrollViewStyleReset />

        {/* Google Font: Noto Serif TC 書法風格字體 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700;900&display=swap" rel="stylesheet" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* 瀏覽器外框色跟隨系統偏好；使用者若在 App 內明確選了主題，
            由 useAppTheme 於執行期覆寫這兩個標籤（原本固定深色，
            淺色主題下瀏覽器上緣仍是一條黑帶） */}
        <meta name="theme-color" content="#FFFDF7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0D0A08" media="(prefers-color-scheme: dark)" />

        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
body {
  background-color: #0D0A08;
  font-family: 'Noto Serif TC', 'STSong', 'SimSun', 'KaiTi', serif;
}
.poem-text {
  font-family: 'Noto Serif TC', 'KaiTi', 'STKaiti', serif;
  letter-spacing: 0.1em;
}
@media (prefers-color-scheme: light) {
  body { background-color: #FFFDF7; }
}
`;

/**
 * 把 <html lang> 補正成使用者實際選的語言。
 *
 * 為什麼要在 head 裡跑而不是等 App 掛載：讀屏軟體與瀏覽器的斷字／字型
 * 選擇是依 lang 決定的，等 React 起來再改，第一段內容已經用中文的規則
 * 念過或排過了。這段直接讀設定所在的 localStorage 鍵，不經 React。
 *
 * 任何一步失敗都靜靜維持預設的 zh-TW——為了 lang 屬性讓整頁白掉，
 * 比 lang 不準嚴重得多。
 */
const langScript = `
try {
  var raw = localStorage.getItem('@chess_divination_settings');
  var lang = raw && JSON.parse(raw).lang;
  if (lang === 'en' || lang === 'ja' || lang === 'zh-TW') {
    document.documentElement.lang = lang;
  }
} catch (e) {}
`;

const swScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg.scope);
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}
`;
