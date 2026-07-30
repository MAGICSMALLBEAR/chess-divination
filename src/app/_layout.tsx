// Root Stack 配置
import { useFonts } from 'expo-font';
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

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
      </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
