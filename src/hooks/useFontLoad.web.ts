// Web 版 useFontLoad：Google Fonts 的 Noto Serif TC 由 +html.tsx 的
// CSS @import 載入，這裡只需等一小段時間讓 CSS 套用。
// 拆成獨立檔是為了不讓原生端子集字型（1.2MB）被 Metro 包進 web 匯出。

import { useEffect, useState } from 'react';

export function useFontLoad(): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return { loaded };
}
