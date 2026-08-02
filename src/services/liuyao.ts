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
    text = `體用同為${bodyElement}，比和相得。事與己意相合，推行順暢，不必費力周旋。`;
  } else if (GENERATES[useElement] === bodyElement) {
    relation = '用生體';
    level = '大吉';
    text = `${useElement}生${bodyElement}，用生體。外力來助，貴人相扶，是最為有利之象，宜順勢承接。`;
  } else if (OVERCOMES[bodyElement] === useElement) {
    relation = '體剋用';
    level = '吉';
    text = `${bodyElement}剋${useElement}，體剋用。局面操之在我，雖須費力，終能掌控收成。`;
  } else if (GENERATES[bodyElement] === useElement) {
    relation = '體生用';
    level = '小凶';
    text = `${bodyElement}生${useElement}，體生用。心力向外耗洩，付出多而回收少，宜留餘地，勿過度投入。`;
  } else {
    relation = '用剋體';
    level = '凶';
    text = `${useElement}剋${bodyElement}，用剋體。外壓強於己身，此時強求必受挫，宜退守待時。`;
  }

  return { body, use, bodyElement, useElement, relation, level, text };
}

/**
 * 由上下卦與動爻推演完整卦例。
 */
export function buildLiuYaoReading(
  upper: number,
  lower: number,
  movingLine: number,
): LiuYaoReading {
  const primary = buildInfo(upper, lower);

  return {
    primary,
    changed: buildChanged(primary.lines, movingLine),
    nuclear: buildNuclear(primary.lines),
    movingLine,
    movingLineName: lineName(primary.lines, movingLine),
    bodyUse: buildBodyUse(upper, lower, movingLine),
  };
}

// ====== 文字輸出 ======

/** 卦的簡稱，如「乾☰天」 */
export function trigramLabel(trigram: number): string {
  return `${TRIGRAM_NAMES[trigram]}${TRIGRAM_GLYPHS[trigram]}${TRIGRAM_SYMBOLS[trigram]}`;
}

/** 產生三卦與體用的文字摘要，供分享與離線解讀使用 */
export function summarizeReading(reading: LiuYaoReading): string {
  const { primary, changed, nuclear, movingLineName, bodyUse } = reading;

  return [
    `本卦：${primary.name}——目前的處境。`,
    `動爻：${movingLineName}（第 ${reading.movingLine} 爻）——變化的關鍵所在。`,
    `互卦：${nuclear.name}——過程中未浮上檯面的因素。`,
    `變卦：${changed.name}——事情發展後的結果。`,
    '',
    `體卦${trigramLabel(bodyUse.body)}（我）、用卦${trigramLabel(bodyUse.use)}（事）。`,
    bodyUse.text,
  ].join('\n');
}
