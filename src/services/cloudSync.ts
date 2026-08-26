// 雲端同步：每個使用者以裝置端安全保存的配對碼隔離資料。
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getHistory, getFavorites, getSettings, STORAGE_KEYS, type AppSettings, type CustomCategory, type DivinationRecord, type Folder } from './storage';

// Web 端與部署同源，相對路徑即可；原生 fetch 不吃相對 URL，
// 必須用絕對網址——預設值若維持 '/api/sync'，原生 build 的同步必掛。
const SYNC_URL = process.env.EXPO_PUBLIC_CLOUD_SYNC_URL
  || (Platform.OS === 'web'
    ? '/api/sync'
    : 'https://chess-divination-app.vercel.app/api/sync');
const SYNC_KEY = 'chess-divination.sync-key.v1';
const WEB_SYNC_KEY = '@chess_divination_sync_key';
const HISTORY_LIMIT = 500;
/**
 * 雲端保存的記錄上限，刻意高於單機的 500。
 *
 * 兩台裝置都滿 500 筆時，雲端若也只存 500，每次 PUT 都用自己那份整個取代
 * 雲端——雲端從不持有聯集，兩台永遠來回覆蓋，誰都拿不到對方的記錄。
 * 讓雲端存得下聯集，這條來回覆蓋的迴圈才會停。
 *
 * 上限取 1000 是對著 payload 大小定的：單筆記錄實測約 440–610 bytes，
 * 1000 筆約 500KB，在伺服器端 MAX_BODY_BYTES（1MB）之內；
 * 同時 v3 payload 不再重複夾帶 favorites，省下的正是這一半空間。
 */
const CLOUD_HISTORY_LIMIT = 1000;
const DELETED_IDS_LIMIT = 1000;
/** 資料夾／類別墓碑上限，與 storage.ts 的 DELETED_KEYS_LIMIT 一致 */
const DELETED_KEYS_LIMIT = 200;

export interface CloudPayload {
  /**
   * 2 → 3：favorites 不再夾帶完整記錄副本。
   *
   * 收藏與歷史是同生同死的（removeHistory 兩邊一起清），收藏欄位等於把
   * 同一批記錄再存一次，payload 因此接近雙倍大。v3 上傳空陣列，收藏改由
   * history 的 isFavorited 旗標還原——mergeFromCloud 本來就是這樣重建的，
   * 舊版 App 讀到 v3 也照樣能還原收藏，故不需要遷移。
   */
  version: 2 | 3;
  timestamp: number;
  history: unknown[];
  favorites: unknown[];
  settings: unknown;
  dailyFortune: unknown;
  /** 使用者刪除過的記錄 id（墓碑）。合併時套用，確保刪除不會在同步後復活 */
  deletedIds?: string[];
}

/**
 * 同步失敗的原因。
 *
 * 先前 syncWithCloud 只回 'ok' | 'error'，設定頁把任何失敗都顯示成
 * 「尚未設定雲端同步伺服器」——斷網、payload 超限、被限流時，使用者
 * 拿到的是與實情不符的診斷，照著訊息去設環境變數也不會好。
 */
export type SyncFailure =
  | 'offline'          // 連不上（斷網、DNS、CORS）
  | 'not-configured'   // 伺服器端沒接上 Redis（501）
  | 'invalid-key'      // 配對碼格式不對（401）
  | 'too-large'        // payload 超過伺服器上限（413）
  | 'rate-limited'     // 短時間內同步太多次（429）
  | 'server-error';    // 其餘非 2xx 或回傳格式不對

export type SyncOutcome = 'ok' | SyncFailure;
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
  return { version: 3, timestamp: Date.now(), history, favorites, settings, dailyFortune, deletedIds };
}

/**
 * 上傳前去掉冗餘的收藏副本。
 *
 * 只在這一個出口做，確保「每一次上傳」都是去重過的——散在各呼叫端做
 * 遲早會漏掉一條路徑，而漏掉的代價是 payload 接近雙倍、更早撞上上限。
 * 本機儲存不受影響：收藏在 AsyncStorage 仍是完整副本。
 */
function forUpload(payload: CloudPayload): CloudPayload {
  return { ...payload, version: 3, favorites: [] };
}

