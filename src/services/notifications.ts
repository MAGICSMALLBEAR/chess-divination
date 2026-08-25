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

/**
 * 設定通知處理器（App 在前景時要不要顯示通知）。
 *
 * 非設定不可：expo-notifications 未設 handler 時的預設行為就是**不顯示**。
 * 這個函式先前只有測試引用過，沒有任何畫面呼叫——App 開著的時候，
 * 每日提醒與 14 天占驗提醒會直接被丟棄，使用者只會覺得提醒時靈時不靈
 * （關掉 App 才收得到）。
 *
 * 必須在通知可能抵達之前就設好，所以由 _layout 在最外層呼叫，
 * 而不是等到哪個畫面剛好 import 到這個模組。
 */
export function setupNotificationHandler(): void {
  if (Platform.OS === 'web') return;   // web 無本地通知，設了也沒有意義
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

/**
 * 通知可導向的畫面白名單。
 *
 * 通知的 data 是我們自己寫的，但它會經過作業系統來回一趟；
 * 拿它直接餵給 router 等於讓外部資料決定導頁目標。白名單讓
 * 「這支通知能帶你去哪」是這個檔案說了算。
 */
const ROUTABLE_SCREENS = ['/(tabs)', '/stats'] as const;
export type NotificationScreen = (typeof ROUTABLE_SCREENS)[number];

/** 從通知的 data 取出可導向的畫面；無法辨識時回 null */
export function screenFromNotificationData(data: unknown): NotificationScreen | null {
  if (!data || typeof data !== 'object') return null;
  const screen = (data as { screen?: unknown }).screen;
  return ROUTABLE_SCREENS.includes(screen as NotificationScreen)
    ? (screen as NotificationScreen)
    : null;
}

/**
 * 訂閱「使用者點了通知」，把 data.screen 交給呼叫端導頁。
 *
 * 先前完全沒有這個監聽器，通知裡的 `data: { screen: '/stats' }` 是死資料
 * ——點了占驗提醒只會打開 App 的首頁，使用者還得自己找到統計頁，
 * 而提醒的用意正是「現在就去回填那一筆」。
 *
 * 另外要處理冷啟動：App 被系統殺掉後點通知啟動，事件在監聽器掛上之前
 * 就發生了，只靠 addNotificationResponseReceivedListener 會漏掉。
 * getLastNotificationResponseAsync 補的正是這一段。
 *
 * @returns 取消訂閱的函式
 */
export function subscribeToNotificationTaps(
  onNavigate: (screen: NotificationScreen) => void,
): () => void {
  if (Platform.OS === 'web') return () => {};

  let cancelled = false;

  // 冷啟動：App 是被這則通知叫起來的
  Notifications.getLastNotificationResponseAsync()
    .then(response => {
      if (cancelled || !response) return;
      const screen = screenFromNotificationData(response.notification.request.content.data);
      if (screen) onNavigate(screen);
    })
    .catch(e => console.warn('讀取啟動通知失敗:', e));

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const screen = screenFromNotificationData(response.notification.request.content.data);
    if (screen) onNavigate(screen);
  });

  return () => {
    cancelled = true;
    subscription.remove();
  };
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
