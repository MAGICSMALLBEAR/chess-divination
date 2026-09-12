// 每日提醒通知服務
// 使用 expo-notifications 排程本地通知，提醒使用者每日占卜。
// 注意：完整的推送通知（遠端推播）需 EAS Build + FCM/APNs 憑證，
// 本服務使用本地排程通知，無需伺服器端設定。

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from './i18n';
import { recordTitle } from './poemList';
import { VERIFY_REMINDER_DAYS } from './verification';
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

/** 記錄 id 的長度上限。我們自己產的 id 遠短於此，這個上限只為擋掉異常長的輸入 */
const MAX_RECORD_ID = 64;

/**
 * 從通知的 data 取出「它在講哪一筆記錄」；沒有指名時回 null。
 *
 * 為什麼只取 id 而不取路徑：占驗提醒要帶使用者去的是那一筆占卜本身，
 * 而那筆該用哪個畫面開（`/reveal` 或 `/lingqi`）取決於它的 mode——
 * 那是 `recordLink()` 依**我們自己存的記錄**決定的。通知只說「哪一筆」，
 * 路由仍然完全由程式決定，上面那份白名單的用意因此沒有被繞過。
 */
export function recordIdFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { recordId?: unknown }).recordId;
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_RECORD_ID ? trimmed : null;
}

/**
 * 使用者點了通知之後該去哪。
 *
 * `screen` 是保底目的地（白名單內），`recordId` 是「有指名的話是哪一筆」。
 * 兩者同時帶出去而不是二選一：記錄可能已經被刪掉了，那時仍然要有地方可去。
 */
export interface NotificationTarget {
  screen: NotificationScreen;
  recordId: string | null;
}

/** 組出點擊通知後的目的地；連保底畫面都認不得時回 null（不導頁） */
export function targetFromNotificationData(data: unknown): NotificationTarget | null {
  const screen = screenFromNotificationData(data);
  if (!screen) return null;
  return { screen, recordId: recordIdFromNotificationData(data) };
}

/**
 * 訂閱「使用者點了通知」，把目的地交給呼叫端導頁。
 *
 * 先前完全沒有這個監聽器，通知裡的 `data: { screen: '/stats' }` 是死資料
 * ——點了占驗提醒只會打開 App 的首頁，使用者還得自己找到統計頁，
 * 而提醒的用意正是「現在就去回填那一筆」。
 *
 * 補上監聽器之後，那句話仍然只做到一半：`recordId` 一直都寫在通知的 data
 * 裡，卻在這裡被丟掉，於是點下去只到得了一個通用的統計頁，**要回填哪一筆
 * 還是得自己找**——而那正是提醒存在的理由。現在連 id 一起交出去，
 * 由呼叫端查出那筆記錄、用 `recordLink()` 決定它該用哪個畫面開。
 *
 * 另外要處理冷啟動：App 被系統殺掉後點通知啟動，事件在監聽器掛上之前
 * 就發生了，只靠 addNotificationResponseReceivedListener 會漏掉。
 * getLastNotificationResponseAsync 補的正是這一段。
 *
 * @returns 取消訂閱的函式
 */
export function subscribeToNotificationTaps(
  onNavigate: (target: NotificationTarget) => void,
): () => void {
  if (Platform.OS === 'web') return () => {};

  let cancelled = false;

  // 冷啟動：App 是被這則通知叫起來的
  Notifications.getLastNotificationResponseAsync()
    .then(response => {
      if (cancelled || !response) return;
      const target = targetFromNotificationData(response.notification.request.content.data);
      if (target) onNavigate(target);
    })
    .catch(e => console.warn('讀取啟動通知失敗:', e));

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const target = targetFromNotificationData(response.notification.request.content.data);
    if (target) onNavigate(target);
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

/**
 * 在占卜滿 `VERIFY_REMINDER_DAYS` 天時提醒一次。
 *
 * 天數取自 `verification.ts` 的常數而非再寫一次 14：那支常數本來就自稱是
 * 「建議回填的等待天數」的真相來源，卻只有統計那一側在用，真正決定何時
 * 發提醒的這裡是自己寫死的——兩邊哪天分岔，畫面上不會有任何跡象。
 *
 * 標題走 recordTitle() 而非 record.poemTitle：記錄存的是起卦當下的中文
 * 原題，en/ja 介面下直接印它，通知裡是中文、點進去的畫面卻是譯文——
 * 首頁與收藏早就改走 recordTitle 了（見 poemList.ts），只有這裡漏掉。
 * 靈棋記錄也靠它才不會被當成籤詩 #1（其 poemId 恆為 0）。
 */
export async function scheduleVerificationReminder(record: DivinationRecord): Promise<boolean> {
  if (Platform.OS === 'web' || record.outcome || !(await hasNotificationPermission())) return false;
  const trigger = new Date(record.timestamp + VERIFY_REMINDER_DAYS * 86_400_000);
  if (trigger.getTime() <= Date.now()) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: verificationReminderId(record.id),
      content: { title: t('notify.verifyTitle'), body: t('notify.verifyBody', { title: recordTitle(record) }), data: { screen: '/stats', recordId: record.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    return true;
  } catch (e) { console.warn('占驗提醒排程失敗:', e); return false; }
}

export async function cancelVerificationReminder(recordId: string): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(verificationReminderId(recordId)); }
  catch { console.warn('取消占驗提醒排程失敗'); }
}

/**
 * 清掉所有占驗提醒。
 *
 * 「清除所有歷史」沒有一份 id 清單可以逐筆取消（記錄已經不在了），
 * 而且在這之前刪掉的記錄本來就留下了孤兒排程——那些提醒 14 天後
 * 照樣會響，指向一筆已經不存在的占卜。所以這裡改掃排程本身，
 * 凡是我們的前綴一律取消，順手把過去累積的孤兒也清乾淨。
 */
export async function cancelAllVerificationReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(n => n.identifier?.startsWith(VERIFICATION_REMINDER_PREFIX))
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch { console.warn('清除占驗提醒排程失敗'); }
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
