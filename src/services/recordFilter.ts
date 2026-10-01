// 收藏頁的記錄篩選：占驗狀態＋占卜模式＋問事類別
//
// 首頁與統計頁都說「N 筆可以回填了」，點下去卻只到最近那一筆——第二筆以後要自己去收藏頁翻，
// 而收藏頁在此之前只有搜尋、排序與資料夾，沒有任何狀態篩選（S88 盤點 #27）。
//
// 「待回填」與首頁、統計頁用同一個判定（`pendingVerification` ＋ `verifyReminderPolicy` 的天數），
// 不另寫一份「沒有 outcome 就算」：那樣首頁說 3 筆、點進來卻列出 12 筆（連昨天剛占的都算），
// 數字對不上的那一刻，使用者就不再相信任何一邊。
import type { DivinationMode, DivinationRecord } from './storage';
import { isVerified, pendingVerification } from './verification';
import { questionCategoryDomain } from './questionCategories';

export type StatusFilter = 'all' | 'pending' | 'verified';

export interface RecordFilter {
  status: StatusFilter;
  /** null＝不限模式 */
  mode: DivinationMode | null;
  /**
   * null＝不限類別。值是**主類別**（`questionCategoryDomain` 映回後的 key），
   * 與統計頁「分項應驗率」同一種分法：選「事業」也列出求職、升遷那幾筆。
   * 照原始子領域分的話，兩頁對同一批記錄會給出不同的分組，S51 修過的就是這件事。
   */
  category: string | null;
}

export const NO_FILTER: RecordFilter = { status: 'all', mode: null, category: null };

/** 有沒有任何條件生效——空狀態要分得出「沒有記錄」與「篩掉了」 */
export function isFiltering(filter: RecordFilter): boolean {
  return filter.status !== 'all' || filter.mode !== null || filter.category !== null;
}

/**
 * 記錄歸在哪個主類別。沒選類別的記錄算「綜合」——結果頁對它們顯示的就是
 * 「類別：綜合」（RecordQuestionBox），篩選要與使用者在記錄上看到的一致。
 */
export function recordCategoryDomain(r: Pick<DivinationRecord, 'questionCategory'>): string {
  return questionCategoryDomain(r.questionCategory || 'general');
}

/**
 * 篩選列要出現哪些類別：只列記錄裡真的出現過的主類別，依 `order` 排
 * （內建類別在前、自訂類別在後），不在 `order` 裡的（已刪的自訂類別、舊資料）排最後。
 *
 * 不列全部十幾個類別：沒有記錄的類別按下去必然是空的，只是讓手機上多換兩行。
 */
export function categoryFilterOptions(
  records: readonly Pick<DivinationRecord, 'questionCategory'>[],
  order: readonly string[],
): string[] {
  const present = new Set(records.map(recordCategoryDomain));
  const rank = (key: string) => {
    const i = order.indexOf(key);
    return i === -1 ? order.length : i;
  };
  return [...present].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * 依條件篩選記錄，保留原本的順序（排序是呼叫端的事）。
 *
 * @param pendingIds 「待回填」記錄的 id，由 `pendingIdsOf` 對**完整歷史**算出——
 *   收藏是歷史的副本，只對眼前這份清單算的話，兩個分頁可能給出不同答案
 */
export function filterRecords(
  records: DivinationRecord[],
  filter: RecordFilter,
  pendingIds: ReadonlySet<string>,
): DivinationRecord[] {
  return records.filter(r => {
    if (filter.mode !== null && r.mode !== filter.mode) return false;
    if (filter.category !== null && recordCategoryDomain(r) !== filter.category) return false;
    if (filter.status === 'pending') return pendingIds.has(r.id);
    if (filter.status === 'verified') return isVerified(r);
    return true;
  });
}

/** 待回填記錄的 id 集合。天數由呼叫端依 `verifyReminderPolicy` 給，與首頁、統計頁同一個答案 */
export function pendingIdsOf(history: DivinationRecord[], now: number, minDays: number): Set<string> {
  return new Set(pendingVerification(history, now, minDays).map(r => r.id));
}
