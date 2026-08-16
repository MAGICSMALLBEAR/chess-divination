// 文王卦斷語 — 用神取定、旺衰權衡與綜合斷語
//
// 這一層做的事，是把 najja.ts 裝好的盤面收斂成「所問之事如何」。
// 前面幾層各自只答一部分：liuyao 判體用、najja 排六親世應，
// 但使用者問的是「這筆錢拿不拿得到」，那要看的是**用神**的處境。
//
// 誠實邊界（延續 Session 10 對 AI 字樣的處理）：
// 本模組是**規則式加權**，不是斷語的權威。每一項條件的加減分都寫在
// SCORE 常數裡可供檢查，`reasons` 會逐條列出實際採計了哪些條件——
// 使用者看得到結論是怎麼算出來的，而不是一句沒有來歷的判詞。
//
// 未納入的傳統條件（刻意不做，不是遺漏）：
// 三合局、六沖卦變六合卦、進神退神、反吟伏吟、暗動。
// 這些需要更多前提（如確切占時、問事人身分），在本 App 的輸入條件下
// 判進去只會製造看似精確的雜訊。

import type { NaJiaLine, NaJiaReading, SixRelative, HiddenSpirit } from './najja';
import { strengthState, type StrengthState } from './liuyao';
import { monthBranchContext, seasonOf, SEASON_ELEMENT } from './date';

const GENERATES: Readonly<Record<string, string>> = {
  金: '水', 水: '木', 木: '火', 火: '土', 土: '金',
};
const OVERCOMES: Readonly<Record<string, string>> = {
  金: '木', 木: '土', 土: '水', 水: '火', 火: '金',
};

/** 地支六合：子丑、寅亥、卯戌、辰酉、巳申、午未 */
const BRANCH_HARMONY: Readonly<Record<string, string>> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

const BRANCH_OPPOSITES: Readonly<Record<string, string>> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

const BRANCH_ELEMENT: Readonly<Record<string, string>> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};

export type DayRelation =
  | '日建生用神' | '日建剋用神' | '用神剋日建' | '日建比和'
  | '日辰沖用神' | '日辰合用神';

export type Verdict = '大吉' | '吉' | '平' | '小凶' | '凶';

export interface UseGodAnalysis {
  relative: SixRelative;
  /** 用神在卦中的爻；不上卦時為空陣列 */
  lines: NaJiaLine[];
  /** 用神不上卦時所伏之處 */
  hidden: HiddenSpirit | null;
  /** 實際據以論斷的五行（上卦取卦中爻，不上卦取伏神） */
  element: string | null;
  monthState: StrengthState | null;
  dayRelation: DayRelation | null;
  /** 逐條列出採計的條件與加減分，讓結論可被檢查 */
  reasons: { label: string; score: number }[];
  score: number;
  verdict: Verdict;
}

/**
 * 各條件的加減分。集中在此供檢查與調整——
 * 散在判斷式裡的魔術數字沒有人有辦法驗證權重是否合理。
 */
const SCORE = {
  月建: { 旺: 2, 相: 1, 休: 0, 囚: -1, 死: -2 } as Record<StrengthState, number>,
  日建生用神: 2,
  日建比和: 1,
  日辰合用神: 1,
  用神剋日建: 0,
  日建剋用神: -2,
  日辰沖用神: -2,
  空亡: -2,
  月破: -2,
  伏而不出: -2,
  伏而可出: -1,
  動爻生用神: 1,
  動爻剋用神: -1,
  回頭生: 2,
  回頭剋: -2,
} as const;

function dayRelationOf(useElement: string, useBranch: string, dayBranch: string): DayRelation {
  // 沖與合先判：它們是地支之間的關係，優先於五行生剋
  if (BRANCH_OPPOSITES[useBranch] === dayBranch) return '日辰沖用神';
  if (BRANCH_HARMONY[useBranch] === dayBranch) return '日辰合用神';

  const dayElement = BRANCH_ELEMENT[dayBranch];
  if (dayElement === useElement) return '日建比和';
  if (GENERATES[dayElement] === useElement) return '日建生用神';
  if (OVERCOMES[dayElement] === useElement) return '日建剋用神';
  return '用神剋日建';
}

function verdictFromScore(score: number): Verdict {
  if (score >= 4) return '大吉';
  if (score >= 2) return '吉';
  if (score >= -1) return '平';
  if (score >= -3) return '小凶';
  return '凶';
}

export interface JudgeParams {
  reading: NaJiaReading;
  /** 變卦盤，用於判動爻的回頭生剋；沒有則略過該項 */
  changed?: NaJiaReading | null;
  /** 動爻爻位 1–6 */
  movingLine?: number;
  relative: SixRelative;
  at?: Date;
}

