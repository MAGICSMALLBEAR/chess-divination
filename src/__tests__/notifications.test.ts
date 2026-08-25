import fs from 'fs';
import path from 'path';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationHandler,
  screenFromNotificationData,
  subscribeToNotificationTaps,
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  isReminderScheduled,
} from '../services/notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const originalOS = Platform.OS;

function setPlatform(os: 'web' | 'ios' | 'android') {
  (Platform as { OS: string }).OS = os;
}

/** 讓權限與排程都成功，作為各測試的預設起點 */
function grantAndSucceed() {
  mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  mocked.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  mocked.scheduleNotificationAsync.mockResolvedValue('id' as never);
  mocked.cancelScheduledNotificationAsync.mockResolvedValue(undefined as never);
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([] as never);
  mocked.getLastNotificationResponseAsync.mockResolvedValue(null as never);
  mocked.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  setPlatform('ios');
  grantAndSucceed();
});

afterEach(() => {
  setPlatform(originalOS as 'ios');
});

describe('setupNotificationHandler', () => {
  test('註冊通知顯示處理器', () => {
    setupNotificationHandler();
    expect(mocked.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  test('web 端不註冊：該平台沒有本地通知，設了也沒有意義', () => {
    setPlatform('web');
    setupNotificationHandler();
    expect(mocked.setNotificationHandler).not.toHaveBeenCalled();
  });

  test('處理器會要求顯示橫幅與音效，但不加紅點', async () => {
    setupNotificationHandler();
    const arg = mocked.setNotificationHandler.mock.calls[0][0];
    const behavior = await arg!.handleNotification({} as never);
    expect(behavior).toMatchObject({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });
});

/**
 * 迴歸：setupNotificationHandler 先前只有測試引用過，沒有任何畫面呼叫。
 * expo-notifications 未設 handler 的預設行為就是**不顯示**——App 開著時
 * 每日提醒與占驗提醒直接被丟棄，使用者只覺得提醒時靈時不靈。
 */
describe('通知處理器與導頁的接線（靜態守門）', () => {
  const layoutSrc = fs.readFileSync(
    path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf-8');

  /**
   * 比對「行首就是呼叫」而非單純 toContain：被註解掉的
   * `// setupNotificationHandler();` 也含有那串字，用 toContain 的話
   * 有人把它註解掉這條測試照樣會綠——守門測試本身也要守得住。
   */
  test('root layout 會呼叫 setupNotificationHandler（非註解）', () => {
    expect(layoutSrc).toMatch(/^\s*setupNotificationHandler\(\);/m);
  });

  test('root layout 會訂閱通知點擊並導頁（非註解）', () => {
    expect(layoutSrc).toMatch(/^\s*return subscribeToNotificationTaps\(/m);
    expect(layoutSrc).toMatch(/router\.push\(screen\)/);
  });
});

describe('screenFromNotificationData', () => {
  test('取出白名單內的畫面', () => {
    expect(screenFromNotificationData({ screen: '/stats' })).toBe('/stats');
    expect(screenFromNotificationData({ screen: '/(tabs)' })).toBe('/(tabs)');
  });

  /**
   * 通知的 data 雖然是我們自己寫的，但它會經過作業系統來回一趟。
   * 拿它直接餵給 router 等於讓外部資料決定導頁目標。
   */
  test('白名單外的路徑一律回 null', () => {
    expect(screenFromNotificationData({ screen: '/settings' })).toBeNull();
    expect(screenFromNotificationData({ screen: 'https://example.com' })).toBeNull();
    expect(screenFromNotificationData({ screen: '../../etc' })).toBeNull();
  });

  test('缺少或型別不對的 data 回 null 而非拋錯', () => {
    expect(screenFromNotificationData(undefined)).toBeNull();
    expect(screenFromNotificationData(null)).toBeNull();
    expect(screenFromNotificationData('字串')).toBeNull();
    expect(screenFromNotificationData({})).toBeNull();
    expect(screenFromNotificationData({ screen: 42 })).toBeNull();
  });
});

describe('subscribeToNotificationTaps', () => {
  /** 造一個 expo-notifications 的點擊回應物件 */
  function response(screen: unknown) {
    return { notification: { request: { content: { data: { screen } } } } };
  }

  test('點擊通知時以通知指定的畫面呼叫導頁', () => {
    const onNavigate = jest.fn();
    subscribeToNotificationTaps(onNavigate);

    const handler = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];
    handler(response('/stats') as never);

    expect(onNavigate).toHaveBeenCalledWith('/stats');
  });

  test('通知未指定可辨識的畫面時不導頁', () => {
    const onNavigate = jest.fn();
    subscribeToNotificationTaps(onNavigate);

    const handler = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];
    handler(response('/惡意路徑') as never);
    handler({ notification: { request: { content: {} } } } as never);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  /**
   * 冷啟動：App 被系統殺掉後點通知啟動，事件在監聽器掛上之前就發生了。
   * 只靠 addNotificationResponseReceivedListener 會漏掉這一段。
   */
  test('App 由通知冷啟動時仍會導頁', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue(response('/stats') as never);
    const onNavigate = jest.fn();

    subscribeToNotificationTaps(onNavigate);
    await Promise.resolve();
    await Promise.resolve();

    expect(onNavigate).toHaveBeenCalledWith('/stats');
  });

  test('取消訂閱後，冷啟動的結果不再導頁', async () => {
    let resolveLast: (v: unknown) => void = () => {};
    mocked.getLastNotificationResponseAsync.mockReturnValue(
      new Promise(r => { resolveLast = r; }) as never,
    );
    const onNavigate = jest.fn();

    const unsubscribe = subscribeToNotificationTaps(onNavigate);
    unsubscribe();                     // 畫面已卸載
    resolveLast(response('/stats'));
    await Promise.resolve();
    await Promise.resolve();

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('取消訂閱會移除監聽器', () => {
    const remove = jest.fn();
    mocked.addNotificationResponseReceivedListener.mockReturnValue({ remove } as never);

    subscribeToNotificationTaps(jest.fn())();
    expect(remove).toHaveBeenCalled();
  });

  test('web 端不掛監聽器，回傳的取消函式仍可安全呼叫', () => {
    setPlatform('web');
    const unsubscribe = subscribeToNotificationTaps(jest.fn());

    expect(mocked.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('requestNotificationPermission', () => {
  test('已授權時直接回傳 true，不再打擾使用者', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('尚未授權時發出請求，使用者同意則回傳 true', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('使用者拒絕時回傳 false', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });

  /** 曾被拒絕過的使用者，仍應有再次被詢問的機會（系統會決定是否顯示） */
  test('先前為 denied 時仍會再次請求', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('scheduleDailyReminder', () => {
  test('成功排程時回傳 true', async () => {
    await expect(scheduleDailyReminder()).resolves.toBe(true);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  /** 不先取消舊排程，重複進設定頁會累積出多則每日通知 */
  test('排程前先取消既有排程', async () => {
    await scheduleDailyReminder();
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalled();

    const cancelOrder = mocked.cancelScheduledNotificationAsync.mock.invocationCallOrder[0];
    const scheduleOrder = mocked.scheduleNotificationAsync.mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(scheduleOrder);
  });

  test('排在每天上午 9:00，且使用固定識別碼', async () => {
    await scheduleDailyReminder();
    const arg = mocked.scheduleNotificationAsync.mock.calls[0][0];

    expect(arg.identifier).toBe('daily-divination-reminder');
    expect(arg.trigger).toMatchObject({ type: 'daily', hour: 9, minute: 0 });
  });

  test('通知內容有標題與內文，並帶上要開啟的頁面', async () => {
    await scheduleDailyReminder();
    const arg = mocked.scheduleNotificationAsync.mock.calls[0][0];

    expect(arg.content.title).toBeTruthy();
    expect(arg.content.body).toBeTruthy();
    expect(arg.content.data).toMatchObject({ screen: '/(tabs)' });
  });

  test('Web 平台不排程，直接回傳 false', async () => {
    setPlatform('web');

    await expect(scheduleDailyReminder()).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  /** 沒有權限卻仍呼叫排程，在部分平台會拋出例外 */
  test('未取得權限時不排程，回傳 false', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    await expect(scheduleDailyReminder()).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('排程拋錯時回傳 false 而非往上拋', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('no permission'));

    await expect(scheduleDailyReminder()).resolves.toBe(false);
  });

  test('連續呼叫兩次不會留下兩則排程（每次都先取消）', async () => {
    await scheduleDailyReminder();
    await scheduleDailyReminder();

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });
});

describe('cancelDailyReminder', () => {
  test('以固定識別碼取消排程', async () => {
    await cancelDailyReminder();
    expect(mocked.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith('daily-divination-reminder');
  });

  /** 取消一個不存在的排程屬正常情況，不該讓設定頁崩潰 */
  test('底層拋錯時安靜吞下，不往上拋', async () => {
    mocked.cancelScheduledNotificationAsync.mockRejectedValue(new Error('not found'));
    await expect(cancelDailyReminder()).resolves.toBeUndefined();
  });
});

describe('isReminderScheduled', () => {
  test('排程清單含目標識別碼時回傳 true', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
      [{ identifier: 'daily-divination-reminder' }] as never,
    );
    await expect(isReminderScheduled()).resolves.toBe(true);
  });

  test('清單為空時回傳 false', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([] as never);
    await expect(isReminderScheduled()).resolves.toBe(false);
  });

  test('清單只有其他排程時回傳 false', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
      [{ identifier: 'some-other-reminder' }] as never,
    );
    await expect(isReminderScheduled()).resolves.toBe(false);
  });

  test('查詢失敗時回傳 false 而非拋錯', async () => {
    mocked.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('unavailable'));
    await expect(isReminderScheduled()).resolves.toBe(false);
  });
});
