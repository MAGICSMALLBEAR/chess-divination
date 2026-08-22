// Root Stack 配置
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/hooks/useAppTheme';
import { getSettings } from '@/services/storage';
import { setLang } from '@/services/i18n';
import { setSoundEnabled } from '@/services/sound';
import { setHapticEnabled } from '@/services/haptics';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Web 端透過 +html.tsx 載入 Google Fonts 的 Noto Serif TC；
// 原生端由 useFontLoad 載入 assets/fonts 的子集化 Noto Serif TC
// （scripts/subset-font.py 產生），載入完成前用系統字體後備。
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // 不再阻塞在無用的 SpaceMono 英文字體載入上
    SplashScreen.hideAsync();
    // 語言／音效／觸覺都是模組記憶體狀態——不在此回讀，
    // 使用者存過的設定在重開後會靜默回到預設值
    getSettings()
      .then(s => {
        if (s.lang) setLang(s.lang);
        setSoundEnabled(s.soundEnabled);
        setHapticEnabled(s.hapticEnabled);
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="draw" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="board" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="reveal" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="library" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="stats" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="achievements" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
