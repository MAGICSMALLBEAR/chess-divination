// 成就與連續使用追蹤服務
import { getSettings, updateSettings, getHistory, getFavorites } from './storage';
import type { AppSettings } from './storage';
import { todayString, yesterdayString } from './date';
import { POEM_LEVELS } from '@/data/poems';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

/**
 * 解鎖門檻。
 *
 * 抽成常數的理由與 S58 的 `VERIFY_REMINDER_DAYS` 完全相同：這四個數字
 * 各自被寫了三遍——中文說明在下面那份清單、en 與 ja 在
 * `data/translations/achievements.ts`——而**門檻本身只是條件式裡的
 * 字面量**，沒有任何一份是真相來源。改門檻卻漏改說明，畫面會安靜地
 * 說錯話：使用者照著「累積 10 次」去做，第 10 次卻沒有解開。
 *
 * 只收錄「說明裡真的寫了數字」的那幾個。`all_levels` 不在此列——
 * 它的 5 來自 `POEM_LEVELS.length`，那本來就是真相來源了。
 */
export const ACHIEVEMENT_THRESHOLDS = {
  ten_draws: 10,
  fifty_draws: 50,
  week_streak: 7,
  ten_verify: 10,
} as const;

/**
 * 成就清單。匯出是為了讓翻譯守門測試直接數這份清單，
 * 而不是自己抄一份 id 陣列——抄的那份不會跟著新成就長大，
 * 於是新成就漏翻譯時測試照樣全綠（first_verify／ten_verify 就漏在
 * 那份手抄清單之外，靠人工補才沒出事）。
 */
export const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_draw', title: '初窺棋道', desc: '完成第一次抽棋占卜', icon: '🎲' },
  { id: 'ten_draws', title: '棋道修行者', desc: '累積 10 次占卜', icon: '🔮' },
  { id: 'fifty_draws', title: '占卜大師', desc: '累積 50 次占卜', icon: '👑' },
  { id: 'first_board', title: '佈局新手', desc: '完成第一次棋盤佈局', icon: '♟️' },
  { id: 'first_lingqi', title: '靈棋初擲', desc: '完成第一次靈棋占卜', icon: '🎋' },
  { id: 'first_favorite', title: '慧眼識籤', desc: '收藏第一首籤詩', icon: '❤️' },
  { id: 'week_streak', title: '七日問道', desc: '連續使用 7 天', icon: '🔥' },
  { id: 'both_modes', title: '雙修圓滿', desc: '使用過抽棋和佈局兩種模式', icon: '☯️' },
  { id: 'all_modes', title: '三法俱通', desc: '抽棋、棋盤、靈棋三種模式都用過', icon: '🏮' },
  { id: 'all_levels', title: '知天命', desc: '抽過全部 5 種吉凶等級的籤詩', icon: '📜' },
  { id: 'first_verify', title: '占而後驗', desc: '回填第一次占卜的實際結果', icon: '🔍' },
  { id: 'ten_verify', title: '占驗有簿', desc: '累積回填 10 次占驗', icon: '📖' },
];

export async function getAchievements(): Promise<Achievement[]> {
  const s = await getSettings();
  const unlocked = s.unlockedAchievements || [];
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: unlocked.includes(a.id) }));
}

