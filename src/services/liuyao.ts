// 六爻推演服務
//
// 傳統易占的解讀骨幹不只有「本卦」，而是：
//   本卦（現況）→ 動爻（變化關鍵）→ 變卦（結果）→ 互卦（過程中的隱藏因素）
// 再以「體用生剋」判斷吉凶主客。
//
// 舊版只有本卦，占卜等同抽一張牌，缺少「事情如何演變」這條時間軸，
// 而那正是使用者最想知道的。

import {
  TRIGRAM_NAMES, TRIGRAM_SYMBOLS, TRIGRAM_GLYPHS, TRIGRAM_ELEMENTS,
  hexagramIndex, hexagramLines, hexagramNameOf, poemIdFromTrigrams,
  trigramFromLines, trigramsFromLines, lineName,
  type LineValue,
} from './hexagram';
import {
  monthBranchContext, monthBranchName, seasonOf, SEASON_ELEMENT,
  type Season,
} from './date';
import { localizeProse } from './localize';

// ====== 型別 ======

export interface HexagramInfo {
  upper: number;
  lower: number;
  index: number;
  name: string;
  poemId: number;
  /** 六爻，索引 0 為初爻 */
  lines: LineValue[];
}

export type BodyUseRelation =
  | '用生體' | '體剋用' | '體用比和' | '體生用' | '用剋體';

export interface BodyUseReading {
  /** 體卦（不含動爻者，代表自己） */
  body: number;
  /** 用卦（含動爻者，代表外在與所問之事） */
  use: number;
  bodyElement: string;
  useElement: string;
  relation: BodyUseRelation;
  level: '大吉' | '吉' | '平' | '小凶' | '凶';
  text: string;
}

/** 五行在當令季節下的強弱五態 */
export type StrengthState = '旺' | '相' | '休' | '囚' | '死';

export interface SeasonalStrength {
  /** 月建地支數 1–12 */
  monthBranch: number;
  /** 月建名，如「寅月」 */
  monthBranchName: string;
  /** 月建起始節氣，如「立春」 */
  solarTerm: string;
  season: Season;
  /** 當令五行 */
  seasonElement: string;
  /** 體卦五行 */
  bodyElement: string;
  state: StrengthState;
  /** 對吉凶的位移量：旺 +1、相 +1、休 0、囚 −1、死 −1 */
  shift: number;
  text: string;
}

export interface LiuYaoReading {
  /** 本卦 — 目前的處境 */
  primary: HexagramInfo;
  /** 變卦 — 事情的走向與結果 */
  changed: HexagramInfo;
  /** 互卦 — 過程中的隱藏因素 */
  nuclear: HexagramInfo;
  /** 動爻 1–6（自下而上） */
  movingLine: number;
  /** 動爻名，如「六三」 */
  movingLineName: string;
  bodyUse: BodyUseReading;
  /** 體卦在起卦當月的旺衰 */
  strength: SeasonalStrength;
  /**
   * 生剋吉凶再經旺衰調整後的最終判定。
   * `bodyUse.level` 保留未調整的原值，兩者並存讓使用者看得出調整是從何而來，
   * 也讓既有記錄與分享卡的語意不變。
   */
  finalLevel: BodyUseReading['level'];
}

// ====== 五行生剋 ======

const GENERATES: Record<string, string> = {
  金: '水', 水: '木', 木: '火', 火: '土', 土: '金',
};

const OVERCOMES: Record<string, string> = {
  金: '木', 木: '土', 土: '水', 水: '火', 火: '金',
};

// ====== 建構 ======

function buildInfo(upper: number, lower: number): HexagramInfo {
  return {
    upper,
    lower,
    index: hexagramIndex(upper, lower),
    name: hexagramNameOf(upper, lower),
    poemId: poemIdFromTrigrams(upper, lower),
    lines: hexagramLines(upper, lower),
  };
}

/**
 * 變卦：將動爻的陰陽反轉後所成之卦。
 * 動爻即「物極必反」之處，變卦代表事情發展後的結果。
 */
function buildChanged(lines: LineValue[], movingLine: number): HexagramInfo {
  const flipped = [...lines];
  flipped[movingLine - 1] = (flipped[movingLine - 1] === 0 ? 1 : 0) as LineValue;
  const { upper, lower } = trigramsFromLines(flipped);
  return buildInfo(upper, lower);
}

/**
 * 互卦：取本卦二、三、四爻為下卦，三、四、五爻為上卦。
 * 代表事情發展過程中，表面之下的實際因素。
 */
