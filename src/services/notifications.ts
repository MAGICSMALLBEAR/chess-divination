// 每日提醒通知服務
// 使用 expo-notifications 排程本地通知，提醒使用者每日占卜。
// 注意：完整的推送通知（遠端推播）需 EAS Build + FCM/APNs 憑證，
// 本服務使用本地排程通知，無需伺服器端設定。

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'daily-divination-reminder';

/** 設定通知處理器（顯示方式） */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** 請求通知權限 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** 排程每日占卜提醒（每天上午 9:00） */
export async function scheduleDailyReminder(): Promise<boolean> {
  // 先取消舊的排程
  await cancelDailyReminder();

  if (Platform.OS === 'web') {
    // Web 不支援本地通知排程，回傳 false
    console.log('每日提醒：Web 平台不支援排程通知');
    return false;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('每日提醒：使用者未授予通知權限');
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: '🏮 今日占卜',
        body: '靜心片刻，讓象棋的智慧引領您今天的方向。',
        data: { screen: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
    return true;
  } catch (e) {
    console.warn('每日提醒排程失敗:', e);
    return false;
  }
}

/** 取消每日提醒 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch { console.warn('取消每日提醒排程失敗'); }
}

/** 檢查每日提醒是否已排程 */
export async function isReminderScheduled(): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(n => n.identifier === REMINDER_ID);
  } catch {
    return false;
  }
}
