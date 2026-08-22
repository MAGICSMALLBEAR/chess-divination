// 雲端同步：每個使用者以裝置端安全保存的配對碼隔離資料。
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getHistory, getFavorites, getSettings, STORAGE_KEYS, type AppSettings, type DivinationRecord } from './storage';

// Web 端與部署同源，相對路徑即可；原生 fetch 不吃相對 URL，
// 必須用絕對網址——預設值若維持 '/api/sync'，原生 build 的同步必掛。
const SYNC_URL = process.env.EXPO_PUBLIC_CLOUD_SYNC_URL
  || (Platform.OS === 'web'
    ? '/api/sync'
    : 'https://chess-divination-app.vercel.app/api/sync');
const SYNC_KEY = 'chess-divination.sync-key.v1';
const WEB_SYNC_KEY = '@chess_divination_sync_key';
const HISTORY_LIMIT = 500;
const DELETED_IDS_LIMIT = 1000;

export interface CloudPayload {
  version: 2;
  timestamp: number;
  history: unknown[];
  favorites: unknown[];
  settings: unknown;
  dailyFortune: unknown;
  /** 使用者刪除過的記錄 id（墓碑）。合併時套用，確保刪除不會在同步後復活 */
  deletedIds?: string[];
}
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
// 首次同步連點時，兩條流程各自生成不同配對碼、各自寫入（後寫者勝）→
// 其中一份資料永遠孤兒化。用單一 in-flight promise 讓並行呼叫共用結果。
let keyPromise: Promise<string> | null = null;
export function ensureSyncKey(): Promise<string> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const existing = await getSyncKey();
      if (existing) return existing;
      const key = await createSyncKey();
      await writeStoredSyncKey(key);
      return key;
    })().finally(() => { keyPromise = null; });
  }
  return keyPromise;
}

export async function buildCloudPayload(): Promise<CloudPayload> {
  const [history, favorites, settings, dailyRaw, deletedRaw] = await Promise.all([
    getHistory(), getFavorites(), getSettings(),
    AsyncStorage.getItem(STORAGE_KEYS.DAILY_FORTUNE),
    AsyncStorage.getItem(STORAGE_KEYS.DELETED),
  ]);
  let dailyFortune: unknown = null;
  try { dailyFortune = dailyRaw ? JSON.parse(dailyRaw) : null; } catch { /* 由同步時略過損毀資料 */ }
  let deletedIds: string[] = [];
  try { deletedIds = deletedRaw ? JSON.parse(deletedRaw) : []; } catch { /* 同上 */ }
  if (!Array.isArray(deletedIds)) deletedIds = [];
  return { version: 2, timestamp: Date.now(), history, favorites, settings, dailyFortune, deletedIds };
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
/** 同 id 衝突時選哪一版：有占驗結果者勝（都有的話取較新的 verifiedAt）。
 *  舊邏輯「先出現者優先」會用未回填的本地副本壓掉雲端已回填的結果，
 *  換機後那筆占驗就永久遺失。 */
function preferRecord(a: SyncRecord, b: SyncRecord): SyncRecord {
  const ao = (a as Partial<DivinationRecord>).outcome;
  const bo = (b as Partial<DivinationRecord>).outcome;
  if (ao && !bo) return a;
  if (bo && !ao) return b;
  if (ao && bo) return (ao.verifiedAt ?? 0) >= (bo.verifiedAt ?? 0) ? a : b;
  return a; // 兩者皆未回填：維持先出現者優先（本地勝出）
}

export function mergeHistories(local: unknown, cloud: unknown): SyncRecord[] {
  const localArr = (Array.isArray(local) ? local : []).filter(isSyncRecord);
  const cloudArr = (Array.isArray(cloud) ? cloud : []).filter(isSyncRecord);
  const localIds = new Set(localArr.map(r => r.id));

  const resolved = new Map<string, SyncRecord>();
  for (const r of [...localArr, ...cloudArr]) {
    const prev = resolved.get(r.id);
    resolved.set(r.id, prev ? preferRecord(prev, r) : r);
  }

  const all = [...resolved.values()].sort((a, b) => b.timestamp - a.timestamp);
  if (all.length <= HISTORY_LIMIT) return all;

  // 截斷時絕不丟「僅本地存在」的記錄——那等於同步動作本身摧毀
  // 這台裝置尚未上傳過的歷史。超限時只犧牲最舊的雲端端共有記錄
  // （另一端仍保有，下次同步會補回）。
  const localOnly = all.filter(r => localIds.has(r.id));
  const rest = all.filter(r => !localIds.has(r.id));
  return [...localOnly, ...rest].slice(0, HISTORY_LIMIT);
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
/** 每日運勢取日期較新的一份。舊邏輯 local 優先——本機存著昨天的運勢時，
 *  會用舊資料覆蓋雲端今天已起的卦，兩台裝置當日運勢不一致。 */
function pickDailyFortune(local: unknown, cloud: unknown): unknown {
  const ld = (local as { date?: unknown } | null)?.date;
  const cd = (cloud as { date?: unknown } | null)?.date;
  const lds = typeof ld === 'string' ? ld : '';
  const cds = typeof cd === 'string' ? cd : '';
  if (!cds) return local ?? null;
  if (!lds) return cloud;
  return cds >= lds ? cloud : local; // date 為 YYYY-MM-DD，字串比較即日期比較
}

/** 合併所有持久化資料；收藏由歷史記錄重建，避免兩份副本不一致。 */
export async function mergeFromCloud(data: CloudPayload): Promise<CloudPayload> {
  const local = await buildCloudPayload();

  // 墓碑：本地與雲端的刪除集合聯集後統一套用。
  // 沒有這一步，使用者刪掉的記錄會在下一次同步時全部復活。
  const deletedIds = [...new Set([...(local.deletedIds ?? []), ...(data.deletedIds ?? [])])]
    .slice(-DELETED_IDS_LIMIT);
  const deletedSet = new Set(deletedIds);

  const mergedHistory = mergeHistories(local.history, data.history) as DivinationRecord[];
  const history = mergedHistory.filter(r => !deletedSet.has(r.id));
  const favoriteIds = new Set([
    ...history.filter(r => r.isFavorited).map(r => r.id),
    ...mergeHistories(local.favorites, data.favorites).map(r => r.id),
  ]);
  const normalizedHistory = history.map(r => ({ ...r, isFavorited: favoriteIds.has(r.id) }));
  const merged: CloudPayload = {
    version: 2,
    timestamp: Date.now(),
    history: normalizedHistory,
    favorites: normalizedHistory.filter(r => r.isFavorited),
    settings: mergeSettings(local.settings as AppSettings, data.settings),
    dailyFortune: pickDailyFortune(local.dailyFortune, data.dailyFortune),
    deletedIds,
  };
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(merged.history)),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(merged.favorites)),
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged.settings)),
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_FORTUNE, JSON.stringify(merged.dailyFortune)),
    AsyncStorage.setItem(STORAGE_KEYS.DELETED, JSON.stringify(merged.deletedIds)),
  ]);
  return merged;
}
/** 下載 → 合併 → 回寫，先取得另一台裝置資料才不會覆蓋它。 */
export async function syncWithCloud(): Promise<'ok' | 'error'> {
  const cloud = await downloadFromCloud();
  const payload = cloud ? await mergeFromCloud(cloud) : await buildCloudPayload();
  return (await uploadToCloud(payload)) ? 'ok' : 'error';
}
