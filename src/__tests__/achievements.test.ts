// achievements.ts 測試
// 成就解鎖條件與連續使用天數追蹤。AsyncStorage 以記憶體 Map 模擬。

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { getAchievements, checkAchievements, getStreak, recordUsage } from '../services/achievements';
import { saveSettings, getSettings } from '../services/storage';
import { todayString, yesterdayString } from '../services/date';

/** 無任何成就達成的基準統計 */
const EMPTY_STATS = {
  totalDraws: 0,
  totalBoard: 0,
  totalFav: 0,
  hasDraw: false,
  hasBoard: false,
  levels: [] as string[],
};

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('成就清單', () => {
  test('回傳全部 8 種成就', async () => {
    const list = await getAchievements();
    expect(list).toHaveLength(8);
  });

  test('初始狀態全部未解鎖', async () => {
    const list = await getAchievements();
    expect(list.every(a => !a.unlocked)).toBe(true);
  });

  test('每個成就都有 id／標題／說明', async () => {
    const list = await getAchievements();
    for (const a of list) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.desc).toBeTruthy();
    }
  });

  test('成就 id 不重複', async () => {
    const list = await getAchievements();
    const ids = list.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('已解鎖的成就會標記 unlocked', async () => {
    await saveSettings({ unlockedAchievements: ['first_draw', 'ten_draws'] });
    const list = await getAchievements();

    expect(list.find(a => a.id === 'first_draw')?.unlocked).toBe(true);
    expect(list.find(a => a.id === 'ten_draws')?.unlocked).toBe(true);
    expect(list.find(a => a.id === 'fifty_draws')?.unlocked).toBe(false);
  });
});

describe('成就解鎖條件', () => {
  test('第一次抽棋解鎖 first_draw', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, hasDraw: true });
    expect(unlocked).toContain('first_draw');
  });

  test('第一次佈局解鎖 first_board', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, hasBoard: true });
    expect(unlocked).toContain('first_board');
  });

  test('兩種模式皆用過解鎖 both_modes', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS, hasDraw: true, hasBoard: true,
    });
    expect(unlocked).toContain('both_modes');
  });

  test('只用過一種模式不解鎖 both_modes', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, hasDraw: true });
    expect(unlocked).not.toContain('both_modes');
  });

  test('累積 10 次解鎖 ten_draws（抽棋與佈局合計）', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS, totalDraws: 6, totalBoard: 4,
    });
    expect(unlocked).toContain('ten_draws');
  });

  test('累積 9 次尚未解鎖 ten_draws', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS, totalDraws: 5, totalBoard: 4,
    });
    expect(unlocked).not.toContain('ten_draws');
  });

  test('累積 50 次解鎖 fifty_draws，並同時帶出 ten_draws', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS, totalDraws: 50,
    });
    expect(unlocked).toContain('fifty_draws');
    expect(unlocked).toContain('ten_draws');
  });

  test('收藏一首解鎖 first_favorite', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, totalFav: 1 });
    expect(unlocked).toContain('first_favorite');
  });

  test('集滿 5 種吉凶等級解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: ['大吉', '中吉', '小吉', '平', '凶'],
    });
    expect(unlocked).toContain('all_levels');
  });

  test('等級重複不計入，4 種不解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: ['大吉', '大吉', '大吉', '中吉', '小吉', '平'],
    });
    expect(unlocked).not.toContain('all_levels');
  });

  test('解鎖後會持久化到設定', async () => {
    await checkAchievements({ ...EMPTY_STATS, hasDraw: true });
    const s = await getSettings();
    expect(s.unlockedAchievements).toContain('first_draw');
  });

  /** 迴歸：同一成就不應重複回報，否則會重複跳出解鎖提示 */
  test('已解鎖的成就不會再次回報', async () => {
    const first = await checkAchievements({ ...EMPTY_STATS, hasDraw: true });
    expect(first).toContain('first_draw');

    const second = await checkAchievements({ ...EMPTY_STATS, hasDraw: true });
    expect(second).not.toContain('first_draw');
    expect(second).toEqual([]);
  });

  test('無任何條件達成時回傳空陣列', async () => {
    expect(await checkAchievements(EMPTY_STATS)).toEqual([]);
  });
});

describe('連續使用天數', () => {
  test('首次使用回傳 1', async () => {
    expect(await recordUsage()).toBe(1);
  });

  test('同日重複使用不增加天數', async () => {
    const first = await recordUsage();
    const second = await recordUsage();
    expect(first).toBe(1);
    expect(second).toBe(1);
  });

  test('昨天有用過，今天使用會累加', async () => {
    await saveSettings({ usageDates: [yesterdayString()], currentStreak: 3 });
    expect(await recordUsage()).toBe(4);
  });

  test('中斷後重新計算為 1', async () => {
    // 只有很久以前的記錄，昨天沒用
    await saveSettings({ usageDates: ['2020-01-01'], currentStreak: 10 });
    expect(await recordUsage()).toBe(1);
  });

  test('使用日期會去重存入', async () => {
    await recordUsage();
    await recordUsage();
    const s = await getSettings();
    expect(s.usageDates).toEqual([todayString()]);
  });

  test('getStreak 在今日已記錄時回傳當前天數', async () => {
    await saveSettings({ usageDates: [todayString()], currentStreak: 5 });
    expect(await getStreak()).toBe(5);
  });

  test('getStreak 在昨日有記錄時回傳累加值', async () => {
    await saveSettings({ usageDates: [yesterdayString()], currentStreak: 2 });
    expect(await getStreak()).toBe(3);
  });

  test('getStreak 在完全無記錄時回傳 1', async () => {
    expect(await getStreak()).toBe(1);
  });

  test('連續 7 天自動解鎖 week_streak', async () => {
    await saveSettings({ usageDates: [yesterdayString()], currentStreak: 6 });
    const streak = await recordUsage();

    expect(streak).toBe(7);
    const s = await getSettings();
    expect(s.unlockedAchievements).toContain('week_streak');
  });

  test('未滿 7 天不解鎖 week_streak', async () => {
    await saveSettings({ usageDates: [yesterdayString()], currentStreak: 4 });
    await recordUsage();

    const s = await getSettings();
    expect(s.unlockedAchievements ?? []).not.toContain('week_streak');
  });

  test('week_streak 已解鎖後不會重複寫入', async () => {
    await saveSettings({
      usageDates: [yesterdayString()],
      currentStreak: 9,
      unlockedAchievements: ['week_streak'],
    });
    await recordUsage();

    const s = await getSettings();
    const count = (s.unlockedAchievements ?? []).filter(id => id === 'week_streak').length;
    expect(count).toBe(1);
  });
});