/** HTTP 狀態碼 → 失敗原因。伺服器的錯誤碼定義見 api/sync.ts */
function failureFromStatus(status: number): SyncFailure {
  if (status === 501) return 'not-configured';
  if (status === 401) return 'invalid-key';
  if (status === 413) return 'too-large';
  if (status === 429) return 'rate-limited';
  return 'server-error';
}

async function request(method: 'GET' | 'PUT', payload?: CloudPayload): Promise<Response> {
  return fetch(SYNC_URL, { method, headers: { 'Content-Type': 'application/json', 'X-Sync-Key': await ensureSyncKey() }, body: payload ? JSON.stringify(payload) : undefined });
}

export async function uploadToCloud(payload?: CloudPayload): Promise<SyncOutcome> {
  const resolvedPayload = payload || await buildCloudPayload();
  try {
    const r = await request('PUT', forUpload(resolvedPayload));
    return r.ok ? 'ok' : failureFromStatus(r.status);
  } catch (e) {
    // fetch 只在連不上時 reject（HTTP 錯誤碼不算 reject）
    console.warn('雲端同步上傳失敗:', e);
    return 'offline';
  }
}

/** 下載結果。'empty' 是「雲端還沒有這組配對碼的資料」，不是錯誤 */
export type DownloadResult =
  | { status: 'ok'; payload: CloudPayload }
  | { status: 'empty' }
  | { status: 'error'; reason: SyncFailure };

