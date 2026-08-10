// 雲端同步服務
// 將占卜記錄與設定備份到遠端 JSON API，支援手動上傳與下載。
// 預設端點可透過環境變數設定，適合與自建後端或 Firebase 配合使用。
//
// 使用方式：
//   const ok = await uploadToCloud();
//   const data = await downloadFromCloud();
//
// 環境變數：
//   CLOUD_SYNC_URL   同步 API 端點（POST 上傳、GET 下載）

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory, getSettings } from './storage';

const HISTORY_KEY = '@chess_divination_history';

const SYNC_URL = process.env.EXPO_PUBLIC_CLOUD_SYNC_URL || '';

export interface CloudPayload {
  version: number;
  timestamp: number;
  history: unknown[];
  settings: unknown;
}

/** 上傳資料到雲端 */
export async function uploadToCloud(): Promise<boolean> {
  if (!SYNC_URL) {
    console.log('雲端同步：未設定 CLOUD_SYNC_URL，跳過上傳');
    return false;
  }

  try {
    const [history, settings] = await Promise.all([getHistory(), getSettings()]);

    const payload: CloudPayload = {
      version: 1,
      timestamp: Date.now(),
      history,
      settings,
    };

    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (e) {
    console.warn('雲端同步上傳失敗:', e);
    return false;
  }
}

/** 從雲端下載資料 */
export async function downloadFromCloud(): Promise<CloudPayload | null> {
  if (!SYNC_URL) {
    console.log('雲端同步：未設定 CLOUD_SYNC_URL，跳過下載');
    return null;
  }

  try {
    const response = await fetch(SYNC_URL);
    if (!response.ok) return null;

    const data: CloudPayload = await response.json();
    return data;
  } catch (e) {
    console.warn('雲端同步下載失敗:', e);
    return null;
  }
}

/** 合併所需的最小記錄形狀（去重靠 id、排序靠 timestamp） */
interface SyncRecord { id: string; timestamp: number; }

/** 與 storage.ts 的歷史上限一致 */
const HISTORY_LIMIT = 500;

/** 只有具備 id 與 timestamp 的物件才是可合併的記錄 */
function isSyncRecord(v: unknown): v is SyncRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<SyncRecord>;
  return typeof r.id === 'string' && typeof r.timestamp === 'number';
}

/**
 * 合併本地與雲端的歷史記錄。
 *
 * 抽為純函式以便測試——這段邏輯出錯就是使用者的占卜記錄被覆蓋或遺失。
 * 規則：以 id 去重（本地優先，不覆寫既有記錄）、依時間新到舊排序、
 * 截斷至與本地儲存相同的上限。形狀不符的項目一律丟棄，
 * 避免遠端傳回的任意內容混進歷史。
 */
export function mergeHistories(local: unknown, cloud: unknown): SyncRecord[] {
  const localList = (Array.isArray(local) ? local : []).filter(isSyncRecord);
  const cloudList = (Array.isArray(cloud) ? cloud : []).filter(isSyncRecord);

  const seen = new Set(localList.map((r) => r.id));
  const merged = [...localList];
  for (const record of cloudList) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      merged.push(record);
    }
  }

  merged.sort((a, b) => b.timestamp - a.timestamp);
  return merged.slice(0, HISTORY_LIMIT);
}

/** 合併雲端資料到本地（保留兩邊的記錄，本地優先） */
export async function mergeFromCloud(data: CloudPayload): Promise<void> {
  const localRaw = await AsyncStorage.getItem(HISTORY_KEY);

  let local: unknown = [];
  if (localRaw) {
    try {
      local = JSON.parse(localRaw);
    } catch {
      // 本地資料毀損：當成空的來合併，總比讓整次同步失敗好
      console.warn('雲端同步：本地歷史解析失敗，改以雲端資料為準');
    }
  }

  const merged = mergeHistories(local, data.history);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
}
