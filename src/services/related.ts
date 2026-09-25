// 同一件事的占卜 — 連結、建議與並列比較
//
// 六爻有「一事不二占」的講究（典出《易·蒙》卦辭）。App 原本對使用者
// 把同一件事重問一遍完全沒有反應：兩次的卦各自躺在歷史裡，看不出它們其實在回答同一個問題。
//
// 這一層只做三件事，而且都刻意保守：
//   1. 讓使用者**手動**把兩次占卜連成「同一件事」（linkRelatedRecord，見 storage.ts）；
//   2. 只在問題文字**完全相同**時建議連結，成不成立仍由使用者按；
//   3. 連結之後把兩次的卦象並列——只陳述「相同／不同」，不替使用者決定信哪一次。
// 「同一件事」沒有可靠的自動判準，猜錯的代價是把兩件無關的事說成同一件，所以不猜。

import type { DivinationRecord } from './storage';
import { readingForRecord } from './verification';
import { questionCategoryDomain } from './questionCategories';

/** 選單最多列幾筆。歷史上限 500 筆，全列出來只是把選擇丟回給使用者 */
export const RELATED_CANDIDATE_LIMIT = 30;

/**
 * 問題文字的比對形式：去頭尾與內部空白、英文轉小寫。
 * 只做到這裡——不做同義詞、不做相似度。「差不多」的問題不是「相同」的問題，
 * 那條線要留給使用者自己劃。
 */
export function normalizeQuestion(text?: string): string {
  return (text ?? '').replace(/\s+/g, '').toLowerCase();
}

/** 兩筆的問題都非空且正規化後相同。兩邊都沒填問題不算相同（空 = 空 沒有資訊量） */
export function isSameQuestion(a: Pick<DivinationRecord, 'questionText'>, b: Pick<DivinationRecord, 'questionText'>): boolean {
  const qa = normalizeQuestion(a.questionText);
  return qa !== '' && qa === normalizeQuestion(b.questionText);
}

/**
 * 問事類別相同（先映回主類別）。任一邊沒有類別則為否——
 * 「都沒填」不能算成「同一類」。
 */
export function isSameCategory(a: Pick<DivinationRecord, 'questionCategory'>, b: Pick<DivinationRecord, 'questionCategory'>): boolean {
  if (!a.questionCategory || !b.questionCategory) return false;
  return questionCategoryDomain(a.questionCategory) === questionCategoryDomain(b.questionCategory);
}

export interface RelatedCandidate {
  record: DivinationRecord;
  sameQuestion: boolean;
  sameCategory: boolean;
}

/**
 * 這次占卜可以連結到哪些較早的記錄，依「值得看」的程度排序：
 * 同題 > 同類別 > 其餘，同級再由近而遠。
 *
 * 只列**更早**的：連結永遠是新指向舊，這樣不可能成環，也符合「這是同一件事的再一次」
 * 這個語意——不會有「後來的那次是前一次的前一次」。
 */
export function relatedCandidates(
  current: DivinationRecord,
  all: readonly DivinationRecord[],
  limit: number = RELATED_CANDIDATE_LIMIT,
): RelatedCandidate[] {
  return all
    .filter(r => r.id !== current.id && r.timestamp < current.timestamp)
    .map(record => ({
      record,
      sameQuestion: isSameQuestion(record, current),
      sameCategory: isSameCategory(record, current),
    }))
    .sort((a, b) =>
      Number(b.sameQuestion) - Number(a.sameQuestion)
      || Number(b.sameCategory) - Number(a.sameCategory)
      || b.record.timestamp - a.record.timestamp
      || (a.record.id < b.record.id ? -1 : 1))
    .slice(0, limit);
}

/**
 * 尚未連結時要不要建議：有較早的記錄問了**完全相同**的問題，取最近的那一筆。
 * 這是建議，不是判定——畫面上要使用者按下連結才成立。
 */
export function suggestedPrevious(
  current: DivinationRecord,
  all: readonly DivinationRecord[],
): DivinationRecord | null {
  if (current.relatedTo) return null;
  return relatedCandidates(current, all, all.length).find(c => c.sameQuestion)?.record ?? null;
}

/**
 * 這筆連結指向的前一次。不信任儲存的 id：拿去清單裡查，查不到、或指到不是更早的記錄
 * （手改的備份、同步合併的殘留）都當沒有連結——寧可少顯示，也不顯示一條錯的關係。
 */
