// 牌陣規則原型
//
// 牌陣不改變既有的「棋子 → 卦象」演算法；它只為每一個落子賦予穩定的
// 提問角色與建議座標。這樣既保留自由佈局，也讓問題能有更清楚的閱讀結構。

import { POSITION_DEEP_HEADING } from './position';

export type SpreadId = 'free' | 'timeline' | 'choice' | 'relationship' | 'strategy' | 'formation';

/** 牌陣名稱的 i18n 鍵，供棋盤、收藏與日後統計共用。 */
export const SPREAD_LABEL_KEYS: Record<SpreadId, string> = {
  free: 'board.spreadFree',
  timeline: 'board.spreadTimeline',
  choice: 'board.spreadChoice',
  relationship: 'board.spreadRelationship',
  strategy: 'board.spreadStrategy',
  formation: 'board.spreadFormation',
};

/** 牌陣說明文字的 i18n 鍵。與 LABEL／HINT 同放一處，避免同類對照表散落各頁。 */
export const SPREAD_DESC_KEYS: Record<SpreadId, string> = {
  free: 'board.spreadFreeDesc',
  timeline: 'board.spreadTimelineDesc',
  choice: 'board.spreadChoiceDesc',
  relationship: 'board.spreadRelationshipDesc',
  strategy: 'board.spreadStrategyDesc',
  formation: 'board.spreadFormationDesc',
};

/** 牌陣適用問題的 i18n 鍵，讓引導文字不和目前介面語言混用。 */
export const SPREAD_HINT_KEYS: Record<SpreadId, string> = {
  free: 'board.spreadFreeHint',
  timeline: 'board.spreadTimelineHint',
  choice: 'board.spreadChoiceHint',
  relationship: 'board.spreadRelationshipHint',
  strategy: 'board.spreadStrategyHint',
  formation: 'board.spreadFormationHint',
};

export interface SpreadSlot {
  id: string;
  /**
   * 中文角色名。會寫進 positionSummary 存入歷史記錄，與 position.ts、
   * interpretation.ts 等解讀服務一致——生成的命理文字本來就是中文限定。
   */
  label: string;
  /**
   * 介面顯示用的翻譯鍵。介面是三語的，把 label 直接插進已翻譯的句子
   * 會變成「Next: 過去」這種混語，故 UI 一律走這個鍵。
   */
  labelKey: string;
  description: string;
  col: number;
  row: number;
}

export interface SpreadDefinition {
  id: SpreadId;
  name: string;
  description: string;
  questionHint: string;
  slots: readonly SpreadSlot[];
  /**
   * 牌陣要求的落子數。固定角色牌陣由 slots 長度決定，此欄位留給
   * 無固定格位的牌陣（兩軍對壘陣六子）；未設定時沿用呼叫端的預設值。
   */
  maxPieces?: number;
}

export const SPREADS: Record<SpreadId, SpreadDefinition> = {
  free: {
    id: 'free',
    name: '自由佈局',
    description: '依直覺在棋盤任意落子，保留完整的方位解讀。',
    questionHint: '適合開放式問題與整體趨勢。',
    slots: [],
  },
  timeline: {
    id: 'timeline',
    name: '三才時間陣',
    description: '以過去、當下、下一步串連事情的演變。',
    questionHint: '適合問事件的背景與近期走向。',
    slots: [
      { id: 'past', label: '過去', labelKey: 'board.slotTimelinePast', description: '形成目前局面的背景與慣性。', col: 4, row: 8 },
      { id: 'present', label: '當下', labelKey: 'board.slotTimelinePresent', description: '此刻最需要看見的核心。', col: 4, row: 4 },
      { id: 'next', label: '下一步', labelKey: 'board.slotTimelineNext', description: '近期可採取的行動與趨勢。', col: 4, row: 0 },
    ],
  },
  choice: {
    id: 'choice',
    name: '兩難抉擇陣',
    description: '把兩個選項與自身條件並列，協助比較取捨。',
    questionHint: '請在問題中寫清楚選項 A 與 B。',
    slots: [
      { id: 'option-a', label: '選項 A', labelKey: 'board.slotChoiceOptionA', description: '選擇 A 的主要條件與趨勢。', col: 2, row: 3 },
      { id: 'self', label: '我方', labelKey: 'board.slotChoiceSelf', description: '自己目前可動用的資源與限制。', col: 4, row: 5 },
      { id: 'option-b', label: '選項 B', labelKey: 'board.slotChoiceOptionB', description: '選擇 B 的主要條件與趨勢。', col: 6, row: 3 },
    ],
  },
  relationship: {
    id: 'relationship',
    name: '關係互動陣',
    description: '從我方、關係核心、對方三個角度觀察互動。',
    questionHint: '適合感情、合作或人際溝通問題。',
    slots: [
      { id: 'self', label: '我方', labelKey: 'board.slotRelationshipSelf', description: '自己的需求、立場與可調整之處。', col: 2, row: 5 },
      { id: 'bond', label: '關係核心', labelKey: 'board.slotRelationshipBond', description: '雙方目前真正牽動的議題。', col: 4, row: 4 },
      { id: 'other', label: '對方', labelKey: 'board.slotRelationshipOther', description: '對方的狀態、需求與可能回應。', col: 6, row: 5 },
    ],
  },
  strategy: {
    id: 'strategy',
    name: '行動策略陣',
    description: '辨識可用資源、主要阻礙與可執行的一著。',
    questionHint: '適合工作、計畫與決策推進。',
    slots: [
      { id: 'resource', label: '可用資源', labelKey: 'board.slotStrategyResource', description: '目前已擁有、值得善用的力量。', col: 2, row: 7 },
      { id: 'obstacle', label: '主要阻礙', labelKey: 'board.slotStrategyObstacle', description: '需要正視或繞開的關卡。', col: 4, row: 3 },
      { id: 'action', label: '建議行動', labelKey: 'board.slotStrategyAction', description: '最適合先落下的一著。', col: 6, row: 1 },
    ],
  },
  /**
   * 兩軍對壘陣沒有固定格位——角色是「哪一半場」而不是「哪一格」，
   * 半場由楚河漢界劃開（formation.ts），故 slots 為空、落子數另設。
   */
  formation: {
    id: 'formation',
    name: '兩軍對壘陣',
    description: '紅黑雙方各在己方半場布三子，紅方為上卦、黑方為下卦，動爻取雙方子力差。',
    questionHint: '適合對立、競爭、比較兩造的處境。',
    slots: [],
    maxPieces: 6,
  },
};

