// 牌陣規則原型
//
// 牌陣不改變既有的「棋子 → 卦象」演算法；它只為每一個落子賦予穩定的
// 提問角色與建議座標。這樣既保留自由佈局，也讓問題能有更清楚的閱讀結構。

export type SpreadId = 'free' | 'timeline' | 'choice' | 'relationship' | 'strategy';

export interface SpreadSlot {
  id: string;
  label: string;
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
    questionHint: '適合問事件的脈絡與近期走向。',
    slots: [
      { id: 'past', label: '過去', description: '形成目前局面的背景與慣性。', col: 4, row: 8 },
      { id: 'present', label: '當下', description: '此刻最需要看見的核心。', col: 4, row: 4 },
      { id: 'next', label: '下一步', description: '近期可採取的行動與趨勢。', col: 4, row: 0 },
    ],
  },
  choice: {
    id: 'choice',
    name: '兩難抉擇陣',
    description: '把兩個選項與自身條件並列，協助比較取捨。',
    questionHint: '請在問題中寫清楚選項 A 與 B。',
    slots: [
      { id: 'option-a', label: '選項 A', description: '選擇 A 的主要條件與趨勢。', col: 2, row: 3 },
      { id: 'self', label: '我方', description: '自己目前可動用的資源與限制。', col: 4, row: 5 },
      { id: 'option-b', label: '選項 B', description: '選擇 B 的主要條件與趨勢。', col: 6, row: 3 },
    ],
  },
  relationship: {
    id: 'relationship',
    name: '關係互動陣',
    description: '從我方、關係核心、對方三個角度觀察互動。',
    questionHint: '適合感情、合作或人際溝通問題。',
    slots: [
      { id: 'self', label: '我方', description: '自己的需求、立場與可調整之處。', col: 2, row: 5 },
      { id: 'bond', label: '關係核心', description: '雙方目前真正牽動的議題。', col: 4, row: 4 },
      { id: 'other', label: '對方', description: '對方的狀態、需求與可能回應。', col: 6, row: 5 },
    ],
  },
  strategy: {
    id: 'strategy',
    name: '行動策略陣',
    description: '辨識可用資源、主要阻礙與可執行的一著。',
    questionHint: '適合工作、計畫與決策推進。',
    slots: [
      { id: 'resource', label: '可用資源', description: '目前已擁有、值得善用的力量。', col: 2, row: 7 },
      { id: 'obstacle', label: '主要阻礙', description: '需要正視或繞開的關卡。', col: 4, row: 3 },
      { id: 'action', label: '建議行動', description: '最適合先落下的一著。', col: 6, row: 1 },
    ],
  },
};

export function getSpread(id: SpreadId): SpreadDefinition {
  return SPREADS[id];
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
