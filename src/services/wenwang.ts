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
// 應期（何時應驗）與問卜者對所問之人的親屬關係。前者要推到日、月甚至
// 流年，起卦只到日柱就下結論等於編一個日期；後者 App 根本沒有問。
//
// 進退神、暗動、三合局原本也列在此處，Session 26 重新檢視後移出：
// 它們只需要動爻、變爻、日辰與六爻地支，卦本身就已經給足前提，
// 判定邏輯見 conditions.ts。爻的反吟伏吟則是另一回事——單動爻模型下
// 根本不可能成立，理由與守門測試都寫在 conditions.ts。

import type { NaJiaLine, NaJiaReading, SixRelative, HiddenSpirit } from './najja';
import type { UseGodSubject } from './useGod';
import { advanceOrRetreat, detectTriads, darkMovingLines } from './conditions';
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
  /** 取法：某一六親，或世爻 */
  subject: UseGodSubject;
  /** 實際據以論斷之爻的六親；世爻為用時即持世的六親 */
  relative: SixRelative | null;
  /** 用神在卦中的爻；不上卦時為空陣列 */
  lines: NaJiaLine[];
  /** 用神不上卦時所伏之處（世爻為用時恆為 null，世爻必在卦中） */
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
  忌神持世: -2,
  喜神持世: 1,
  忌神發動: -1,
  喜神發動: 1,
  化進神: 1,
  化退神: -1,
  暗動生用神: 1,
  暗動剋用神: -1,
  用神入局: 2,
  合局生用神: 1,
  合局剋用神: -1,
  用神洩於局: -1,
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
  /** 用神取法：六親或世爻 */
  subject: UseGodSubject;
  /** 該類問事的助事之神；持世或發動時加分 */
  favorable?: SixRelative;
  /** 該類問事的壞事之神；持世或發動時扣分 */
  taboo?: SixRelative;
  at?: Date;
}

/**
 * 取定用神並權衡其處境。
 *
 * 六親為用時，用神上卦則取卦中該六親之爻（多爻並見則優先取發動之爻，
 * 皆靜取最先出現者，並在 reasons 註明）；不上卦則改看伏神，並依飛伏
 * 關係扣分——伏而不出本就是「事情起不來」之象。
 *
 * 世爻為用時（自占疾病、出行）不會有伏神：世爻必在卦中。
 */
