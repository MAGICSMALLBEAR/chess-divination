// 備份還原服務
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { toLocalDateString } from './date';

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

export async function backupData(): Promise<string | null> {
  try {
    const json = JSON.stringify(await buildBackup(), null, 2);

    // Web: download as file
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chess-divination-backup-${toLocalDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return 'downloaded';
    }

    // 原生：複製到剪貼簿。之前這裡只回傳字串而沒有任何實際動作，
    // 設定頁卻因為 truthy 回傳值提示「備份成功」——使用者以為有備份，
    // 其實什麼都沒產生。
    await Clipboard.setStringAsync(json);
    return 'copied';
  } catch (e) {
    console.warn('備份失敗:', e);
    return null;
  }
}

export async function restoreData(): Promise<boolean> {
  // Web: prompt for file
  if (typeof document === 'undefined') {
    // Native would use DocumentPicker
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    // 使用者按取消時不會觸發 change，Promise 會一直懸著。
    // 監聽 cancel（支援的瀏覽器）讓流程能收尾。
    input.oncancel = () => resolve(false);

    input.onchange = (e: Event) => {
      // 這裡刻意不是 async 函式：回呼內若拋錯，沒有人 catch，
      // resolve 不會被呼叫，還原流程就永遠不會結束。
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(false); return; }

      file.text()
        .then(async (text) => {
          const restorable = parseBackup(text);
          if (!restorable) { resolve(false); return; }
          await applyBackup(restorable);
          resolve(true);
        })
        .catch((err) => {
          console.warn('還原失敗:', err);
          resolve(false);
        });
    };

    input.click();
  });
}
