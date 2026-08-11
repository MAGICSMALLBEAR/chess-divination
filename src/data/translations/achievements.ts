// 成就名稱與說明翻譯（en / ja）

import type { Lang } from '@/services/i18n';

type AchievementLocale = {
  title: string;
  desc: string;
};

export const achievementTranslations: Record<string, Partial<Record<Lang, AchievementLocale>>> = {
  first_draw: {
    en: {
      title: 'First Glimpse of the Way',
      desc: 'Complete your first chess piece divination',
    },
    ja: {
      title: '初めて棋道を窺う',
      desc: '初めての抽棋占いを完了する',
    },
  },
  ten_draws: {
    en: {
      title: 'Chess Way Practitioner',
      desc: 'Accumulate 10 divinations',
    },
    ja: {
      title: '棋道修行者',
      desc: '占いを10回行う',
    },
  },
  fifty_draws: {
    en: {
      title: 'Divination Master',
      desc: 'Accumulate 50 divinations',
    },
    ja: {
      title: '占い大師',
      desc: '占いを50回行う',
    },
  },
  first_board: {
    en: {
      title: 'Board Novice',
      desc: 'Complete your first board layout divination',
    },
    ja: {
      title: '佈局初心者',
      desc: '初めての棋盤配置占いを完了する',
    },
  },
  first_favorite: {
    en: {
      title: 'Discerning Eye',
      desc: 'Save your first poem to favorites',
    },
    ja: {
      title: '慧眼で詩を識る',
      desc: '初めて詩をお気に入りに保存する',
    },
  },
  week_streak: {
    en: {
      title: 'Seven Days of Inquiry',
      desc: 'Use the app for 7 consecutive days',
    },
    ja: {
      title: '七日間の問道',
      desc: '7日連続でアプリを使用する',
    },
  },
  both_modes: {
    en: {
      title: 'Dual Path Completed',
      desc: 'Use both draw and board divination modes',
    },
    ja: {
      title: '双修円満',
      desc: '抽棋と棋盤の両方のモードを使用する',
    },
  },
  all_levels: {
    en: {
      title: 'Knower of Fate',
      desc: 'Draw poems of all 5 fortune levels',
    },
    ja: {
      title: '天命を知る者',
      desc: '5種類すべての吉凶レベルの詩を引く',
    },
  },
};
