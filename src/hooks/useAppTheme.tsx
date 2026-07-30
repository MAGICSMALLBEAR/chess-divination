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
