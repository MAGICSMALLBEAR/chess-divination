// 備份還原服務
//
// 兩個平台的通道不同，但檔案格式完全一致——web 匯出的 .json 可以在手機
// 還原，反之亦然（換機、跨平台搬家都靠這條）。
//   web    ：<a download> 匯出　／　<input type=file> 匯入
//   原生   ：寫進 cache 後用系統分享表單送出（存到「檔案」App／雲端硬碟）
//            ／　DocumentPicker 選檔匯入
// 原生端的分享與選檔任一不可用時，退回剪貼簿（純文字，總是能用）。
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { toLocalDateString } from './date';
import { t } from './i18n';

const BACKUP_KEYS = [
  '@chess_divination_history',
  '@chess_divination_favorites',
  '@chess_divination_settings',
  // 墓碑也要備份：還原後雲端同步才不會把已刪的記錄復活
  '@chess_divination_deleted',
] as const;

const BACKUP_VERSION = 1;

export interface BackupFile {
  version: number;
  date: string;
  data: Record<string, unknown>;
}

/** 把目前的資料整理成備份檔內容 */
export async function buildBackup(): Promise<BackupFile> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = await AsyncStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : null;
  }
  return { version: BACKUP_VERSION, date: new Date().toISOString(), data };
}

/**
 * 解析備份檔內容並驗證結構。
 *
 * 抽為純函式的原因：原本的還原流程把 JSON.parse 直接寫在檔案讀取的
 * async 回呼裡，格式不對時整個 Promise 永遠不會 resolve——
 * 使用者選到錯檔案後畫面沒有任何回饋，只是靜靜卡住。
 *
 * @returns 可還原的鍵值對；格式不符時回傳 null
 */
export function parseBackup(json: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const file = parsed as Partial<BackupFile>;
  if (!file.data || typeof file.data !== 'object' || Array.isArray(file.data)) return null;

  // 只取本 App 認得的鍵，避免把備份檔裡的任意內容寫進儲存
  const restorable: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    if (file.data[key] !== undefined) restorable[key] = file.data[key];
  }

  // 一個認得的鍵都沒有，視為不是本 App 的備份檔
  return Object.keys(restorable).length > 0 ? restorable : null;
}

/** 將解析後的備份寫回儲存 */
export async function applyBackup(restorable: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(restorable)) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
}

/** 備份檔名（兩個平台共用，日期用當地時區） */
function backupFileName(): string {
  return `chess-divination-backup-${toLocalDateString()}.json`;
}

/**
 * 原生端：把備份寫進 cache 再交給系統分享表單。
 *
 * 用 cache 而非 document 目錄——這份檔案的歸宿是使用者選的位置
 * （檔案 App、雲端硬碟、傳給自己），留在 App 內部只是中繼，
 * 系統要回收空間時可以清掉。
 *
 * @returns 成功分享回傳 true；分享不可用或失敗回傳 false（由呼叫端退回剪貼簿）
 */
async function shareBackupFile(json: string): Promise<boolean> {
  try {
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;

    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const file = new File(Paths.cache, backupFileName());
    file.create({ overwrite: true });
    file.write(json);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: t('settings.backup'),
    });
    return true;
  } catch (e) {
    console.warn('備份分享失敗，改用剪貼簿:', e);
    return false;
  }
}

/**
 * 產生備份。
 *
 * @returns 'downloaded'（web 下載）／'shared'（原生分享表單）／
 *          'copied'（原生退回剪貼簿）／null（失敗）。
 *          設定頁依此顯示對應的後續指示——三者要做的事完全不同。
 */
