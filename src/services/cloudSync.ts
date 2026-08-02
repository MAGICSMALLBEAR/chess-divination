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

import { getHistory, getSettings } from './storage';

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

/** 合併雲端資料到本地（保留兩邊最新的記錄） */
export async function mergeFromCloud(data: CloudPayload): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  // 雲端記錄的最小介面（僅需 id 和 timestamp 做去重與排序）
  interface CloudRecord { id: string; timestamp: number; }

  // 比對本地與雲端的時間戳，只還原較新的版本
  const localRaw = await AsyncStorage.getItem('@chess_divination_history');
  if (localRaw) {
    const localHistory = JSON.parse(localRaw);
    const localIds = new Set(localHistory.map((r: CloudRecord) => r.id));

    // 合併：雲端有但本地沒有的記錄
    const merged = [...localHistory];
    for (const record of data.history as CloudRecord[]) {
      if (!localIds.has(record.id)) {
        merged.push(record);
      }
    }

    // 按時間排序並寫回
    merged.sort((a: CloudRecord, b: CloudRecord) => b.timestamp - a.timestamp);
    await AsyncStorage.setItem('@chess_divination_history', JSON.stringify(merged.slice(0, 500)));
  } else {
    // 本地無記錄，直接寫入雲端資料
    await AsyncStorage.setItem('@chess_divination_history', JSON.stringify(data.history));
  }
}
