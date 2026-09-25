// 閱讀報告服務
//
// 分享卡（ShareCardView）是固定尺寸、對外分享的成品，內容刻意精簡
// （白話解釋只取前 80 字）。報告是給使用者自己保存的完整版——單筆或
// 多筆記錄的籤詩／靈棋卦目、六爻或三才推演、棋盤位置解讀、深度解讀、
// 行動建議與占驗回填，一次匯出成一張可捲動的長圖。
//
// 這裡只做「資料要不要收、收了要怎麼組」的純邏輯，不碰 RN 元件——
// 好單元測試，也讓 ReportCardView 只管畫面。

import type { DivinationRecord, DivinationOutcome } from './storage';
import { getPoemById, type Poem } from '@/data/poems';
import { localizePoem } from './localize';
import { trigramsFromIndex } from './hexagram';
import { buildLiuYaoReading, type LiuYaoReading } from './liuyao';
import { buildInterpretation } from './interpretation';
import { lingqiOracleByKey, type LingqiOracle } from './lingqi';
import { buildLingqiInterpretation } from './lingqiInterpretation';
import { getSpread } from './spreads';
import { resolvePrevious, laterAsks } from './related';
import { recordTitle } from './poemList';

export interface ReportPrivacyOptions {
  /**
   * 是否納入使用者自填的問題內容與自由筆記。預設 true——報告是給自己
   * 保存的，預設應該完整；要分享給別人看時使用者可以自己關掉。
   */
  includePersonalText?: boolean;
}

export interface ReportSection {
  record: DivinationRecord;
  /** 這一段的標題：籤題，或靈棋卦名・象 */
  title: string;
  poem: Poem | null;
  reading: LiuYaoReading | null;
  oracle: LingqiOracle | null;
  interpretation: string | null;
  actionPlan: string[];
  spreadName?: string;
  /** 依隱私選項決定後的顯示值；undefined 表示這段不顯示 */
  questionText?: string;
  note?: string;
  outcome?: DivinationOutcome;
  /**
   * 「同一件事」的前一次（S76 連結）。報告是這筆記錄的完整版，漏掉「這是重問」
   * 就少了讀這一卦時最該知道的前提。只給日期與題名：前一次的問題本文屬於那一筆，
   * 不經它自己的隱私選項就印出來不對。
   */
  relatedPrevious?: { timestamp: number; title: string };
  /** 之後又連結到這一筆的次數（同一件事後來又占的） */
  relatedLaterCount: number;
  /**
   * 占卜前的直覺（%）。跟著「問題與筆記」同一個隱私開關：那是使用者對自己這件事的私下估計，
   * 分享報告時不想被看到的程度與問題本文相當——多藏一項比開關說的多，是安全的那一側。
   */
  intuition?: number;
}

/**
 * 批次匯出上限。長圖是單一離屏 View 一次截圖，記錄數不設上限的話
 * 高度會隨筆數線性增長，在原生渲染器上是否仍能截到完整內容沒有實機
 * 可以驗證——先抓一個肉眼可讀、螢幕捲得完的安全值，而不是猜一個更大的
 * 數字又沒有把握。
 */
export const REPORT_BATCH_LIMIT = 20;

/** 與 reveal.tsx 相同的還原前檢查：備份還原可能夾帶越界或損毀的卦象資料 */
function readingForRecord(record: DivinationRecord): LiuYaoReading | null {
  if (record.hexagramIndex === undefined || record.movingLine === undefined) return null;
  if (
    record.hexagramIndex < 0 || record.hexagramIndex > 63 ||
    record.movingLine < 1 || record.movingLine > 6 ||
    !Number.isFinite(record.timestamp)
  ) {
    return null;
  }
  const [upper, lower] = trigramsFromIndex(record.hexagramIndex);
  return buildLiuYaoReading(upper, lower, record.movingLine, new Date(record.timestamp));
}

/**
 * @param all 用來查「同一件事」連結的完整記錄清單；不給就當沒有連結（不猜）。
 */
function includePersonalFor(options?: ReportPrivacyOptions): boolean {
  return options?.includePersonalText ?? true;
}

export function buildReportSection(
  record: DivinationRecord,
  options?: ReportPrivacyOptions,
  all: readonly DivinationRecord[] = [],
): ReportSection {
  const previous = resolvePrevious(record, all);
  const related = {
    intuition: includePersonalFor(options) ? record.intuition : undefined,
    relatedPrevious: previous ? { timestamp: previous.timestamp, title: recordTitle(previous) } : undefined,
    relatedLaterCount: laterAsks(record, all).length,
  };
  const includePersonal = includePersonalFor(options);
  const questionText = includePersonal ? record.questionText : undefined;
  const note = includePersonal ? record.note : undefined;
  const spreadName = record.mode === 'board' && record.spreadId && record.spreadId !== 'free'
    ? getSpread(record.spreadId).name
    : undefined;

  if (record.mode === 'lingqi') {
    const oracle = record.lingqiKey ? lingqiOracleByKey(record.lingqiKey) : undefined;
    if (!oracle) {
      // 資料損毀或鍵值對不上任何卦目——與 lingqi.ts 的 lingqiOracle() 一致，
      // 不假裝有內容，讓呼叫端知道這段沒有解讀可顯示。
      return {
        record, title: record.poemTitle || '', poem: null, reading: null, oracle: null,
        interpretation: null, actionPlan: [], spreadName, questionText, note, outcome: record.outcome,
        ...related,
      };
    }
    const deep = buildLingqiInterpretation({ oracle, questionCategory: record.questionCategory });
    return {
      record,
      title: `${oracle.name}・${oracle.image}`,
      poem: null,
      reading: null,
      oracle,
      interpretation: deep.interpretation,
      actionPlan: deep.actionPlan,
      spreadName,
      questionText,
      note,
      outcome: record.outcome,
      ...related,
    };
  }

  const poem = localizePoem(getPoemById(record.poemId));
  const reading = readingForRecord(record);
  const deep = buildInterpretation({ poem, questionText, questionCategory: record.questionCategory, reading });
  return {
    record,
    title: poem.title,
    poem,
    reading,
    oracle: null,
    interpretation: deep.interpretation,
    actionPlan: deep.actionPlan,
    spreadName,
    questionText,
    note,
    outcome: record.outcome,
    ...related,
  };
}

export function buildReportSections(
  records: readonly DivinationRecord[],
  options?: ReportPrivacyOptions,
  all: readonly DivinationRecord[] = [],
): ReportSection[] {
  return records.map(record => buildReportSection(record, options, all));
}
