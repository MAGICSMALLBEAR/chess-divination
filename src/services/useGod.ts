// 問事用神候選
//
// 用神必須隨提問者身分、所問對象與問題細節調整。本模組只在**取法明確**時
// 回傳候選，並回傳「候選」而非自動下定論。
//
// 兩種取法：
//   1. 六親為用 —— 所問之事本身有對應的六親（財、官、文書）。
//   2. 世爻為用 —— 所問是「自身如何」（身命、疾病、出行），
//      傳統以世爻代表問卜者本人，不需再猜是哪一個六親。
//
// 感情是唯一需要外部資訊的類別：男占以妻財、女占以官鬼，取法相反。
// 未設定性別時寧可不出斷語——猜錯就等於把用神取反，比不斷更糟。

import type { SixRelative } from './najja';

/** 用神取法：指定六親，或以世爻（問卜者本人）為用神 */
export type UseGodSubject = SixRelative | '世爻';

export type DivinerGender = 'male' | 'female';

export interface UseGodCandidate {
  subject: UseGodSubject;
  /** 盤面上要標「用」的六親；世爻為用時無六親可標，故為空陣列 */
  relatives: readonly SixRelative[];
  description: string;
  /** 助事之神：發動或持世時對所問有利 */
  favorable?: SixRelative;
  /** 壞事之神：發動或持世時對所問不利 */
  taboo?: SixRelative;
}

const CANDIDATES: Readonly<Record<string, UseGodCandidate>> = {
  wealth: {
    subject: '妻財',
    relatives: ['妻財'],
    description: '財運問事以「妻財」為候選用神，可觀其在本卦的位置與時間條件。忌兄弟劫財，喜子孫生財。',
    favorable: '子孫',
    taboo: '兄弟',
  },
  career: {
    subject: '官鬼',
    relatives: ['官鬼'],
    description: '事業問事以「官鬼」為候選用神，可觀職責、職位與外在規範的條件。喜父母為文書印信，忌子孫剋官。',
    favorable: '父母',
    taboo: '子孫',
  },
  study: {
    subject: '父母',
    relatives: ['父母'],
    description: '學業／證照問事以「父母」為候選用神，可觀資料、師長與文書條件。喜官鬼生文書，忌妻財剋父母。',
    favorable: '官鬼',
    taboo: '妻財',
  },
  health: {
    subject: '世爻',
    relatives: [],
    description: '疾病問事以「世爻」為用神（自占，世爻即問卜者本人）；官鬼為病症之象，子孫為醫藥解神。',
    favorable: '子孫',
    taboo: '官鬼',
  },
  travel: {
    subject: '世爻',
    relatives: [],
    description: '出行問事以「世爻」為用神（自占，世爻即行者本人）；父母為舟車行程，兄弟為阻隔劫耗之神。',
    favorable: '父母',
    taboo: '兄弟',
  },
};

/** 感情取法隨占者性別相反：男占妻財、女占官鬼。 */
const MARRIAGE_BY_GENDER: Readonly<Record<DivinerGender, UseGodCandidate>> = {
  male: {
    subject: '妻財',
    relatives: ['妻財'],
    description: '感情問事，男占以「妻財」為用神（所求之對象）；忌兄弟爭競劫奪，喜子孫生財。',
    favorable: '子孫',
    taboo: '兄弟',
  },
  female: {
    subject: '官鬼',
    relatives: ['官鬼'],
    description: '感情問事，女占以「官鬼」為用神（所求之對象）；忌子孫剋官，喜妻財生官。',
    favorable: '妻財',
    taboo: '子孫',
  },
};

export interface UseGodOptions {
  /** 占者性別。感情問事的用神取法與性別相反，未給則不出斷語。 */
  gender?: DivinerGender;
}

/** 不足以安全自動取用神的類別回傳 null，交由使用者依實際問法判讀。 */
export function useGodForCategory(
  category?: string,
  options: UseGodOptions = {},
): UseGodCandidate | null {
  if (!category) return null;
  if (category === 'marriage') {
    // 性別未設定時取法無從決定；取反的用神比沒有用神更誤導
    return options.gender ? MARRIAGE_BY_GENDER[options.gender] : null;
  }
  return CANDIDATES[category] ?? null;
}