export function getSpread(id: SpreadId): SpreadDefinition {
  return SPREADS[id];
}

/**
 * 牌陣要求的落子數；牌陣未設定時回傳呼叫端的預設值。
 * 固定角色牌陣由 slots 長度決定，此處只在無格位牌陣（兩軍對壘陣）派上用場。
 */
export function getSpreadMaxPieces(id: SpreadId, fallback: number): number {
  return SPREADS[id].maxPieces ?? fallback;
}

/** 固定牌陣依序取下一個可落子的角色；自由佈局則不限制格位。 */
export function nextSpreadSlot(id: SpreadId, placedCount: number): SpreadSlot | null {
  return SPREADS[id].slots[placedCount] ?? null;
}

/** 將落子順序轉成可儲存於既有 positionSummary 的閱讀前綴。 */
export function spreadReadingPrefix(id: SpreadId): string {
  const spread = SPREADS[id];
  if (spread.slots.length === 0) return '';
  return `${spread.name}：${spread.slots.map(slot => `${slot.label}（${slot.description}）`).join('；')}\n\n`;
}

/**
 * 將實際落子的順序綁回牌陣角色。
 * 固定牌陣在 UI 中已限制依序落子，故第 n 顆棋可安全對應第 n 個角色；
 * 函式仍容許部分落子，供未來的草稿預覽使用。
 */
export function spreadRoleReading(
  id: SpreadId,
  pieces: readonly { pieceName: string; meaning: string }[],
): string {
  const slots = SPREADS[id].slots;
  if (slots.length === 0 || pieces.length === 0) return '';

  return pieces.slice(0, slots.length).map((piece, index) => {
    const slot = slots[index];
    return `${slot.label}・${piece.pieceName}：${slot.description}\n${piece.meaning}`;
  }).join('\n\n') + '\n\n';
}

/**
 * 從已存檔的 positionSummary 取出「牌陣自己的那一段」——牌陣名與角色說明、
 * 使用者填的選項名稱、兩軍子力對比，也就是深度解讀標題之前的一切。
 *
 * 用途是 AI 深度解讀的提示詞。為什麼不把 positionSummary 整段送過去：
 * 標題之後那半是本 App 自己的規則式文字（每顆棋的五行、方位、建議各一段），
 * 餵給模型只會換回一份改寫版，還會把提示詞撐長。標題之前那半才是模型
 * 推不出來的東西——使用者選了哪個牌陣、哪顆棋擔任哪個角色、兩軍強弱如何。
 *
 * 自由佈局沒有這一段，回傳空字串，呼叫端據此不送 `board.brief`。
 */
export function spreadBriefFromSummary(summary?: string): string {
  if (!summary) return '';
  const cut = summary.indexOf(POSITION_DEEP_HEADING);
  return (cut === -1 ? summary : summary.slice(0, cut)).trim();
}

/** 將使用者替兩難選項取的名稱寫進結果摘要；空白輸入一律略過。 */
export function spreadContextReading(
  id: SpreadId,
  context: { optionA?: string; optionB?: string },
): string {
  if (id !== 'choice') return '';
  const entries = [
    ['選項 A', context.optionA],
    ['選項 B', context.optionB],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
  if (entries.length === 0) return '';
  return `本次比較：${entries.map(([label, value]) => `${label}＝${value.trim()}`).join('；')}\n\n`;
}
