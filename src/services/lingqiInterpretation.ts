// 靈棋深度解讀服務
//
// 與 interpretation.ts 同一誠實邊界：**規則式**，不呼叫任何語言模型。
// 靈棋原典的象曰與詩曰本身就是解讀，這裡只補原典沒有的兩件事：
//   1. 三才結構導讀——上才（天時）、中才（人和）、下才（地利）各幾子朝上、
//      哪一才最盛。這是擲卦本身的結構訊號，卦辭裡沒有明說；
//   2. 依所問類別的閱讀之鏡——同一首象曰，問感情與問事業該對照的方向不同。
//
// 刻意不做：不為卦目生成吉凶等級（原典未載，見 lingqiOracles.ts 檔頭），
// 也不代替象曰下結論——斷語只說「哪一才盛、從哪一面看」，
// 不編造卦辭沒有的話。

import type { LingqiOracle } from '@/data/lingqiOracles';
import { localizeProse } from './localize';

export interface LingqiInterpretation {
  interpretation: string;
  actionPlan: string[];
}

type CastRank = 'upper' | 'middle' | 'lower';

/** 三才數量 → 階層：0 為伏、1–2 為中平、3–4 為盛 */
function tierOf(count: number): 'full' | 'mid' | 'empty' {
  if (count === 0) return 'empty';
  return count >= 3 ? 'full' : 'mid';
}

/**
 * 各才各階層的結構導讀句。做成函式是因為 zh 版 localizeProse 不做插值
 * （直接回傳 fallback，見 localize.ts）——與 liuyao.ts／wenwang.ts 同一慣例，
 * 中文原文直接把數字 bake 進去；en／ja 譯文才用 {n} 佔位。
 */
const RANK_TIER_TEXT: Record<CastRank, Record<'full' | 'mid' | 'empty', (n: number) => string>> = {
  upper: {
    full: n => `上才（天時）${n} 子朝上，天時正旺——外在大環境與時機是這件事最大的變數。`,
    mid: n => `上才（天時）${n} 子朝上，天時中平——環境與時機不助也不阻，成敗多在自己。`,
    empty: () => '上才（天時）全伏——時機未到，宜先準備，不與大勢硬碰。',
  },
  middle: {
    full: n => `中才（人和）${n} 子朝上，人和正旺——身邊的人與自己的作為是這件事的關鍵。`,
    mid: n => `中才（人和）${n} 子朝上，人和中平——助力與阻力參半，關鍵在自身的行動。`,
    empty: () => '中才（人和）全伏——外力難靠，孤軍之勢，先把能自己做的做穩。',
  },
  lower: {
    full: n => `下才（地利）${n} 子朝上，地利正旺——根基與資源站得住，可放手進行。`,
    mid: n => `下才（地利）${n} 子朝上，地利中平——條件尚可，先盤點手邊的資源再行動。`,
    empty: () => '下才（地利）全伏——根基未穩，先補實條件，不宜此刻加碼。',
  },
};

/** 獨盛的一才 → 主軸句 */
const LEAD_TEXT: Record<CastRank, string> = {
  upper: '此卦以天時為主軸——先看外在環境與時機，再談個人的努力。',
  middle: '此卦以人和為主軸——先看自己與身邊的人，再談環境的順逆。',
  lower: '此卦以地利為主軸——先看根基與資源，再談時機與人緣。',
};

/** 兩才並盛 → 主軸句 */
const LEAD_TIE_TEXT: Record<string, string> = {
  upperMiddle: '此卦天時與人和並盛——外在環境與自身作為同樣吃重，兩頭都要顧。',
  upperLower: '此卦天時與地利並盛——時機與根基都已到位，成事在於行動。',
  middleLower: '此卦人和與地利並盛——人與條件俱足，所缺的是把他們用起來。',
};

const LEAD_BALANCED_TEXT =
  '三才之數相當，無一才獨盛——此事內外條件交織，宜整體觀之，不宜單看一面。';

/** 依所問類別的閱讀之鏡 */
const CATEGORY_LENS: Record<string, string> = {
  marriage: '問感情：把象曰的意象對照你們當下的相處——哪一句像他，哪一句像你。',
  career: '問事業：把象曰的意象對照你目前的位置與下一步——是守成之象還是進取之象。',
  wealth: '問財運：把象曰的意象對照錢財的來路與去路——進得來、留得住，缺的是哪一環。',
  health: '問健康：把象曰的意象對照身心的徵兆與作息——留意文中提示的失衡之處。',
  study: '問學業：把象曰的意象對照學習的階段與方法——卡住的是根基還是方法。',
  travel: '問出行：把象曰的意象對照行程的順逆——文中若有險阻之象，行前多作準備。',
  general: '所問之事未分門類：把象曰的意象直接對照事情的現況即可。',
};

