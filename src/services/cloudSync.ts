// 雲端同步：每個使用者以裝置端安全保存的配對碼隔離資料。
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getHistory, getFavorites, getSettings, STORAGE_KEYS, type AppSettings, type DivinationRecord } from './storage';

const SYNC_URL = process.env.EXPO_PUBLIC_CLOUD_SYNC_URL || '/api/sync';
const SYNC_KEY = 'chess-divination.sync-key.v1';
const WEB_SYNC_KEY = '@chess_divination_sync_key';
const HISTORY_LIMIT = 500;

export interface CloudPayload { version: 2; timestamp: number; history: unknown[]; favorites: unknown[]; settings: unknown; dailyFortune: unknown; }
interface SyncRecord { id: string; timestamp: number; isFavorited?: boolean; }

function isSyncRecord(v: unknown): v is SyncRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<SyncRecord>;
  return typeof r.id === 'string' && typeof r.timestamp === 'number';
}

/** 產生 192-bit 配對碼；遺失後不可從伺服器找回。 */
export async function createSyncKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SecureStore 沒有 Web implementation；Web 以 AsyncStorage 保存配對碼，原生維持 Keychain/Keystore。 */
async function readStoredSyncKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(WEB_SYNC_KEY);
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  return SecureStore.getItemAsync(SYNC_KEY);
}
async function writeStoredSyncKey(key: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.setItem(WEB_SYNC_KEY, key); return; }
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  await SecureStore.setItemAsync(SYNC_KEY, key);
}
export async function getSyncKey(): Promise<string | null> { return readStoredSyncKey(); }
export async function saveSyncKey(key: string): Promise<boolean> {
  const normalized = key.trim().toLowerCase();
  if (!/^[a-f0-9]{48}$/.test(normalized)) return false;
  await writeStoredSyncKey(normalized);
  return true;
}
export async function ensureSyncKey(): Promise<string> {
  const existing = await getSyncKey();
  if (existing) return existing;
  const key = await createSyncKey();
  await writeStoredSyncKey(key);
  return key;
}

export async function buildCloudPayload(): Promise<CloudPayload> {
  const [history, favorites, settings, dailyRaw] = await Promise.all([
    getHistory(), getFavorites(), getSettings(), AsyncStorage.getItem(STORAGE_KEYS.DAILY_FORTUNE),
  ]);
  let dailyFortune: unknown = null;
  try { dailyFortune = dailyRaw ? JSON.parse(dailyRaw) : null; } catch { /* 由同步時略過損毀資料 */ }
  return { version: 2, timestamp: Date.now(), history, favorites, settings, dailyFortune };
}
async function request(method: 'GET' | 'PUT', payload?: CloudPayload): Promise<Response> {
  return fetch(SYNC_URL, { method, headers: { 'Content-Type': 'application/json', 'X-Sync-Key': await ensureSyncKey() }, body: payload ? JSON.stringify(payload) : undefined });
}
export async function uploadToCloud(payload?: CloudPayload): Promise<boolean> {
  const resolvedPayload = payload || await buildCloudPayload();
  try { return (await request('PUT', resolvedPayload)).ok; } catch (e) { console.warn('雲端同步上傳失敗:', e); return false; }
}
export async function downloadFromCloud(): Promise<CloudPayload | null> {
  try { const r = await request('GET'); if (r.status === 404 || !r.ok) return null; const data: unknown = await r.json(); return isCloudPayload(data) ? data : null; }
  catch (e) { console.warn('雲端同步下載失敗:', e); return null; }
}
function isCloudPayload(value: unknown): value is CloudPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<CloudPayload>;
  return Array.isArray(p.history) && Array.isArray(p.favorites) && !!p.settings;
}
export function mergeHistories(local: unknown, cloud: unknown): SyncRecord[] {
  const seen = new Set<string>();
  return [...(Array.isArray(local) ? local : []), ...(Array.isArray(cloud) ? cloud : [])]
    .filter(isSyncRecord).filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => b.timestamp - a.timestamp).slice(0, HISTORY_LIMIT);
}
function mergeSettings(local: AppSettings, cloud: unknown): AppSettings {
  if (!cloud || typeof cloud !== 'object') return local;
  const remote = cloud as Partial<AppSettings>;
  const unique = <T extends { id?: string; key?: string }>(items: T[], field: 'id' | 'key') => items.filter((v, i, a) => a.findIndex(x => x[field] === v[field]) === i);
  return { ...remote, ...local,
    customCategories: unique([...(remote.customCategories || []), ...(local.customCategories || [])], 'key'),
    folders: unique([...(remote.folders || []), ...(local.folders || [])], 'id'),
    usageDates: [...new Set([...(remote.usageDates || []), ...(local.usageDates || [])])],
    unlockedAchievements: [...new Set([...(remote.unlockedAchievements || []), ...(local.unlockedAchievements || [])])],
  };
}
/** 合併所有持久化資料；收藏由歷史記錄重建，避免兩份副本不一致。 */
export async function mergeFromCloud(data: CloudPayload): Promise<CloudPayload> {
  const local = await buildCloudPayload();
  const history = mergeHistories(local.history, data.history) as DivinationRecord[];
  const favoriteIds = new Set([...history.filter(r => r.isFavorited).map(r => r.id), ...mergeHistories(local.favorites, data.favorites).map(r => r.id)]);
  const normalizedHistory = history.map(r => ({ ...r, isFavorited: favoriteIds.has(r.id) }));
  const merged: CloudPayload = { version: 2, timestamp: Date.now(), history: normalizedHistory, favorites: normalizedHistory.filter(r => r.isFavorited), settings: mergeSettings(local.settings as AppSettings, data.settings), dailyFortune: local.dailyFortune || data.dailyFortune || null };
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(merged.history)),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(merged.favorites)),
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged.settings)),
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_FORTUNE, JSON.stringify(merged.dailyFortune)),
  ]);
  return merged;
}
/** 下載 → 合併 → 回寫，先取得另一台裝置資料才不會覆蓋它。 */
export async function syncWithCloud(): Promise<'ok' | 'error'> {
  const cloud = await downloadFromCloud();
  const payload = cloud ? await mergeFromCloud(cloud) : await buildCloudPayload();
  return (await uploadToCloud(payload)) ? 'ok' : 'error';
}
