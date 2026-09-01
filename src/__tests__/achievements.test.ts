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

import {
  ACHIEVEMENTS,
  getAchievements, checkAchievements, getStreak, recordUsage, syncAchievements,
} from '../services/achievements';
import {
  saveSettings, getSettings, addHistory, toggleFavorite, setOutcome,
  type DivinationRecord,
} from '../services/storage';
import { todayString, yesterdayString } from '../services/date';
import { POEM_LEVELS } from '../data/poems';

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

/** 建一筆歷史記錄。只填成就統計會用到的欄位 */
function makeRecord(over: Partial<DivinationRecord> = {}): Omit<DivinationRecord, 'id'> {
  return {
    poemId: 1,
    poemTitle: '乾為天',
    poemContent: '天行健',
    poemLevel: '大吉',
    drawnPieceTypes: ['king'],
    drawnPieceColors: ['red'],
    drawnPieceChars: ['帥'],
    mode: 'draw',
    timestamp: Date.now(),
    isFavorited: false,
    engineVersion: 3,
    ...over,
  };
}

describe('成就清單', () => {
  test('回傳清單上的每一項成就', async () => {
    const list = await getAchievements();
    // 比對 id 而不是數量：數量寫死只會在加成就時要人改數字，
    // 比對 id 才連「重複 id」與「順序被打亂」一起守住。
    expect(list.map(a => a.id)).toEqual(ACHIEVEMENTS.map(a => a.id));
    expect(new Set(list.map(a => a.id)).size).toBe(list.length);
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

  test('集滿全部 5 個真實等級解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: [...POEM_LEVELS],
    });
    expect(unlocked).toContain('all_levels');
  });

  test('等級重複不計入，4 種不解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: ['大吉', '大吉', '大吉', '上吉', '中吉', '中平'],
    });
    expect(unlocked).not.toContain('all_levels');
  });

  /**
   * 迴歸：條件原本是 `new Set(levels).size >= 5`——只要湊滿五個相異字串
   * 就解鎖，不管是不是真的那五個等級。
   *
   * 這幾個舊測試自己就示範了問題：它們拿「小吉／平／凶」這種不存在於
   * POEM_LEVELS 的值當作集滿，等於把缺陷寫成了規格。實際會踩到的情境是
   * 舊備份、資料損毀，或日後新增第六個等級——使用者沒抽齊卻拿到「知天命」。
   */
  test('四個真等級加一個無法辨識的值不解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: ['大吉', '上吉', '中吉', '中平', '不存在的等級'],
    });
    expect(unlocked).not.toContain('all_levels');
  });

  test('五個都無法辨識的值不解鎖 all_levels', async () => {
    const unlocked = await checkAchievements({
      ...EMPTY_STATS,
      levels: ['小吉', '平', '凶', '大凶', '未知'],
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

describe('占驗成就', () => {
  test('回填一次即解鎖「占而後驗」', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, totalVerified: 1 });
    expect(unlocked).toContain('first_verify');
    expect(unlocked).not.toContain('ten_verify');
  });

  test('回填十次同時解鎖兩項', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, totalVerified: 10 });
    expect(unlocked).toEqual(expect.arrayContaining(['first_verify', 'ten_verify']));
  });

  /** 舊呼叫端沒有這個欄位，不該因此意外解鎖 */
  test('未提供 totalVerified 時視為 0，不解鎖占驗成就', async () => {
    const unlocked = await checkAchievements(EMPTY_STATS);
    expect(unlocked).not.toContain('first_verify');
    expect(unlocked).not.toContain('ten_verify');
  });
});

/**
 * syncAchievements 是為了修掉一個實際存在的缺陷：
 * checkAchievements 先前沒有任何畫面在呼叫，除了「七日問道」之外
 * 所有成就對使用者永遠是鎖住的。以下測的是「有歷史記錄就真的會解鎖」。
 */