function buildNuclear(lines: LineValue[]): HexagramInfo {
  const lower = trigramFromLines([lines[1], lines[2], lines[3]]);
  const upper = trigramFromLines([lines[2], lines[3], lines[4]]);
  return buildInfo(upper, lower);
}

/**
 * 體用：動爻所在之卦為「用」（外在、所問之事），
 * 另一卦為「體」（自己）。再以兩者卦氣五行判生剋。
 */
function buildBodyUse(upper: number, lower: number, movingLine: number): BodyUseReading {
  const movingInLower = movingLine <= 3;
  const use = movingInLower ? lower : upper;
  const body = movingInLower ? upper : lower;

  const bodyElement = TRIGRAM_ELEMENTS[body];
  const useElement = TRIGRAM_ELEMENTS[use];

  let relation: BodyUseRelation;
  let level: BodyUseReading['level'];
  let text: string;

  if (bodyElement === useElement) {
    relation = '體用比和';
    level = '吉';
    text = localizeProse('liuyao.bodyUse.harmony', `體用同為${bodyElement}，比和相得。事與己意相合，推行順暢，不必費力周旋。`, { body: bodyElement });
  } else if (GENERATES[useElement] === bodyElement) {
    relation = '用生體';
    level = '大吉';
    text = localizeProse('liuyao.bodyUse.useFeedsBody', `${useElement}生${bodyElement}，用生體。外力來助，貴人相扶，是最為有利之象，宜順勢承接。`, { use: useElement, body: bodyElement });
  } else if (OVERCOMES[bodyElement] === useElement) {
    relation = '體剋用';
    level = '吉';
    text = localizeProse('liuyao.bodyUse.bodyOvercomesUse', `${bodyElement}剋${useElement}，體剋用。局面操之在我，雖須費力，終能掌控收成。`, { body: bodyElement, use: useElement });
  } else if (GENERATES[bodyElement] === useElement) {
    relation = '體生用';
    level = '小凶';
    text = localizeProse('liuyao.bodyUse.bodyFeedsUse', `${bodyElement}生${useElement}，體生用。心力向外耗洩，付出多而回收少，宜留餘地，勿過度投入。`, { body: bodyElement, use: useElement });
  } else {
    relation = '用剋體';
    level = '凶';
    text = localizeProse('liuyao.bodyUse.useOvercomesBody', `${useElement}剋${bodyElement}，用剋體。外壓強於己身，此時強求必受挫，宜退守待時。`, { use: useElement, body: bodyElement });
  }

  return { body, use, bodyElement, useElement, relation, level, text };
}

// ====== 月建旺衰 ======

/**
 * 五行在當令之下的五態，以「當令者為旺」為原點推出：
 *   旺 — 與當令同（春木旺）
 *   相 — 受當令所生（春水生木？不，是當令所生者：木生火，故春火相）
 *   休 — 生當令者，已盡其功而休（水生木，故春水休）
 *   囚 — 剋當令者，反被令氣所抗而囚（金剋木，故春金囚）
 *   死 — 受當令所剋（木剋土，故春土死）
 *
 * 這是判「體卦有沒有力氣」的依據。同樣是「體剋用」，
 * 體卦當令則真能剋得動，體卦入死則有心無力，吉凶不該相同。
 */
/** 旺衰斷語的翻譯鍵。漢字狀態名不適合直接當 key（要進 en/ja 的物件字面量） */
const STRENGTH_KEY: Readonly<Record<StrengthState, string>> = {
  旺: 'liuyao.strength.wang', 相: 'liuyao.strength.xiang', 休: 'liuyao.strength.xiu',
  囚: 'liuyao.strength.qiu', 死: 'liuyao.strength.si',
};

const STRENGTH_TEXT: Readonly<Record<StrengthState, string>> = {
  旺: '體卦當令而旺，己身氣足，所斷之吉更實、所斷之凶亦能扛。',
  相: '體卦受令氣所生而相，得時之助，氣勢正在積蓄。',
  休: '體卦生令氣而休，功已外洩，力道平平，宜守成勿擴張。',
  囚: '體卦剋令氣而囚，逆時而動，處處受阻，用力多而見效少。',
  死: '體卦受令氣所剋而死，最為無力，此時不宜主動求成，靜候時轉。',
};

/** 位移量：旺相為得時（+1）、休為持平（0）、囚死為失時（−1） */
const STRENGTH_SHIFT: Readonly<Record<StrengthState, number>> = {
  旺: 1, 相: 1, 休: 0, 囚: -1, 死: -1,
};