export function resolvePrevious(
  current: DivinationRecord,
  all: readonly DivinationRecord[],
): DivinationRecord | null {
  if (!current.relatedTo) return null;
  const found = all.find(r => r.id === current.relatedTo);
  return found && found.timestamp < current.timestamp ? found : null;
}

/** 之後又連結到這一筆的記錄（同一件事後來又占的），由舊到新 */
export function laterAsks(
  current: DivinationRecord,
  all: readonly DivinationRecord[],
): DivinationRecord[] {
  return all
    .filter(r => r.relatedTo === current.id && r.timestamp > current.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : 1));
}

/**
 * 整份清單裡，哪些記錄屬於某個「同一件事」的連結（指向別人或被指向都算）。
 *
 * 給清單畫面一次算完——逐張卡片各跑 resolvePrevious／laterAsks 是平方級的成本。
 * 規則與 resolvePrevious 相同、不另訂一套：指向的 id 查不到、或指到不是更早的記錄，
 * 兩端都不算。否則卡片上標著「有連結」，點進去卻什麼都沒有。
 */
export function linkedRecordIds(all: readonly DivinationRecord[]): Set<string> {
  const byId = new Map(all.map(r => [r.id, r]));
  const linked = new Set<string>();
  for (const r of all) {
    if (!r.relatedTo) continue;
    const prev = byId.get(r.relatedTo);
    if (!prev || prev.timestamp >= r.timestamp) continue;
    linked.add(r.id);
    linked.add(prev.id);
  }
  return linked;
}

export interface ReadingSummary {
  /** 本卦名；靈棋則是卦目名 */
  name: string;
  /** 以下三項只有六爻記錄（有完整卦例資料）才有 */
  changedName?: string;
  movingLineName?: string;
  /** 綜合斷語（體用生剋再經月令旺衰調整後的最終判定） */
  level?: string;
}

/**
 * 把一筆記錄摘成可並列的幾個欄位。
 *
 * 六爻記錄重算卦例時用**記錄自己的 timestamp**，讓月令旺衰還原成起卦當時——
 * 用現在時間會讓同一筆舊記錄每個月重看都得到不同的綜合斷語（reveal.tsx 同一個理由）。
 * 缺少卦例資料的舊記錄（或靈棋）只給名稱，不編造其他欄位；名稱取記錄存下的字，
 * 不拿來路不明的卦象資料重算。
 */
export function summarizeReading(record: DivinationRecord): ReadingSummary {
  // 靈棋記錄沒有六爻卦例；v1 舊記錄卦序有誤、越界或損毀的資料，readingForRecord 都會擋成 null
  const reading = record.mode === 'lingqi' ? null : readingForRecord(record);
  if (reading) {
    return {
      name: reading.primary.name,
      changedName: reading.changed.name,
      movingLineName: reading.movingLineName,
      level: reading.finalLevel,
    };
  }
  return { name: record.mode === 'lingqi' ? record.poemTitle : (record.hexagramName ?? record.poemTitle) };
}

export interface ReadingComparison {
  /**
   * 兩次的占卜方式是否可以逐項比（六爻對六爻、靈棋對靈棋）。
   * 六爻與靈棋是兩套不同的卦，比「相同或不同」沒有意義，畫面只並列名稱。
   */
  comparable: boolean;
  samePrimary: boolean;
  /** 任一邊缺卦例資料時為 null（說不出相同或不同，就不說） */
  sameChanged: boolean | null;
  sameMoving: boolean | null;
}

export function compareReadings(previous: DivinationRecord, current: DivinationRecord): ReadingComparison {
  const comparable = (previous.mode === 'lingqi') === (current.mode === 'lingqi');
  const a = summarizeReading(previous);
  const b = summarizeReading(current);
  if (!comparable) return { comparable, samePrimary: false, sameChanged: null, sameMoving: null };
  return {
    comparable,
    samePrimary: a.name === b.name,
    sameChanged: a.changedName !== undefined && b.changedName !== undefined ? a.changedName === b.changedName : null,
    sameMoving: a.movingLineName !== undefined && b.movingLineName !== undefined ? a.movingLineName === b.movingLineName : null,
  };
}

const DATE_LOCALES: Record<string, string> = { 'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP' };

/** 清單裡的短日期（不含時分）。語言由呼叫端傳入，不在這裡讀全域狀態 */
export function formatShortDate(timestamp: number, lang: string): string {
  return new Date(timestamp).toLocaleDateString(
    DATE_LOCALES[lang] ?? 'zh-TW',
    { year: 'numeric', month: 'numeric', day: 'numeric' },
  );
}
