// 成就與連續使用追蹤服務
import { getSettings, saveSettings } from './storage';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_draw', title: '初窺棋道', desc: '完成第一次抽棋占卜', icon: '🎲' },
  { id: 'ten_draws', title: '棋道修行者', desc: '累積 10 次占卜', icon: '🔮' },
  { id: 'fifty_draws', title: '占卜大師', desc: '累積 50 次占卜', icon: '👑' },
  { id: 'first_board', title: '佈局新手', desc: '完成第一次棋盤佈局', icon: '♟️' },
  { id: 'first_favorite', title: '慧眼識籤', desc: '收藏第一首籤詩', icon: '❤️' },
  { id: 'week_streak', title: '七日問道', desc: '連續使用 7 天', icon: '🔥' },
  { id: 'both_modes', title: '雙修圓滿', desc: '使用過抽棋和佈局兩種模式', icon: '☯️' },
  { id: 'all_levels', title: '知天命', desc: '抽過全部 5 種吉凶等級的籤詩', icon: '📜' },
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
}): Promise<string[]> {
  const s = await getSettings();
  const unlocked = s.unlockedAchievements || [];
  const newUnlocks: string[] = [];

  const tryUnlock = (id: string, condition: boolean) => {
    if (!unlocked.includes(id) && condition) {
      unlocked.push(id);
      newUnlocks.push(id);
    }
  };

  tryUnlock('first_draw', stats.hasDraw);
  tryUnlock('ten_draws', stats.totalDraws + stats.totalBoard >= 10);
  tryUnlock('fifty_draws', stats.totalDraws + stats.totalBoard >= 50);
  tryUnlock('first_board', stats.hasBoard);
  tryUnlock('first_favorite', stats.totalFav >= 1);
  tryUnlock('both_modes', stats.hasDraw && stats.hasBoard);
  tryUnlock('all_levels', new Set(stats.levels).size >= 5);

  if (newUnlocks.length > 0) {
    await saveSettings({ unlockedAchievements: unlocked });
  }

  return newUnlocks;
}

// 連續使用天數
export async function getStreak(): Promise<number> {
  const s = await getSettings();
  const dates = s.usageDates || [];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dates.includes(today)) {
    return s.currentStreak || 1;
  }

  // 計算連續天數
  let streak = dates.includes(yesterday) ? (s.currentStreak || 0) + 1 : 1;
  if (!dates.includes(yesterday) && !dates.includes(today)) streak = 1;

  return streak;
}

export async function recordUsage(): Promise<number> {
  const s = await getSettings();
  const today = new Date().toISOString().slice(0, 10);
  const dates = s.usageDates || [];

  if (dates.includes(today)) return s.currentStreak || 1;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = dates.includes(yesterday) ? (s.currentStreak || 0) + 1 : 1;

  await saveSettings({
    usageDates: [...new Set([...dates, today])],
    currentStreak: streak,
  });

  // 檢查七日連續成就
  if (streak >= 7) {
    const unlocked = s.unlockedAchievements || [];
    if (!unlocked.includes('week_streak')) {
      await saveSettings({ unlockedAchievements: [...unlocked, 'week_streak'] });
    }
  }

  return streak;
}