/** 由體卦五行與當令五行判五態 */
export function strengthState(bodyElement: string, seasonElement: string): StrengthState {
  if (bodyElement === seasonElement) return '旺';
  if (GENERATES[seasonElement] === bodyElement) return '相';
  if (GENERATES[bodyElement] === seasonElement) return '休';
  if (OVERCOMES[bodyElement] === seasonElement) return '囚';
  return '死';   // OVERCOMES[seasonElement] === bodyElement
}

function buildStrength(bodyElement: string, at: Date): SeasonalStrength {
  const monthContext = monthBranchContext(at);
  const monthBranch = monthContext.branch;
  const season = seasonOf(monthBranch);
  const seasonElement = SEASON_ELEMENT[season];
  const state = strengthState(bodyElement, seasonElement);

  return {
    monthBranch,
    monthBranchName: monthBranchName(monthBranch),
    solarTerm: monthContext.term,
    season,
    seasonElement,
    bodyElement,
    state,
    shift: STRENGTH_SHIFT[state],
    text: `${monthBranchName(monthBranch)}（${monthContext.term}後，${season}）令${seasonElement}當權，體卦屬${bodyElement}為「${state}」。${localizeProse(STRENGTH_KEY[state], STRENGTH_TEXT[state])}`,
  };
}

/** 吉凶由凶至吉的序列，供旺衰位移用 */
const LEVEL_SCALE: readonly BodyUseReading['level'][] = ['凶', '小凶', '平', '吉', '大吉'];

/**
 * 以旺衰位移調整生剋吉凶，並夾在序列兩端。
 * 位移僅 ±1 級：旺衰是輔助條件，不該把「用剋體」翻成大吉。
 */
export function applyStrength(
  level: BodyUseReading['level'],
  shift: number,
): BodyUseReading['level'] {
  const i = LEVEL_SCALE.indexOf(level);
  if (i < 0) return level;
  return LEVEL_SCALE[Math.min(LEVEL_SCALE.length - 1, Math.max(0, i + shift))];
}

/**
 * 由上下卦與動爻推演完整卦例。
 *
 * `at` 決定月建，預設為現在。傳入記錄的 timestamp 可還原當時的旺衰，
 * 否則翻看三個月前的舊記錄會套上今天的月令，同一筆記錄每個月解讀都不同。
 */
export function buildLiuYaoReading(
  upper: number,
  lower: number,
  movingLine: number,
  at: Date = new Date(),
): LiuYaoReading {
  const primary = buildInfo(upper, lower);
  const bodyUse = buildBodyUse(upper, lower, movingLine);
  const strength = buildStrength(bodyUse.bodyElement, at);

  return {
    primary,
    changed: buildChanged(primary.lines, movingLine),
    nuclear: buildNuclear(primary.lines),
    movingLine,
    movingLineName: lineName(primary.lines, movingLine),
    bodyUse,
    strength,
    finalLevel: applyStrength(bodyUse.level, strength.shift),
  };
}

// ====== 文字輸出 ======

/** 卦的簡稱，如「乾☰天」 */
export function trigramLabel(trigram: number): string {
  return `${TRIGRAM_NAMES[trigram]}${TRIGRAM_GLYPHS[trigram]}${TRIGRAM_SYMBOLS[trigram]}`;
}

/** 產生三卦、體用與旺衰的文字摘要，供分享與離線解讀使用 */
export function summarizeReading(reading: LiuYaoReading): string {
  const { primary, changed, nuclear, movingLineName, bodyUse, strength, finalLevel } = reading;

  const lines = [
    `本卦：${primary.name}——目前的處境。`,
    `動爻：${movingLineName}（第 ${reading.movingLine} 爻）——變化的關鍵所在。`,
    `互卦：${nuclear.name}——過程中未浮上檯面的因素。`,
    `變卦：${changed.name}——事情發展後的結果。`,
    '',
    `體卦${trigramLabel(bodyUse.body)}（我）、用卦${trigramLabel(bodyUse.use)}（事）。`,
    bodyUse.text,
    '',
    strength.text,
  ];

  // 只在旺衰真的改動了判定時說明，否則多一句話卻沒有資訊
  if (finalLevel !== bodyUse.level) {
    lines.push(`綜合時令，斷語由「${bodyUse.level}」調整為「${finalLevel}」。`);
  }

  return lines.join('\n');
}
