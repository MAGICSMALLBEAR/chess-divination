// 跨平台對話框（Web 版）。設計說明見 dialog.ts。
//
// 用瀏覽器原生的 alert / confirm 而不自製 Modal：這些是刪除與還原的最後一道
// 確認，行為必須絕對可靠。自製 Modal 會多出「元件沒掛載到、被 z-index 蓋住、
// 動畫還沒結束就被卸載」等失敗模式，而這一層一旦失效就是靜默資料遺失——
// 正是這次要修掉的問題本身。
// 型別在此重新宣告而非從 dialog.ts 匯入：平台分檔一律互不引用
// （sound / useFontLoad 同此慣例），免得任何一端把另一端的相依拉進 bundle。
// 兩邊的形狀由 dialog.test.ts 對照守門。
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

/** 瀏覽器對話框只吃單一字串，標題與說明以空行相接 */
function joinText(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

export function notify(title: string, message?: string): void {
  // 靜態匯出的預渲染階段沒有 window；那時也不會有使用者操作，直接略過
  if (typeof window === 'undefined') return;
  window.alert(joinText(title, message));
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // 沒有 window 時回 false：確認框問的都是刪除、清空、覆蓋這類動作，
  // 拿不到使用者的答覆就當作沒有同意
  if (typeof window === 'undefined') return Promise.resolve(false);
  return Promise.resolve(window.confirm(joinText(options.title, options.message)));
}
