// 預測校準 — 占卜前記下自己的直覺，事後看「直覺」與「卦」各自準不準
//
// 借的是決策科學裡的校準（calibration）：一個說「七成會成」的人，在他所有說七成的事情裡，
// 應該真的大約七成成了。占驗簿（verification.ts）量的是「卦準不準」，量不到使用者自己；
// 這一層補的就是那一半，並讓兩者在**同一批記錄**上並列。
//
// 三個刻意保守的決定：
//   1. 直覺只在**看到卦之前**記（三個模式的問題步驟），看過卦再填，量到的就不是直覺了。
//   2. 事後的比對基準是「事情本身有沒有如願」，不是占驗結果——後者問的是「卦說中了沒」，
//      拿它來打直覺的分數，等於用卦去評卦。所以回填時對記過直覺的記錄多問這一題。
//   3. 卦不換算成機率。「大吉等於幾成」沒有任何典據，編一張對照表就是在造數字；
//      卦與直覺只比「方向」（看好／不看好），而且只在兩邊都有方向、結果不是半成的記錄上比。

import type { DivinationRecord } from './storage';
import { MIN_INSIGHT_SAMPLES } from './verification';

/**
 * 可選的直覺機率（%）。固定五檔而不是連續數值：分得比 20 個百分點更細，是假裝自己
 * 比實際更有把握；五檔也讓校準表每一列都累積得到樣本。
 */
export const INTUITION_CHOICES = [10, 30, 50, 70, 90] as const;
export type IntuitionPct = typeof INTUITION_CHOICES[number];

/** 事情本身的結果三態。與占驗同樣刻意只做三態（事後回想本就模糊） */
export type RealizedStatus = 'yes' | 'partial' | 'no';
export const REALIZED_STATUSES: readonly RealizedStatus[] = ['yes', 'partial', 'no'] as const;

/**
 * 事情結果三態的譯文鍵（回填表單與報告長圖共用）。寫成字面量對照表而非 t(`realized.${status}`)：
 * 組出來的鍵翻譯鍵反向守門掃不到，只能整個前綴放行，那等於連同 realized.prompt 一起不查
 */
export const REALIZED_LABEL_KEYS: Readonly<Record<RealizedStatus, string>> = {
  yes: 'realized.yes', partial: 'realized.partial', no: 'realized.no',
};

/** 部分如願計半——與占驗的「部分應驗計半分」同一個理由 */
const REALIZED_VALUE: Readonly<Record<RealizedStatus, number>> = { yes: 1, partial: 0.5, no: 0 };

export function isIntuitionPct(value: unknown): value is IntuitionPct {
  return (INTUITION_CHOICES as readonly unknown[]).includes(value);
}

export function isRealizedStatus(value: unknown): value is RealizedStatus {
  return (REALIZED_STATUSES as readonly unknown[]).includes(value);
}

/**
 * 籤詩等級的方向：大吉／上吉／中吉看好，下下不看好，中平與沒有等級（靈棋）不表態。
 * 這是等級字面上的意思，不是換算——中平不硬歸哪一邊。
 */
export function readingDirection(level: string): 'favorable' | 'unfavorable' | null {
  if (level === '大吉' || level === '上吉' || level === '中吉') return 'favorable';
  if (level === '下下') return 'unfavorable';
  return null;
}

export interface CalibrationBucket {
  /** 使用者選的那一檔（%） */
  pct: IntuitionPct;
  /** 這一檔有幾筆已知結果 */
  count: number;
  /** 實際如願的比率 0–100（部分如願計半）；這一檔沒有樣本時為 null */
  realizedRate: number | null;
}

export interface HeadToHead {
  /** 兩邊都表了態、而且結果是全有或全無的記錄數——兩個命中數的共同分母 */
  count: number;
  readingHits: number;
  intuitionHits: number;
  enoughSamples: boolean;
}

export interface CalibrationReport {
  /** 記了直覺、也回填了事情結果的記錄數 */
  samples: number;
  /** 還記了直覺、但還沒回填事情結果的記錄數（給畫面說「還差幾筆」用） */
  awaiting: number;
  /**
   * 直覺的 Brier 分數 0–1，越低越準（四捨五入到小數兩位）。沒有樣本時為 null。
   * 每筆的誤差是（直覺機率 − 實際結果）的平方，結果如願為 1、部分為 0.5、不如願為 0。
   */
  brier: number | null;
  /**
   * 同一批記錄上「每次都選 50%」會得到的分數，當對照。不是固定的 0.25：
   * 部分如願的記錄對 50% 而言誤差是 0，所以要在同一批上實算。
   */
  baselineBrier: number | null;
  buckets: CalibrationBucket[];
  enoughSamples: boolean;
  headToHead: HeadToHead;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeCalibration(records: readonly DivinationRecord[]): CalibrationReport {
  // 不認得的值（手改的備份、舊版殘留）一律當沒記——不能讓一個 75 或 '70' 混進某一檔
  const withIntuition = records.filter(r => isIntuitionPct(r.intuition));
  const scored = withIntuition.filter(r => isRealizedStatus(r.outcome?.realized));

  let brierSum = 0;
  let baselineSum = 0;
  for (const r of scored) {
    const y = REALIZED_VALUE[r.outcome!.realized!];
    brierSum += (r.intuition! / 100 - y) ** 2;
    baselineSum += (0.5 - y) ** 2;
  }

  const buckets = INTUITION_CHOICES.map(pct => {
    const inBucket = scored.filter(r => r.intuition === pct);
    const sum = inBucket.reduce((s, r) => s + REALIZED_VALUE[r.outcome!.realized!], 0);
    return {
      pct,
      count: inBucket.length,
      realizedRate: inBucket.length === 0 ? null : Math.round((sum / inBucket.length) * 100),
    };
  });

  let h2hCount = 0;
  let readingHits = 0;
  let intuitionHits = 0;
  for (const r of scored) {
    const realized = r.outcome!.realized!;
    const direction = readingDirection(r.poemLevel);
    if (realized === 'partial' || direction === null || r.intuition === 50) continue;
    h2hCount++;
    const happened = realized === 'yes';
    if ((direction === 'favorable') === happened) readingHits++;
    if ((r.intuition! > 50) === happened) intuitionHits++;
  }

  return {
    samples: scored.length,
    awaiting: withIntuition.length - scored.length,
    brier: scored.length === 0 ? null : round2(brierSum / scored.length),
    baselineBrier: scored.length === 0 ? null : round2(baselineSum / scored.length),
    buckets,
    enoughSamples: scored.length >= MIN_INSIGHT_SAMPLES,
    headToHead: {
      count: h2hCount,
      readingHits,
      intuitionHits,
      enoughSamples: h2hCount >= MIN_INSIGHT_SAMPLES,
    },
  };
}