/** 行動計畫第一條與第三條（第二條依主軸而異） */
const ACTION_MIRROR = '以象為鏡：把象曰的意象對照事情的現況，不要逐字硬套。';
const ACTION_VERSE = '以詩曰收束：詩曰常指出事態的走向，把它當作檢驗的參照而非宿命。';

/** 第二條：依主軸給的行動重點 */
const FOCUS_ACTION: Record<CastRank, string> = {
  upper: '天時最盛：先確認外在的時機與條件，再決定出手的節奏。',
  middle: '人和最盛：先安頓身邊的人與自己的狀態，關係順了事才順。',
  lower: '地利最盛：先盤點資源與根基，把條件補實再行動。',
};
const FOCUS_ACTION_TIE = '並盛之才並重：先從與現況最相關的那一才著手，另一才隨後跟上。';
const FOCUS_ACTION_BALANCED = '三才均衡：先從最貼近日常的一環開始，小步驗證。';

/** 由卦目鍵值還原三才數量。鍵值是「上-中-下」的朝上子數（見 lingqi.ts）。 */
function parseCast(key: string): { upper: number; middle: number; lower: number } {
  const [upper, middle, lower] = key.split('-').map(Number);
  return { upper, middle, lower };
}

/** 主軸落在哪一才。回傳 null 代表三才全等（均衡）。 */
function leadRank(upper: number, middle: number, lower: number): { rank: CastRank | null; tie: string | null } {
  const counts = [
    { rank: 'upper' as CastRank, count: upper },
    { rank: 'middle' as CastRank, count: middle },
    { rank: 'lower' as CastRank, count: lower },
  ];
  // 同數時依上、中、下之序——天在人上、人在地上的傳統位次
  const max = Math.max(upper, middle, lower);
  const leaders = counts.filter(c => c.count === max);

  if (leaders.length === 3) return { rank: null, tie: null };
  if (leaders.length === 1) return { rank: leaders[0].rank, tie: null };

  // sort 後按字母序拼接（lower < middle < upper），對照表依此建鍵
  const pair = leaders.map(c => c.rank).sort().join('');
  const tieKey: Record<string, string> = {
    lowermiddle: 'middleLower', lowerupper: 'upperLower', middleupper: 'upperMiddle',
  };
  return { rank: null, tie: tieKey[pair] };
}

/**
 * 組成靈棋的規則式深度解讀。
 *
 * 歷史記錄只存 lingqiKey，三才數量直接由鍵值還原，不重擲不重算；
 * lingqi.test.ts 守著「鍵值與三才數量彼此對得起來」。
 */
export function buildLingqiInterpretation(input: {
  oracle: LingqiOracle;
  questionCategory?: string;
}): LingqiInterpretation {
  const { oracle, questionCategory } = input;
  const cast = parseCast(oracle.key);

  const structure = (['upper', 'middle', 'lower'] as CastRank[]).map((rank) => {
    const count = cast[rank];
    const tier = tierOf(count);
    return localizeProse(`lingqi.rank.${rank}.${tier}`, RANK_TIER_TEXT[rank][tier](count), { n: count });
  }).join('');

  const lead = leadRank(cast.upper, cast.middle, cast.lower);
  const leadSentence = lead.tie
    ? localizeProse(`lingqi.lead.tie.${lead.tie}`, LEAD_TIE_TEXT[lead.tie])
    : lead.rank
      ? localizeProse(`lingqi.lead.${lead.rank}`, LEAD_TEXT[lead.rank])
      : localizeProse('lingqi.lead.balanced', LEAD_BALANCED_TEXT);

  const lensKey = CATEGORY_LENS[questionCategory ?? 'general'] ? (questionCategory ?? 'general') : 'general';
  const lens = localizeProse(`lingqi.lens.${lensKey}`, CATEGORY_LENS[lensKey]);

  const focus = lead.tie
    ? localizeProse('lingqi.action.focus.tie', FOCUS_ACTION_TIE)
    : lead.rank
      ? localizeProse(`lingqi.action.focus.${lead.rank}`, FOCUS_ACTION[lead.rank])
      : localizeProse('lingqi.action.focus.balanced', FOCUS_ACTION_BALANCED);

  return {
    interpretation: [structure, leadSentence, lens].join('\n\n'),
    actionPlan: [
      localizeProse('lingqi.action.mirror', ACTION_MIRROR),
      focus,
      localizeProse('lingqi.action.verse', ACTION_VERSE),
    ],
  };
}