/**
 * 取定用神並權衡其處境。
 *
 * 用神上卦時取卦中該六親之爻（多爻並見則取最先出現者，並在 reasons 註明）；
 * 不上卦則改看伏神，並依飛伏關係扣分——伏而不出本就是「事情起不來」之象。
 */
export function judgeUseGod({
  reading, changed, movingLine, relative, at = new Date(),
}: JudgeParams): UseGodAnalysis {
  const lines = reading.lines.filter(line => line.relative === relative);
  const hidden = lines.length === 0
    ? reading.hidden.find(h => h.relative === relative) ?? null
    : null;

  const subject = lines[0] ?? null;
  const element = subject?.element ?? hidden?.element ?? null;
  const branch = subject?.branch ?? hidden?.branch ?? null;

  const reasons: { label: string; score: number }[] = [];

  if (!element || !branch) {
    // 理論上不會發生：八純卦六支涵蓋五行，任何六親都找得到伏神
    return {
      relative, lines, hidden, element: null,
      monthState: null, dayRelation: null,
      reasons: [{ label: '用神不上卦且無伏神可取', score: 0 }],
      score: 0, verdict: '平',
    };
  }

  // ── 月建旺衰 ──
  const month = monthBranchContext(at);
  const seasonElement = SEASON_ELEMENT[seasonOf(month.branch)];
  const monthState = strengthState(element, seasonElement);
  reasons.push({ label: `月建${reading.monthBranch}令${seasonElement}當權，用神屬${element}為「${monthState}」`, score: SCORE.月建[monthState] });

  // ── 日辰作用 ──
  const dayRelation = dayRelationOf(element, branch, reading.dayBranch);
  reasons.push({ label: `日建${reading.dayStemBranch}：${dayRelation}`, score: SCORE[dayRelation] });

  // ── 空亡與月破 ──
  // 上卦與伏神一視同仁：伏神落空亡、逢月破同樣是「事起不來」之象
  if (subject?.isVoid || (hidden && reading.voidBranches.includes(hidden.branch))) {
    reasons.push({ label: `用神${branch}落${reading.xun}空亡`, score: SCORE.空亡 });
  }
  const isMonthBroken = subject?.isMonthBroken
    ?? (hidden ? BRANCH_OPPOSITES[hidden.branch] === reading.monthBranch : false);
  if (isMonthBroken) {
    reasons.push({ label: `用神${branch}逢月建${reading.monthBranch}沖，為月破`, score: SCORE.月破 });
  }

  // ── 伏神 ──
  if (hidden) {
    const canEmerge = hidden.canEmerge;
    reasons.push({
      label: `用神不上卦，伏於${hidden.position}爻${hidden.flyingStemBranch}之下（${hidden.relation}）`,
      score: canEmerge ? SCORE.伏而可出 : SCORE.伏而不出,
    });
  }

  // ── 動爻對用神的生剋 ──
  if (movingLine !== undefined) {
    const mover = reading.lines[movingLine - 1];
    const isUseGodMoving = subject?.position === movingLine;

    if (mover && !isUseGodMoving) {
      if (GENERATES[mover.element] === element) {
        reasons.push({ label: `${movingLine}爻${mover.relative}${mover.stemBranch}動而生用神`, score: SCORE.動爻生用神 });
      } else if (OVERCOMES[mover.element] === element) {
        reasons.push({ label: `${movingLine}爻${mover.relative}${mover.stemBranch}動而剋用神`, score: SCORE.動爻剋用神 });
      }
    }

    // 用神自身發動 → 看變爻的回頭生剋
    if (isUseGodMoving && changed) {
      const transformed = changed.lines[movingLine - 1];
      if (transformed) {
        if (GENERATES[transformed.element] === element) {
          reasons.push({ label: `用神發動化${transformed.stemBranch}，回頭生`, score: SCORE.回頭生 });
        } else if (OVERCOMES[transformed.element] === element) {
          reasons.push({ label: `用神發動化${transformed.stemBranch}，回頭剋`, score: SCORE.回頭剋 });
        }
      }
    }
  }

  if (lines.length > 1) {
    reasons.push({ label: `用神${relative}兩現，取${subject!.position}爻為主`, score: 0 });
  }

  const score = reasons.reduce((sum, r) => sum + r.score, 0);
  return {
    relative, lines, hidden, element,
    monthState, dayRelation,
    reasons, score,
    verdict: verdictFromScore(score),
  };
}
