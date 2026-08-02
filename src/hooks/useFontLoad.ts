// 原生端書法字體載入 Hook
// Web 端透過 Google Fonts 的 CSS @import 載入 Noto Serif TC，
// 原生端透過 expo-font 載入系統字體後備（楷體優先）。
//
// 完整中文書法字體需子集化（籤詩用字僅約 800 個不重複漢字），
// 目前原生端依賴系統後備，日後可載入子集化字型檔。

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export function useFontLoad(): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: Google Fonts CSS 在 +html.tsx 中載入，直接標記完成
      // 等待 100ms 確保 CSS 已套用
      const t = setTimeout(() => setLoaded(true), 100);
      return () => clearTimeout(t);
    }

    // 原生端：不阻塞渲染，使用系統後備字體
    // 日後可載入子集化字型：
    // import * as Font from 'expo-font';
    // await Font.loadAsync({
    //   'NotoSerifTC': require('@/assets/fonts/NotoSerifTC-subset.ttf'),
    // });
    setLoaded(true);
  }, []);

  return { loaded };
}
