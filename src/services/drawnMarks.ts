// 圖鑑與卦典的「我抽過」標記（路線圖 #29）。
//
// 只標出「這一張抽過幾次、最近那一筆在哪」，**刻意不做 x／64 的收集進度**：
// 收集率會把「多占幾次湊滿」變成目標，與占卜該有的節制相反（S88 盤點時的判斷）。
// 每張卡只回答「我和這一卦有過什麼」，不回答「還缺幾張」。
//
// 三個分頁各自的鍵：
// - 籤詩：poemId（1–64）。v1 舊記錄也算——卦序雖錯，那首籤詩確實是使用者當時看到的。
// - 卦典：同一個 poemId，但**排除 v1 舊記錄**：v1 的 poemId 與卦象不符（isLegacyRecord），
//   拿它標卦典等於說「你抽過這一卦」，而實際起到的是另一卦。
// - 靈棋：lingqiKey。靈棋記錄的 poemId 恆為 0，不進前兩者。

import { isLegacyRecord, type DivinationRecord } from './storage';

export interface DrawnMark {
  count: number;
  /** 最近一筆，供「看最近一次」開啟 */
  latest: DivinationRecord;
}

export interface DrawnMarks {
  poems: Map<number, DrawnMark>;
  hexagrams: Map<number, DrawnMark>;
  lingqi: Map<string, DrawnMark>;
}

function tally<K>(map: Map<K, DrawnMark>, key: K, record: DivinationRecord) {
  const prev = map.get(key);
  if (!prev) { map.set(key, { count: 1, latest: record }); return; }
  prev.count += 1;
  if (record.timestamp > prev.latest.timestamp) prev.latest = record;
}

export function drawnMarks(history: readonly DivinationRecord[]): DrawnMarks {
  const marks: DrawnMarks = { poems: new Map(), hexagrams: new Map(), lingqi: new Map() };
  for (const r of history) {
    // 備份還原可能帶進損毀資料：時間不是有限數字的記錄比不出「最近」，不收
    if (!r || !Number.isFinite(r.timestamp)) continue;
    if (r.mode === 'lingqi') {
      if (typeof r.lingqiKey === 'string' && r.lingqiKey) tally(marks.lingqi, r.lingqiKey, r);
      continue;
    }
    if (!Number.isInteger(r.poemId) || r.poemId < 1 || r.poemId > 64) continue;
    tally(marks.poems, r.poemId, r);
    if (!isLegacyRecord(r)) tally(marks.hexagrams, r.poemId, r);
  }
  return marks;
}