export async function downloadFromCloud(): Promise<DownloadResult> {
  try {
    const r = await request('GET');
    if (r.status === 404) return { status: 'empty' };
    if (!r.ok) return { status: 'error', reason: failureFromStatus(r.status) };
    const data: unknown = await r.json();
    // 連得上但內容不是我們認得的格式：當成錯誤而非「雲端是空的」，
    // 否則下一步會拿本機資料整個蓋掉雲端那份看不懂的東西
    return isCloudPayload(data)
      ? { status: 'ok', payload: data }
      : { status: 'error', reason: 'server-error' };
  } catch (e) {
    console.warn('雲端同步下載失敗:', e);
    return { status: 'error', reason: 'offline' };
  }
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

export function mergeHistories(
  local: unknown,
  cloud: unknown,
  limit: number = HISTORY_LIMIT,
): SyncRecord[] {
  const localArr = (Array.isArray(local) ? local : []).filter(isSyncRecord);
  const cloudArr = (Array.isArray(cloud) ? cloud : []).filter(isSyncRecord);
  const localIds = new Set(localArr.map(r => r.id));

  const resolved = new Map<string, SyncRecord>();
  for (const r of [...localArr, ...cloudArr]) {
    const prev = resolved.get(r.id);
    resolved.set(r.id, prev ? preferRecord(prev, r) : r);
  }

  const all = [...resolved.values()].sort((a, b) => b.timestamp - a.timestamp);
  if (all.length <= limit) return all;

  // 截斷時絕不丟「僅本地存在」的記錄——那等於同步動作本身摧毀
  // 這台裝置尚未上傳過的歷史。超限時只犧牲最舊的雲端端共有記錄。
  // 「下次同步會補回」只在雲端存得下聯集時才成立，故雲端那份用的是
  // CLOUD_HISTORY_LIMIT（見該常數註解）。
  const localOnly = all.filter(r => localIds.has(r.id));
  const rest = all.filter(r => !localIds.has(r.id));
  return [...localOnly, ...rest].slice(0, limit);
}
export function mergeSettings(local: AppSettings, cloud: unknown): AppSettings {
  if (!cloud || typeof cloud !== 'object') return local;
  const remote = cloud as Partial<AppSettings>;

  // 資料夾以 id 對齊合併，而非「先出現者優先」：兩台裝置可能各自把記錄
  // 放進同一個資料夾，recordIds 必須取聯集——只留雲端那份等於同步動作
  // 本身刪掉了本機尚未上傳的歸檔。標量欄位（name/color）則與本函式
  // {...remote, ...local}「本地優先」的政策一致，遠端舊值不得覆蓋本地編輯。
  // 刪除墓碑先取聯集，稍後把兩邊的資料夾／類別都濾一遍。
  // 少了這一步，一端刪掉的資料夾會從另一端的舊副本復活——記錄有墓碑
  // 而資料夾沒有，是同一個問題只修了一半。
  const deletedFolderIds = [...new Set([
    ...(remote.deletedFolderIds || []), ...(local.deletedFolderIds || []),
  ])].slice(-DELETED_KEYS_LIMIT);
  const deletedCategoryKeys = [...new Set([
    ...(remote.deletedCategoryKeys || []), ...(local.deletedCategoryKeys || []),
  ])].slice(-DELETED_KEYS_LIMIT);
  const deletedFolderSet = new Set(deletedFolderIds);
  const deletedCategorySet = new Set(deletedCategoryKeys);

  const foldersById = new Map<string, Folder>();
  for (const f of [...(remote.folders || []), ...(local.folders || [])]) {
    if (deletedFolderSet.has(f.id)) continue;
    const prev = foldersById.get(f.id);
    if (!prev) { foldersById.set(f.id, f); continue; }
    const prevIds = Array.isArray(prev.recordIds) ? prev.recordIds : [];
    const nextIds = Array.isArray(f.recordIds) ? f.recordIds : [];
    foldersById.set(f.id, { ...prev, ...f, recordIds: [...new Set([...prevIds, ...nextIds])] });
  }

  // 自訂類別以 key 對齊：label/icon 的編輯以本地為準，避免改了又悄悄變回。
  // 類別沒有陣列欄位需要聯集，後出現者（本地）直接勝出即可。
  const categoriesByKey = new Map<string, CustomCategory>();
  for (const c of [...(remote.customCategories || []), ...(local.customCategories || [])]) {
    if (deletedCategorySet.has(c.key)) continue;
    categoriesByKey.set(c.key, c);
  }

  return { ...remote, ...local,
    customCategories: [...categoriesByKey.values()],
    folders: [...foldersById.values()],
    deletedFolderIds,
    deletedCategoryKeys,
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

  // 本機與雲端各用自己的上限。兩者都滿載時，雲端若也只存 500，
  // 每次 PUT 都用自己那份整個取代雲端，兩台永遠來回覆蓋、雲端從不持有
  // 聯集。讓雲端那份存得下聯集，各裝置仍只保留最近 500 筆。
  const mergeWith = (limit: number) =>
    (mergeHistories(local.history, data.history, limit) as DivinationRecord[])
      .filter(r => !deletedSet.has(r.id));
  const history = mergeWith(HISTORY_LIMIT);
  const cloudHistory = mergeWith(CLOUD_HISTORY_LIMIT);

  const favoriteIds = new Set([
    ...cloudHistory.filter(r => r.isFavorited).map(r => r.id),
    ...mergeHistories(local.favorites, data.favorites, CLOUD_HISTORY_LIMIT).map(r => r.id),
  ]);
  const normalizedHistory = history.map(r => ({ ...r, isFavorited: favoriteIds.has(r.id) }));
  const normalizedCloudHistory = cloudHistory.map(r => ({ ...r, isFavorited: favoriteIds.has(r.id) }));
  const merged: CloudPayload = {
    version: 3,
    timestamp: Date.now(),
    // 上傳的是聯集；寫回本機的仍是 HISTORY_LIMIT 那一份（見下方 setItem）
    history: normalizedCloudHistory,
    favorites: normalizedHistory.filter(r => r.isFavorited),
    settings: mergeSettings(local.settings as AppSettings, data.settings),
    dailyFortune: pickDailyFortune(local.dailyFortune, data.dailyFortune),
    deletedIds,
  };
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(normalizedHistory)),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(merged.favorites)),
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged.settings)),
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_FORTUNE, JSON.stringify(merged.dailyFortune)),
    AsyncStorage.setItem(STORAGE_KEYS.DELETED, JSON.stringify(merged.deletedIds)),
  ]);
  return merged;
}
/** 下載 → 合併 → 回寫，先取得另一台裝置資料才不會覆蓋它。 */
export async function syncWithCloud(): Promise<SyncOutcome> {
  const cloud = await downloadFromCloud();

  // 下載失敗時就地停手，不上傳。這一步不是為了訊息好看：照舊往下走會拿
  // 本機那份去 PUT，等於一次暫時的斷網或伺服器錯誤就把雲端的聯集抹平。
  if (cloud.status === 'error') return cloud.reason;

  const payload = cloud.status === 'ok'
    ? await mergeFromCloud(cloud.payload)
    : await buildCloudPayload();
  return uploadToCloud(payload);
}