export async function checkAchievements(stats: {
  totalDraws: number;
  totalBoard: number;
  totalFav: number;
  hasDraw: boolean;
  hasBoard: boolean;
  levels: string[];
  /** 已回填占驗的則數。舊呼叫端未傳時視為 0，兩項占驗成就自然不解鎖 */
  totalVerified?: number;
  /**
   * 靈棋則數與有無。與 totalVerified 同樣是選填——舊呼叫端不傳就是 0／false，
   * 行為與加入靈棋之前一致，不會因為欄位變多而讓既有測試或備份資料出錯。
   */
  totalLingqi?: number;
  hasLingqi?: boolean;
}): Promise<string[]> {
  // 先算出「這次符合條件的成就有哪些」，實際的解鎖寫入放到 updateSettings
  // 的 updater 裡再依當下的清單決定。在這裡讀 unlockedAchievements 再寫回，
  // 會把併發的 recordUsage 剛解鎖的七日成就一起蓋掉。
  const earned: string[] = [];
  const tryUnlock = (id: string, condition: boolean) => {
    if (condition) earned.push(id);
  };

  // 「累積 N 次占卜」數的是占卜，不是某一種占卜——靈棋自 Session 43 起
  // 就是完整占卜模式（有歷史、收藏、分享、統計、深度解讀），卻沒被算進來，
  // 於是只擲靈棋的人一個成就都解不開，連累積數都不會動。
  const totalReadings = stats.totalDraws + stats.totalBoard + (stats.totalLingqi ?? 0);

  tryUnlock('first_draw', stats.hasDraw);
  tryUnlock('ten_draws', totalReadings >= ACHIEVEMENT_THRESHOLDS.ten_draws);
  tryUnlock('fifty_draws', totalReadings >= ACHIEVEMENT_THRESHOLDS.fifty_draws);
  tryUnlock('first_board', stats.hasBoard);
  tryUnlock('first_lingqi', stats.hasLingqi === true);
  tryUnlock('first_favorite', stats.totalFav >= 1);
  // both_modes 維持原意（抽棋＋棋盤）不動：已經解鎖的人不該因為多了
  // 第三種模式而看到自己的成就說明變了；三種都用過另給 all_modes。
  tryUnlock('both_modes', stats.hasDraw && stats.hasBoard);
  tryUnlock('all_modes', stats.hasDraw && stats.hasBoard && stats.hasLingqi === true);
  // 明確比對那五個等級，而不是數 Set 的大小——`size >= 5` 只要湊滿五個
  // 相異字串就成立，4 個真等級加 1 個無法辨識的值（舊備份、資料損毀、
  // 日後新增的等級）就會解鎖「五種等級都抽過」，但使用者其實沒抽齊。
  tryUnlock('all_levels', POEM_LEVELS.every(level => stats.levels.includes(level)));
  tryUnlock('first_verify', (stats.totalVerified ?? 0) >= 1);
  tryUnlock('ten_verify', (stats.totalVerified ?? 0) >= ACHIEVEMENT_THRESHOLDS.ten_verify);

  let newUnlocks: string[] = [];
  await updateSettings(current => {
    const unlocked = current.unlockedAchievements || [];
    newUnlocks = earned.filter(id => !unlocked.includes(id));
    // 沒有新解鎖時回傳空的 patch：仍會走一次寫入，但內容不變，
    // 換來的是「判斷與寫入基於同一份值」這個保證
    return newUnlocks.length > 0
      ? { unlockedAchievements: [...unlocked, ...newUnlocks] }
      : {};
  });

  return newUnlocks;
}

/**
 * 由目前的歷史與收藏推算統計並檢查全部成就。
 *
 * 為什麼要有這個函式：`checkAchievements` 需要一份彙整好的統計，
 * 但先前沒有任何畫面在呼叫它——實際跑的只有 `recordUsage` 裡的連續天數，
 * 因此除了「七日問道」之外的成就對所有使用者永遠是鎖住的。
 * 這裡把「讀資料→算統計→檢查」包成一步，讓呼叫端不必自己拼統計而漏算。
 */
export async function syncAchievements(): Promise<string[]> {
  const [history, favorites] = await Promise.all([getHistory(), getFavorites()]);

  return checkAchievements({
    totalDraws: history.filter(r => r.mode === 'draw').length,
    totalBoard: history.filter(r => r.mode === 'board').length,
    totalLingqi: history.filter(r => r.mode === 'lingqi').length,
    totalFav: favorites.length,
    hasDraw: history.some(r => r.mode === 'draw'),
    hasBoard: history.some(r => r.mode === 'board'),
    hasLingqi: history.some(r => r.mode === 'lingqi'),
    // 靈棋記錄的 poemLevel 是空字串（《靈棋經》原典未載吉凶等級），
    // 這裡不必特別濾掉——all_levels 比對的是那五個等級的字面值，
    // 空字串湊不進去（見下方 tryUnlock('all_levels') 的註解）。
    levels: history.map(r => r.poemLevel),
    totalVerified: history.filter(r => r.outcome !== undefined).length,
  });
}

// 連續使用天數
export async function getStreak(): Promise<number> {
  const s = await getSettings();
  const dates = s.usageDates || [];
  const today = todayString();
  const yesterday = yesterdayString();

  if (dates.includes(today)) {
    return s.currentStreak || 1;
  }

  // 計算連續天數
  let streak = dates.includes(yesterday) ? (s.currentStreak || 0) + 1 : 1;
  if (!dates.includes(yesterday) && !dates.includes(today)) streak = 1;

  return streak;
}

export async function recordUsage(): Promise<number> {
  const today = todayString();
  const yesterday = yesterdayString();
  let streak = 1;

  // 整段判斷與寫入都在 updater 內，對其他設定寫入是不可分割的。
  // 原本是「外面讀 → 寫 → 再依外面那份舊值寫第二次」，第二次那筆
  // 會把兩次寫入之間別人解鎖的成就抹掉。
  await updateSettings(current => {
    const dates = current.usageDates || [];
    if (dates.includes(today)) {
      streak = current.currentStreak || 1;
      return {};
    }

    streak = dates.includes(yesterday) ? (current.currentStreak || 0) + 1 : 1;
    const patch: Partial<AppSettings> = {
      usageDates: [...new Set([...dates, today])],
      currentStreak: streak,
    };

    // 七日連續成就與上面的天數更新是同一件事，放同一次寫入才不會分岔
    const unlocked = current.unlockedAchievements || [];
    if (streak >= ACHIEVEMENT_THRESHOLDS.week_streak && !unlocked.includes('week_streak')) {
      patch.unlockedAchievements = [...unlocked, 'week_streak'];
    }
    return patch;
  });

  return streak;
}