export async function backupData(): Promise<'downloaded' | 'shared' | 'copied' | null> {
  try {
    const json = JSON.stringify(await buildBackup(), null, 2);

    // Web: download as file
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      URL.revokeObjectURL(url);
      return 'downloaded';
    }

    // 原生：優先產出真正的檔案（可存到雲端、可跨裝置搬家）。
    // 之前這裡只回傳字串而沒有任何實際動作，設定頁卻因為 truthy 回傳值
    // 提示「備份成功」——使用者以為有備份，其實什麼都沒產生。
    if (await shareBackupFile(json)) return 'shared';

    // 分享不可用（模擬器、部分 Android ROM）時的保底通道
    await Clipboard.setStringAsync(json);
    return 'copied';
  } catch (e) {
    console.warn('備份失敗:', e);
    return null;
  }
}

/**
 * 原生端：開選檔器，回傳使用者選的檔案 URI。使用者取消回傳 null。
 *
 * 只包住選檔器本身，不含讀檔——兩者的失敗意義完全不同，
 * 混在同一個 try 裡會讓「檔案讀不出來」被誤判成「選檔器不可用」。
 */
async function pickBackupUri(): Promise<string | null> {
  const DocumentPicker = require('expo-document-picker') as typeof import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    // 有些檔案來源不會標 application/json（例如從聊天軟體存下來的），
    // 放寬到全部再由 parseBackup 把關內容——擋在型別這一關只會讓
    // 使用者看著自己的備份檔卻選不到。
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
}

async function readFileText(uri: string): Promise<string> {
  const { File } = require('expo-file-system') as typeof import('expo-file-system');
  return await new File(uri).text();
}

/** 把一段文字當備份檔套用 */
async function applyBackupText(text: string): Promise<RestoreResult> {
  const restorable = parseBackup(text);
  if (!restorable) return 'invalid';
  await applyBackup(restorable);
  return 'ok';
}

/**
 * 還原結果。
 *
 * 'canceled' 必須與 'invalid' 分開：使用者在選檔器按取消是正常操作，
 * 卻跳「還原失敗」等於把自己的動作說成錯誤——選檔器一取消就報錯，
 * 使用者只會以為 App 壞了。
 */
export type RestoreResult = 'ok' | 'canceled' | 'invalid' | 'error';

/**
 * 還原備份。
 *
 * 原生端先走選檔；選檔管道整個不可用時（模組缺失）才讀剪貼簿——
 * 使用者主動取消不會觸發後備，取消就是取消。
 */
export async function restoreData(): Promise<RestoreResult> {
  if (typeof document === 'undefined') {
    let uri: string | null;
    try {
      uri = await pickBackupUri();
    } catch (e) {
      // 只有選檔管道本身不可用才退回剪貼簿
      console.warn('選檔還原不可用，改讀剪貼簿:', e);
      try {
        return await applyBackupText(await Clipboard.getStringAsync());
      } catch (err) {
        console.warn('讀取剪貼簿失敗:', err);
        return 'error';
      }
    }
    if (uri === null) return 'canceled';

    // 檔案選到了卻讀不出來是「讀取失敗」，不是「選錯檔」。
    // 這裡再退回剪貼簿等於拿一份無關內容當作使用者的意圖。
    let text: string;
    try {
      text = await readFileText(uri);
    } catch (e) {
      console.warn('讀取備份檔失敗:', e);
      return 'error';
    }
    return applyBackupText(text);
  }

  return new Promise<RestoreResult>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    // 使用者按取消時不會觸發 change，Promise 會一直懸著。
    // 監聽 cancel（支援的瀏覽器）讓流程能收尾。
    input.oncancel = () => resolve('canceled');

    input.onchange = (e: Event) => {
      // 這裡刻意不是 async 函式：回呼內若拋錯，沒有人 catch，
      // resolve 不會被呼叫，還原流程就永遠不會結束。
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve('canceled'); return; }

      file.text()
        .then(async (text) => {
          const restorable = parseBackup(text);
          if (!restorable) { resolve('invalid'); return; }
          await applyBackup(restorable);
          resolve('ok');
        })
        .catch((err) => {
          console.warn('還原失敗:', err);
          resolve('error');
        });
    };

    input.click();
  });
}
