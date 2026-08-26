// 分享截圖的成品檢查
//
// 為什麼需要這個模組：`react-native-view-shot` 截不到圖時會 reject，
// 那條路呼叫端接得到、也已經有文字分享的降級鏈。真正沒人守著的是
// **截得到、但內容是空的**——promise 正常 resolve、回傳一個看似正常的
// URI，使用者卻分享出去一張空白圖，而我們完全不會知道。
//
// 這個風險不是憑空想的：iOS 端走的是
// `[view drawViewHierarchyInRect:… afterScreenUpdates:YES]`
// （node_modules/react-native-view-shot/ios/RNViewShot.mm:151），
// 也就是「照著螢幕上看到的樣子重畫一次」。離屏、被遮住、或祖先 alpha
// 為 0 的子樹在這個 API 下截出空白是有回報的行為。我們手上沒有實機，
// 無法斷定哪一種觸發得了——所以不去猜，改成量成品。
//
// 量什麼：分享卡是 400×680、有不透明的宣紙底、金色橫條、標題、四行
// 詩句與 SVG 紙紋，在任何 scale 下 PNG 都壓不到 4KB 以下；反過來說，
// 全透明或單色的 1200×2040 PNG 只有 1–3KB。兩者差一個數量級以上，
// 門檻不需要精準。判定失敗就回傳 false，讓 reveal.tsx 走既有的
// 文字分享降級鏈——最差的結果是「分享到文字」，不是「分享到空白」。

import { File } from 'expo-file-system';

/**
 * 低於這個位元組數就當作截圖失敗。
 *
 * 取 4KB 是刻意留了一個數量級的餘裕：真卡片遠在其上（數十至數百 KB），
 * 空白圖遠在其下。門檻抓太緊會把正常的卡片誤判成空白（後果是使用者
 * 拿到文字分享，可惜但無害）；抓太鬆則失去意義。
 */
export const MIN_PLAUSIBLE_CAPTURE_BYTES = 4096;

/**
 * base64 資料 URI 解碼後的位元組數。不是 base64 資料 URI 就回傳 null。
 *
 * Web 端的 view-shot 沒有暫存檔可言，`capture()` 直接回傳 data URI
 * （node_modules/react-native-view-shot/src/RNViewShot.web.ts），
 * 所以這一支就是 web 的量法，不需要碰檔案系統。
 */
export function dataUriByteLength(uri: string): number | null {
  if (!uri.startsWith('data:')) return null;
  const marker = ';base64,';
  const at = uri.indexOf(marker);
  if (at === -1) return null;

  // 只算長度，不切出子字串——這個字串可能有數百 KB
  const chars = uri.length - at - marker.length;
  const padding = uri.endsWith('==') ? 2 : uri.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((chars * 3) / 4) - padding);
}

/**
 * 截圖成品的位元組數；**無法判斷時回傳 null**。
 *
 * null 與 0 的分別很重要：0 是「量到了，而且是空的」（檔案不存在或
 * 讀不到，`File.size` 就是 0），null 是「這個 URI 形式我不認得，
 * 沒有立場說它壞」。後者一律放行，見 isPlausibleCapture。
 */
export function captureByteLength(uri: string): number | null {
  const inline = dataUriByteLength(uri);
  if (inline !== null) return inline;

  if (!uri.startsWith('file://')) return null;
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
}

/** 只擋「明確太小」的成品；量不到大小時不擋，這道防線不該自己變成故障點 */
export function isPlausibleCapture(bytes: number | null): boolean {
  return bytes === null || bytes >= MIN_PLAUSIBLE_CAPTURE_BYTES;
}
