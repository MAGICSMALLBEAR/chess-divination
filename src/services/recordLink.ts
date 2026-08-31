// 一筆占卜記錄該用哪個畫面打開。
//
// 抽棋與棋盤都走 reveal 頁，那頁整套（籤詩卡、六爻盤、AI 解讀）都建立在
// 六十四卦之上；靈棋走的是《靈棋經》125 卦目，poemId 恆為 0，交給 reveal
// 只會讓 getPoemById 的 fallback 把每一筆都顯示成籤詩 #1。
//
// 集中在此而非在各畫面各寫一次三元式：首頁、收藏卡、資料夾三處都要開記錄，
// 漏改任何一處的症狀都是「點進去看到別人的籤」，而且測試不容易掃到。

import type { DivinationMode } from './storage';

export interface RecordLink {
  pathname: '/reveal' | '/lingqi';
  params: { recordId: string; mode: DivinationMode };
}

export function recordLink(record: { id: string; mode: DivinationMode }): RecordLink {
  return {
    pathname: record.mode === 'lingqi' ? '/lingqi' : '/reveal',
    params: { recordId: record.id, mode: record.mode },
  };
}
