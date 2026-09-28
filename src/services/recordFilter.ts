// 收藏頁的記錄篩選：占驗狀態＋占卜模式
//
// 首頁與統計頁都說「N 筆可以回填了」，點下去卻只到最近那一筆——第二筆以後要自己去收藏頁翻，
// 而收藏頁在此之前只有搜尋、排序與資料夾，沒有任何狀態篩選（S88 盤點 #27）。
//
// 「待回填」與首頁、統計頁用同一個判定（`pendingVerification` ＋ `verifyReminderPolicy` 的天數），
// 不另寫一份「沒有 outcome 就算」：那樣首頁說 3 筆、點進來卻列出 12 筆（連昨天剛占的都算），
// 數字對不上的那一刻，使用者就不再相信任何一邊。
import type { DivinationMode, DivinationRecord } from './storage';
import { isVerified, pendingVerification } from './verification';

export type StatusFilter = 'all' | 'pending' | 'verified';

export interface RecordFilter {
  status: StatusFilter;
  /** null＝不限模式 */
  mode: DivinationMode | null;
}

export const NO_FILTER: RecordFilter = { status: 'all', mode: null };

/** 有沒有任何條件生效——空狀態要分得出「沒有記錄」與「篩掉了」 */
export function isFiltering(filter: RecordFilter): boolean {
  return filter.status !== 'all' || filter.mode !== null;
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
    if (filter.status === 'pending') return pendingIds.has(r.id);
    if (filter.status === 'verified') return isVerified(r);
    return true;
  });
}

/** 待回填記錄的 id 集合。天數由呼叫端依 `verifyReminderPolicy` 給，與首頁、統計頁同一個答案 */
export function pendingIdsOf(history: DivinationRecord[], now: number, minDays: number): Set<string> {
  return new Set(pendingVerification(history, now, minDays).map(r => r.id));
}