export function judgeUseGod({
  reading, changed, movingLine, subject, favorable, taboo, at = new Date(),
}: JudgeParams): UseGodAnalysis {
  const byWorld = subject === '世爻';
  const lines = byWorld
    ? reading.lines.filter(line => line.isWorld)
    : reading.lines.filter(line => line.relative === subject);
  const hidden = lines.length === 0 && !byWorld
    ? reading.hidden.find(h => h.relative === subject) ?? null
    : null;

  // 用神兩現的取法（卜筮正宗）：優先取發動之爻——若第二現才是動爻，
  // 回頭生剋與進退神整段才有機會被檢查，取最先出現者會讓斷語少計。
  // 皆不發動（或未起動爻）時取最先出現者。更細的「俱動取旺相、
  // 俱靜取空破」沒有採計：單動爻模型下不會有俱動，空破取用是另一套
  // 有爭議的取法；reasons 已逐條揭露採計條件，留下調整空間。
  const subjectLine = (() => {
    if (lines.length <= 1) return lines[0] ?? null;
    if (movingLine !== undefined) {
      const mover = lines.find(line => line.position === movingLine);
      if (mover) return mover;
    }
    return lines[0];
  })();
  const relative = subjectLine?.relative ?? hidden?.relative ?? null;
  const element = subjectLine?.element ?? hidden?.element ?? null;
  const branch = subjectLine?.branch ?? hidden?.branch ?? null;

  const reasons: { label: string; score: number }[] = [];

  if (!element || !branch) {
    // 理論上不會發生：八純卦六支涵蓋五行，任何六親都找得到伏神；
    // 世爻為用時世爻必在卦中
    return {
      subject, relative, lines, hidden, element: null,
      monthState: null, dayRelation: null,
      reasons: [{ label: '用神不上卦且無伏神可取', score: 0 }],
      score: 0, verdict: '平',
    };
  }

  // ── 世爻為用：先講明是誰持世，否則使用者看不出斷的是哪一爻 ──
  if (byWorld && subjectLine) {
    reasons.push({
      label: `自占以世爻為用神，世在${subjectLine.position}爻${subjectLine.stemBranch}（${subjectLine.relative}持世）`,
      score: 0,
    });
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
  if (subjectLine?.isVoid || (hidden && reading.voidBranches.includes(hidden.branch))) {
    reasons.push({ label: `用神${branch}落${reading.xun}空亡`, score: SCORE.空亡 });
  }
  const isMonthBroken = subjectLine?.isMonthBroken
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

  // ── 喜忌之神持世 ──
  // 只在世爻為用時判：用神已是某一六親時，「忌神持世」講的是問卜者的處境，
  // 與用神本身的旺衰不在同一層，混進同一個分數會失焦。
  if (byWorld && subjectLine) {
    if (taboo && subjectLine.relative === taboo) {
      reasons.push({ label: `${taboo}持世，所問之患纏身`, score: SCORE.忌神持世 });
    } else if (favorable && subjectLine.relative === favorable) {
      reasons.push({ label: `${favorable}持世，助事之神在己`, score: SCORE.喜神持世 });
    }
  }

  // ── 暗動 ──
  // 靜爻旺相而逢日辰沖，暗中有力。與日破的分野只在旺衰，
  // 兩者同樣是日沖靜爻，不分旺衰就會把有力的爻當成壞掉的爻。
  for (const dark of darkMovingLines({ reading, movingLine, seasonElement })) {
    if (dark.position === subjectLine?.position) continue;
    if (GENERATES[dark.element] === element) {
      reasons.push({ label: `${dark.position}爻${dark.relative}${dark.stemBranch}逢日辰沖而暗動，生用神`, score: SCORE.暗動生用神 });
    } else if (OVERCOMES[dark.element] === element) {
      reasons.push({ label: `${dark.position}爻${dark.relative}${dark.stemBranch}逢日辰沖而暗動，剋用神`, score: SCORE.暗動剋用神 });
    }
  }

  // ── 動爻對用神的生剋 ──
  if (movingLine !== undefined) {
    const mover = reading.lines[movingLine - 1];
    const isUseGodMoving = subjectLine?.position === movingLine;

    if (mover && !isUseGodMoving) {
      const generatesUseGod = GENERATES[mover.element] === element;
      const overcomesUseGod = OVERCOMES[mover.element] === element;

      if (generatesUseGod) {
        reasons.push({ label: `${movingLine}爻${mover.relative}${mover.stemBranch}動而生用神`, score: SCORE.動爻生用神 });
      } else if (overcomesUseGod) {
        reasons.push({ label: `${movingLine}爻${mover.relative}${mover.stemBranch}動而剋用神`, score: SCORE.動爻剋用神 });
      }

      // 喜忌之神發動。這與上面的五行生剋是同一件事的兩種說法，
      // 生剋已經計過分就不再計一次——同一個動作不該扣兩次分。
      if (!generatesUseGod && !overcomesUseGod) {
        if (taboo && mover.relative === taboo) {
          reasons.push({ label: `${movingLine}爻${taboo}發動，為所問之忌神`, score: SCORE.忌神發動 });
        } else if (favorable && mover.relative === favorable) {
          reasons.push({ label: `${movingLine}爻${favorable}發動，為所問之喜神`, score: SCORE.喜神發動 });
        }
      }
    }

    // 用神自身發動 → 看變爻的回頭生剋與進退神
    if (isUseGodMoving && changed) {
      const transformed = changed.lines[movingLine - 1];
      if (transformed) {
        if (GENERATES[transformed.element] === element) {
          reasons.push({ label: `用神發動化${transformed.stemBranch}，回頭生`, score: SCORE.回頭生 });
        } else if (OVERCOMES[transformed.element] === element) {
          reasons.push({ label: `用神發動化${transformed.stemBranch}，回頭剋`, score: SCORE.回頭剋 });
        }

        // 進退神：化出同五行之支，順進逆退。與回頭生剋不重疊——
        // 同五行必為比和，回頭那兩條本來就不會觸發。
        const progression = advanceOrRetreat(branch, transformed.branch);
        if (progression === '進神') {
          reasons.push({ label: `用神${branch}化${transformed.branch}，為進神`, score: SCORE.化進神 });
        } else if (progression === '退神') {
          reasons.push({ label: `用神${branch}化${transformed.branch}，為退神`, score: SCORE.化退神 });
        }
      }
    }

    // ── 三合局 ──
    // 無動不成局，故整段只在有動爻時判。局成則該五行成勢，
    // 對用神的作用比單一爻大，這是與「動爻生剋用神」不同層的一件事。
    for (const triad of detectTriads({ lines: reading.lines, movingLine, dayBranch: reading.dayBranch })) {
      const where = `${triad.name}合${triad.element}局`;
      const source = triad.fromDay ? `（${triad.fromDay}由日辰補足）` : '';
      const inTriad = subjectLine ? triad.positions.includes(subjectLine.position) : false;

      if (triad.element === element) {
        reasons.push({ label: `${where}成${source}，用神入局得助`, score: SCORE.用神入局 });
      } else if (GENERATES[triad.element] === element) {
        reasons.push({ label: `${where}成${source}，局生用神`, score: SCORE.合局生用神 });
      } else if (OVERCOMES[triad.element] === element) {
        reasons.push({ label: `${where}成${source}，局剋用神`, score: SCORE.合局剋用神 });
      } else if (inTriad && GENERATES[element] === triad.element) {
        // 用神自己在局中卻生局，是把力氣送出去
        reasons.push({ label: `${where}成${source}，用神在局中而洩氣`, score: SCORE.用神洩於局 });
      }
    }
  }

  if (!byWorld && lines.length > 1) {
    const chosenAsMover = movingLine !== undefined && subjectLine?.position === movingLine;
    reasons.push({
      label: chosenAsMover
        ? `用神${subject}兩現，${movingLine}爻為動爻，取之為主`
        : `用神${subject}兩現，取${subjectLine!.position}爻為主`,
      score: 0,
    });
  }

  const score = reasons.reduce((sum, r) => sum + r.score, 0);
  return {
    subject, relative, lines, hidden, element,
    monthState, dayRelation,
    reasons, score,
    verdict: verdictFromScore(score),
  };
}
