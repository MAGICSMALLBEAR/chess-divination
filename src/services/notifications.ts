// 每日提醒通知服務
// 使用 expo-notifications 排程本地通知，提醒使用者每日占卜。
// 注意：完整的推送通知（遠端推播）需 EAS Build + FCM/APNs 憑證，
// 本服務使用本地排程通知，無需伺服器端設定。

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from './i18n';
import type { DivinationRecord } from './storage';

const REMINDER_ID = 'daily-divination-reminder';
const VERIFICATION_REMINDER_PREFIX = 'verification-reminder-';

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

/** 不主動彈權限框；占卜完成時只在使用者已同意通知時排程。 */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export function verificationReminderId(recordId: string): string {
  return `${VERIFICATION_REMINDER_PREFIX}${recordId}`;
}

/** 在占卜滿 14 天時提醒一次。 */
export async function scheduleVerificationReminder(record: DivinationRecord): Promise<boolean> {
  if (Platform.OS === 'web' || record.outcome || !(await hasNotificationPermission())) return false;
  const trigger = new Date(record.timestamp + 14 * 86_400_000);
  if (trigger.getTime() <= Date.now()) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: verificationReminderId(record.id),
      content: { title: t('notify.verifyTitle'), body: t('notify.verifyBody', { title: record.poemTitle }), data: { screen: '/stats', recordId: record.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    return true;
  } catch (e) { console.warn('占驗提醒排程失敗:', e); return false; }
}

export async function cancelVerificationReminder(recordId: string): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(verificationReminderId(recordId)); }
  catch { console.warn('取消占驗提醒排程失敗'); }
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
        // 排程當下就把文字寫死進通知，故切換語言後需重新排程才會改變。
        // 設定頁的每日提醒開關關掉再開即可。
        title: t('notify.title'),
        body: t('notify.body'),
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
