import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
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
        <meta name="theme-color" content="#0D0A08" />

        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
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
