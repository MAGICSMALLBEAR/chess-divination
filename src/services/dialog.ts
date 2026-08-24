// 跨平台對話框（原生版）。
//
// 為什麼需要這一層：`Alert` 在 react-native-web 是個空殼——
// `class Alert { static alert() {} }`，呼叫它什麼都不會發生。線上 PWA 因此
// 有一整批動作是死的：還原備份、刪除記錄、清空歷史、刪除資料夾與自訂類別、
// 棋盤的返回確認，按下去毫無反應也沒有任何訊息。有確認對話框的更糟——
// `onPress` 永遠不會被呼叫，等於整個功能不存在。
//
// reveal.tsx 早就改用 window.confirm 繞開這件事，但其餘畫面沒跟上。
// 與其在每個呼叫端各寫一次平台判斷，收成 sound / useFontLoad 那樣的
// 平台分檔（`X.ts` 原生、`X.web.ts` web）。
//
// 回傳 Promise 而非 callback：`Alert.alert` 是 callback、`window.confirm`
// 是同步回傳，Promise 是唯一能同時包住兩者的形狀。
import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 確認鈕文字，由呼叫端給已翻譯字串 */
  confirmLabel: string;
  cancelLabel: string;
  /** 破壞性操作（刪除、清空）在 iOS 會顯示紅字 */
  destructive?: boolean;
}

/** 純告知，沒有選擇 */
export function notify(title: string, message?: string): void {
  Alert.alert(title, message);
}

/** @returns 使用者按下確認為 true；取消或關閉為 false */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel,
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      // Android 可以用返回鍵／點外面關掉對話框，兩者都不會觸發任何 onPress。
      // 少了這個，Promise 會永遠懸著，呼叫端的 await 之後全部不會執行。
      { onDismiss: () => resolve(false) },
    );
  });
}
