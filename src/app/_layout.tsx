// Root Stack 配置
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/hooks/useAppTheme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// 原生端目前不強制依賴特定書法字體檔（完整中文書法字體過大，需子集化）
// Web 端已透過 +html.tsx 載入 Google Fonts 的 Noto Serif TC。
// 原生端使用系統 Serif 字體做後備，籤詩使用 fontFamily 'serif'。
// 若日後要為原生端打包書法字體，請先產生籤詩用字的 Noto Serif TC 子集。
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // 不再阻塞在無用的 SpaceMono 英文字體載入上
    SplashScreen.hideAsync();
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
