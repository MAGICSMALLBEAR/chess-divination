// 問事用神候選
//
// 用神必須隨提問者身分、所問對象與問題細節調整。本模組只處理語意明確、
// 不需猜測身分的類別，並回傳「候選」而非自動下定論。

import type { SixRelative } from './najja';

export interface UseGodCandidate {
  relatives: readonly SixRelative[];
  description: string;
}

const CANDIDATES: Readonly<Record<string, UseGodCandidate>> = {
  wealth: {
    relatives: ['妻財'],
    description: '財運問事以「妻財」為候選用神，可觀其在本卦的位置與時間條件。',
  },
  career: {
    relatives: ['官鬼'],
    description: '事業問事以「官鬼」為候選用神，可觀職責、職位與外在規範的條件。',
  },
  study: {
    relatives: ['父母'],
    description: '學業／證照問事以「父母」為候選用神，可觀資料、師長與文書條件。',
  },
};

/** 不足以安全自動取用神的類別回傳 null，交由使用者依實際問法判讀。 */
export function useGodForCategory(category?: string): UseGodCandidate | null {
  return category ? CANDIDATES[category] ?? null : null;
}