describe('syncAchievements 由歷史推算', () => {
  test('有抽棋記錄即解鎖初窺棋道', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));
    const unlocked = await syncAchievements();
    expect(unlocked).toContain('first_draw');
  });

  test('有棋盤記錄即解鎖佈局新手；兩種都有則加解雙修圓滿', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));
    await addHistory(makeRecord({ mode: 'board' }));

    const unlocked = await syncAchievements();
    expect(unlocked).toEqual(expect.arrayContaining([
      'first_draw', 'first_board', 'both_modes',
    ]));
  });

  test('累積 10 筆解鎖棋道修行者', async () => {
    for (let i = 0; i < 10; i++) await addHistory(makeRecord());
    expect(await syncAchievements()).toContain('ten_draws');
  });

  test('五種等級都抽過解鎖知天命', async () => {
    for (const level of ['大吉', '上吉', '中吉', '中平', '下下']) {
      await addHistory(makeRecord({ poemLevel: level }));
    }
    expect(await syncAchievements()).toContain('all_levels');
  });

  test('收藏一筆解鎖慧眼識籤', async () => {
    const r = await addHistory(makeRecord());
    await toggleFavorite(r);
    expect(await syncAchievements()).toContain('first_favorite');
  });

  test('回填占驗後解鎖占而後驗', async () => {
    const r = await addHistory(makeRecord());
    await setOutcome(r.id, 'accurate');
    expect(await syncAchievements()).toContain('first_verify');
  });

  test('沒有任何記錄時不解鎖任何成就', async () => {
    expect(await syncAchievements()).toEqual([]);
  });

  test('重複呼叫不重複回報已解鎖的成就', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));

    const first = await syncAchievements();
    expect(first).toContain('first_draw');

    const second = await syncAchievements();
    expect(second).not.toContain('first_draw');
  });

  test('解鎖結果實際寫入設定，getAchievements 讀得到', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));
    await syncAchievements();

    const list = await getAchievements();
    expect(list.find(a => a.id === 'first_draw')?.unlocked).toBe(true);
    expect(list.find(a => a.id === 'first_board')?.unlocked).toBe(false);
  });
});

/**
 * 靈棋自 Session 43 起就是完整占卜模式，成就系統卻只認 draw 與 board：
 * 只擲靈棋的使用者一個成就都解不開，連「累積 10 次占卜」的計數都不會動。
 * 以下釘住這件事不再退回去。
 */
describe('靈棋計入成就', () => {
  test('只擲靈棋也解得開累積類成就', async () => {
    for (let i = 0; i < 10; i++) {
      await addHistory(makeRecord({ mode: 'lingqi', poemId: 0, poemLevel: '' }));
    }

    const unlocked = await syncAchievements();
    expect(unlocked).toContain('first_lingqi');
    expect(unlocked).toContain('ten_draws');
    // 抽棋與棋盤都沒用過，這兩項不該被順手解開
    expect(unlocked).not.toContain('first_draw');
    expect(unlocked).not.toContain('first_board');
  });

  test('三種模式混著算，湊得滿 10 次就算數', async () => {
    for (let i = 0; i < 4; i++) await addHistory(makeRecord({ mode: 'draw' }));
    for (let i = 0; i < 3; i++) await addHistory(makeRecord({ mode: 'board' }));
    for (let i = 0; i < 3; i++) await addHistory(makeRecord({ mode: 'lingqi', poemLevel: '' }));

    expect(await syncAchievements()).toContain('ten_draws');
  });

  test('三種模式都用過才解 all_modes', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));
    await addHistory(makeRecord({ mode: 'board' }));
    expect(await syncAchievements()).not.toContain('all_modes');

    await addHistory(makeRecord({ mode: 'lingqi', poemLevel: '' }));
    expect(await syncAchievements()).toContain('all_modes');
  });

  test('both_modes 維持原意：抽棋＋棋盤，靈棋補不上第三種以外的空缺', async () => {
    await addHistory(makeRecord({ mode: 'draw' }));
    await addHistory(makeRecord({ mode: 'lingqi', poemLevel: '' }));

    const unlocked = await syncAchievements();
    expect(unlocked).not.toContain('both_modes');
    expect(unlocked).not.toContain('all_modes');
  });

  /**
   * 靈棋的 poemLevel 是空字串（《靈棋經》原典未載吉凶等級）。
   * 空字串若被當成一種等級，「五種等級都抽過」就會被四個真等級加它湊滿。
   */
  test('靈棋的空等級湊不出知天命', async () => {
    for (const level of ['大吉', '上吉', '中吉', '中平']) {
      await addHistory(makeRecord({ poemLevel: level }));
    }
    await addHistory(makeRecord({ mode: 'lingqi', poemLevel: '' }));

    expect(await syncAchievements()).not.toContain('all_levels');
  });

  test('舊呼叫端不傳靈棋欄位時行為不變', async () => {
    const unlocked = await checkAchievements({ ...EMPTY_STATS, totalDraws: 10 });
    expect(unlocked).toContain('ten_draws');
    expect(unlocked).not.toContain('first_lingqi');
    expect(unlocked).not.toContain('all_modes');
  });
});
