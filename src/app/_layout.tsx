// Root Stack 配置
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import 'react-native-reanimated';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/hooks/useAppTheme';
import { getSettings, getHistory } from '@/services/storage';
import { setLang } from '@/services/i18n';
import { setSoundEnabled } from '@/services/sound';
import { setHapticEnabled } from '@/services/haptics';
import {
  setupNotificationHandler, subscribeToNotificationTaps, type NotificationTarget,
} from '@/services/notifications';
import { recordLink } from '@/services/recordLink';

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
  const router = useRouter();

  /**
   * 打開通知指向的目的地。
   *
   * 記錄可能已經被刪掉（提醒排在 14 天後，這段期間使用者清過歷史也很正常），
   * 那時退回通知自己帶的白名單畫面——**點下去一定要有反應**，
   * 而不是靜靜地什麼都不發生。
   *
   * 路由不是通知決定的：通知只說了 id，`recordLink()` 依那筆記錄自己的
   * mode 決定用 `/reveal` 還是 `/lingqi` 開（靈棋的 poemId 恆為 0，
   * 交給 reveal 會被顯示成籤詩 #1）。
   */
  const openNotificationTarget = useCallback(async (target: NotificationTarget) => {
    if (target.recordId) {
      try {
        const record = (await getHistory()).find(r => r.id === target.recordId);
        if (record) { router.push(recordLink(record)); return; }
      } catch (e) {
        console.warn('讀取通知指向的記錄失敗:', e);
      }
    }
    router.push(target.screen);
  }, [router]);

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

  useEffect(() => {
    // 沒設 handler 的話 expo-notifications 預設**不顯示**前景通知——
    // App 開著時每日提醒與占驗提醒會被靜默丟棄。必須在通知可能抵達
    // 之前就設好，所以放在最外層而非某個畫面裡。
    setupNotificationHandler();

    // 點通知後導到它指定的目的地。少了這段，通知帶的 data 是死資料，
    // 點占驗提醒只會打開首頁，使用者還得自己找到統計頁。
    //
    // 占驗提醒講的是**某一筆**占卜（「『龍騰九霄』已過 14 天」），
    // 所以要帶他到那一筆本身——回填的介面就長在那一頁上。只導到 /stats
    // 等於把「現在就去回填那一筆」變成「自己去歷史裡找那一筆」。
    return subscribeToNotificationTaps(target => { void openNotificationTarget(target); });
  }, [router, openNotificationTarget]);

  return (
    <ThemeProvider>
      <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="draw" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="lingqi" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="board" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="reveal" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="library" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="glossary" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="learn" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="stats" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="achievements" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
