// 主題管理系統
// ThemeContext + useAppTheme hook
// 支援 dark（墨色）、light（宣紙）和 system（跟隨系統）三種模式

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeColors } from '@/constants/theme';
import { getThemeColors } from '@/constants/theme';
import { getSettings, saveSettings } from '@/services/storage';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getThemeColors('dark'),
  mode: 'dark',
  setMode: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  // Load saved theme on mount
  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setModeState(settings.themeMode);
    })();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await saveSettings({ themeMode: newMode });
  }, []);

  const resolvedMode = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = getThemeColors(resolvedMode);
  const isDark = resolvedMode === 'dark';

  // Web：讓瀏覽器外框（行動版網址列、PWA 標題列）跟著主題走。
  // `+html.tsx` 的兩個 theme-color 標籤只認系統偏好，使用者在 App 內
  // 明確選了與系統相反的主題時，外框會與內容對不起來——淺色主題下
  // 上緣仍是一條黑帶。這裡覆寫成實際採用的底色。
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      // 帶 media 的那兩個標籤留著（系統偏好變動時仍有作用），
      // 另外維護一個不帶 media 的標籤；不帶 media 者優先級較高
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = theme.bgInk;
      document.documentElement.style.colorScheme = resolvedMode;
    } catch (e) {
      console.warn('同步瀏覽器主題色失敗:', e);
    }
  }, [theme.bgInk, resolvedMode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

// 簡化版 - 只返回 theme colors
export function useThemeColors(): ThemeColors {
  const { theme } = useContext(ThemeContext);
  return theme;
}
