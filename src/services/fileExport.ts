// 把一段文字交給使用者成為一個檔案：Web 直接下載，原生交給系統分享表單，
// 分享不可用時退到剪貼簿。備份（JSON）與記錄匯出（CSV）共用這一條路——
// 三個通道的取捨只該有一份，改一邊忘另一邊的症狀是某一種匯出在某平台悄悄失效。
import * as Clipboard from 'expo-clipboard';

/** 檔案去了哪裡——三者下一步要做的事不同（已落硬碟／已交給系統表單／還得自己貼） */
export type ExportChannel = 'downloaded' | 'shared' | 'copied';

export interface TextFile {
  fileName: string;
  content: string;
  mimeType: string;
  /** iOS 分享表單認檔案類型用 */
  uti: string;
  dialogTitle: string;
}

/**
 * 原生端：寫進 cache 再交給系統分享表單。用 cache 而非 document 目錄——
 * 這份檔案的歸宿是使用者選的位置（檔案 App、雲端硬碟、傳給自己），留在 App 內部只是中繼。
 */
async function shareFile(file: TextFile): Promise<boolean> {
  try {
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;

    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const out = new File(Paths.cache, file.fileName);
    out.create({ overwrite: true });
    out.write(file.content);

    await Sharing.shareAsync(out.uri, {
      mimeType: file.mimeType,
      UTI: file.uti,
      dialogTitle: file.dialogTitle,
    });
    return true;
  } catch (e) {
    console.warn('檔案分享失敗，改用剪貼簿:', e);
    return false;
  }
}

/** 失敗（連剪貼簿都寫不進去）時丟出，由呼叫端決定怎麼說 */
export async function deliverTextFile(file: TextFile): Promise<ExportChannel> {
  if (typeof document !== 'undefined') {
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  if (await shareFile(file)) return 'shared';
  // 分享不可用（模擬器、部分 Android ROM）時的保底通道
  await Clipboard.setStringAsync(file.content);
  return 'copied';
}
