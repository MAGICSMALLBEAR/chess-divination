// 本地儲存服務 — AsyncStorage CRUD
// 模式參照神明占卜 storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChessPiece } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { todayString } from './date';
import { DIVINATION_ENGINE_VERSION } from './divination';
import { FolderColors } from '@/constants/theme';
import type { DivinerGender } from './useGod';
import type { Lang } from './i18n';
import type { SpreadId } from './spreads';

// ====== Keys ======

export const STORAGE_KEYS = {
  HISTORY: '@chess_divination_history',
  FAVORITES: '@chess_divination_favorites',
  SETTINGS: '@chess_divination_settings',
  DAILY_FORTUNE: '@chess_divination_daily',
  /** 刪除過的記錄 id（墓碑），雲端同步時套用以避免刪除復活 */
  DELETED: '@chess_divination_deleted',
} as const;

// ====== Types ======

export type DivinationMode = 'draw' | 'board' | 'lingqi';

export interface DivinationRecord {
  id: string;
  poemId: number;
  poemTitle: string;
  poemContent: string;
  poemLevel: string;
  drawnPieceTypes: string[];      // piece type strings for serialization
  drawnPieceColors: string[];
  drawnPieceChars: string[];      // display chars
  mode: DivinationMode;
  questionCategory?: string;
  questionText?: string;         // user's written question
  /** 使用者為這次籤詩留下的自由筆記，不需先填占驗結果。 */
  note?: string;
  positionSummary?: string;      // board position interpretation summary
  /** 棋盤占卜所用牌陣；舊記錄缺省為自由佈局，保留向後相容。 */
  spreadId?: SpreadId;
  /**
   * 靈棋卦目鍵值 `上-中-下`，僅 mode === 'lingqi' 的記錄有。
   *
   * 靈棋走《靈棋經》125 卦目，不是六十四籤詩那一套，因此這類記錄的
   * poemId 恆為 0 且不可拿去查籤詩——顯示標題請走 recordTitle()。
   * 原典也未載吉凶等級，poemLevel 恆為空字串，統計的吉凶分佈與
   * 依等級應驗率一律排除（見 recordHasLevel()）。
   */
  lingqiKey?: string;
  timestamp: number;
  isFavorited: boolean;
  /**
   * 起卦引擎版本。缺少此欄位者為 v1 舊記錄——v1 的卦序對應有誤
   * （先天序誤當文王序），其 poemId 與卦象不符。
   * 舊記錄一律保留原樣不予改寫，僅在顯示時標註，避免竄改使用者的占卜歷史。
   */
  engineVersion?: number;
  hexagramName?: string;
  /** 先天序索引 0–63，用於還原完整卦例（變卦／互卦／體用） */
  hexagramIndex?: number;
  movingLine?: number;
  /** 起卦時辰數 1–12 */
  hourBranch?: number;
  /**
   * 占驗：事後回填的實際結果。
   * 未回填者為 undefined——「還沒驗」與「驗過但不準」是兩件事，
   * 不可用預設值混為一談，否則應驗率會被大量未驗記錄稀釋成無意義的數字。
   */
  outcome?: DivinationOutcome;
}

/** 占驗結果三態。刻意不做五級量表——事後回想本就模糊，選項太細只會降低回填率 */
export type OutcomeStatus = 'accurate' | 'partial' | 'inaccurate';

export interface DivinationOutcome {
  status: OutcomeStatus;
  /** 使用者自述實際發生了什麼 */
  note?: string;
  /** 回填當下的時間，用於「占卜後多久才驗」的分析 */
  verifiedAt: number;
}

/**
 * 判斷記錄是否為卦序錯誤的 v1 舊記錄。
 * v2 以後卦序皆正確，僅是解讀深度不同，不算「舊卦法」。
 */
export function isLegacyRecord(record: DivinationRecord): boolean {
  return (record.engineVersion ?? 1) < 2;
}

/**
 * 判斷記錄是否以 v3 以前的動爻算法起卦（把 0 基索引當卦數，比古法少 2）。
 *
 * 與 isLegacyRecord 分開：那些記錄的卦序、籤詩、卦名都是對的，只有動爻
 * 及其推導出的變卦／體用與古法不同，不該掛上「卦序錯誤」那面旗子。
 * 記錄本身不改寫——movingLine 是起卦當下存下的，顯示時直接取用，
 * 使用者回填的占驗仍對應他當時看到的那一卦。
 */
export function usesLegacyMovingLine(record: DivinationRecord): boolean {
  const version = record.engineVersion ?? 1;
  return version >= 2 && version < 4;
}

/** 判斷記錄是否含完整的六爻資訊（變卦／互卦／體用） */
export function hasLiuYaoData(record: DivinationRecord): boolean {
  return record.hexagramIndex !== undefined && record.movingLine !== undefined;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  recordIds: string[];
}

export interface AppSettings {
  userName: string;
  drawAnimationSpeed: 'slow' | 'normal' | 'fast';
  themeMode: 'dark' | 'light' | 'system';
  /** 介面語言。i18n 模組是記憶體狀態，開機時由 _layout 回讀套用 */
  lang?: Lang;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  pieceCountPreset: 1 | 2 | 3;
  hasCompletedOnboarding: boolean;
  questionCategory?: string;
  folders?: Folder[];
  usageDates?: string[];
  currentStreak?: number;
  unlockedAchievements?: string[];
  customCategories?: CustomCategory[];
  /**
   * 已刪除的資料夾 id／自訂類別 key（墓碑）。
   *
   * 記錄有墓碑、資料夾與類別沒有：mergeSettings 對兩者都是取聯集，
   * 一端刪掉的資料夾會在下次同步時從另一端的舊副本復活。與 usageDates
   * 同樣放在 AppSettings 裡，不必新增儲存鍵，也自動進備份。
   */
  deletedFolderIds?: string[];
  deletedCategoryKeys?: string[];
  /**
   * 占者性別。只用於感情問事的用神取法（男占以妻財、女占以官鬼，取法相反）。
   * 未設定時感情不出用神斷語——取反的用神比沒有用神更誤導。
   */
  divinerGender?: DivinerGender;
}

/** 使用者自訂問事類別 */
export interface CustomCategory {
  key: string;
  label: string;
  icon: string;  // IconName
}

const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  drawAnimationSpeed: 'normal',
  themeMode: 'dark',
  soundEnabled: true,
  hapticEnabled: true,
  pieceCountPreset: 2,
  hasCompletedOnboarding: false,
};

// ====== Helpers ======

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeRecords(raw: string | null): DivinationRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ====== History ======

export async function getHistory(): Promise<DivinationRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
  return normalizeRecords(raw);
}

export async function addHistory(record: Omit<DivinationRecord, 'id'>): Promise<DivinationRecord> {
  const newRecord: DivinationRecord = { ...record, id: generateId() };
  const history = await getHistory();
  history.unshift(newRecord);
  // Keep last 500 records max
  const trimmed = history.slice(0, 500);
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
  return newRecord;
}

/**
 * 把刪除過的 id 記進墓碑清單（最多保留最近 1000 個）。
 * 沒有墓碑的話，雲端同步只做 union——刪掉的記錄下次同步全部復活。
 */
async function addDeletedIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DELETED);
  let list: string[] = [];
  try { list = raw ? JSON.parse(raw) : []; } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  const next = [...new Set([...list, ...ids])].slice(-1000);
  await AsyncStorage.setItem(STORAGE_KEYS.DELETED, JSON.stringify(next));
}

/**
 * 把已刪除的記錄 id 從所有資料夾裡拿掉。
 *
 * 資料夾存的是 id 而不是記錄本身，刪記錄時若不清這一份，資料夾會永遠
 * 抱著一串指不到任何東西的 id：卡片上的筆數把它們算進去（「5 筆」），
 * 打開卻只列得出剩下的那幾筆——同一個資料夾的兩個地方講不同的數字。
 * 那串 id 還會跟著備份與雲端同步一路複製下去，且只增不減。
 *
 * 沒有要刪的 id 時直接返回，不進佇列——刪一筆不在任何資料夾裡的記錄
 * 是最常見的情況，不該為它多寫一次設定。
 */
async function pruneFromFolders(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const gone = new Set(ids);
  await updateSettings(current => {
    const folders = current.folders || [];
    if (!folders.some(f => f.recordIds.some(id => gone.has(id)))) return {};
    return {
      folders: folders.map(f => ({ ...f, recordIds: f.recordIds.filter(id => !gone.has(id)) })),
    };
  });
}

export async function removeHistory(id: string): Promise<void> {
  const [history, favorites] = await Promise.all([getHistory(), getFavorites()]);
  const filtered = history.filter(r => r.id !== id);
  // 收藏存的是記錄的完整副本——只清歷史的話，被刪的記錄會永遠留在收藏頁，
  // 那裡的刪除鈕再按一次 removeHistory 也成了 no-op，卡片怎麼刪都刪不掉。
  const keptFavorites = favorites.filter(r => r.id !== id);
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered)),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(keptFavorites)),
  ]);
  await addDeletedIds([id]);
  await pruneFromFolders([id]);
}

export async function clearHistory(): Promise<void> {
  const [history, favorites] = await Promise.all([getHistory(), getFavorites()]);
  const gone = [...new Set([...history.map(r => r.id), ...favorites.map(r => r.id)])];
  // 墓碑取兩邊 id 的聯集。只記歷史的話，歷史已無、收藏還在的孤兒記錄
  // （舊版只刪歷史所留下的）會被清掉卻沒有墓碑，下次同步就從雲端復活。
  await addDeletedIds(gone);
  // 「清除所有歷史」是使用者確認過的破壞性操作——收藏若留著，
  // 收藏頁會繼續顯示整套記錄，與剛接受的確認互相矛盾。
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([])),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([])),
  ]);
  // 資料夾本身保留（那是使用者建的分類，不在這次確認的範圍內），
  // 但裡面的記錄 id 全都指不到東西了，一併清空
  await pruneFromFolders(gone);
}

// ====== Favorites ======

export async function getFavorites(): Promise<DivinationRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
  return normalizeRecords(raw);
}

export async function toggleFavorite(record: DivinationRecord): Promise<boolean> {
  const favorites = await getFavorites();
  const exists = favorites.findIndex(f => f.id === record.id);

  if (exists >= 0) {
    favorites.splice(exists, 1);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    // Also update the history record
    await updateHistoryFavorite(record.id, false);
    return false;
  } else {
    favorites.unshift({ ...record, isFavorited: true });
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    await updateHistoryFavorite(record.id, true);
    return true;
  }
}

async function updateHistoryFavorite(id: string, isFavorited: boolean): Promise<void> {
  const history = await getHistory();
  const idx = history.findIndex(r => r.id === id);
  if (idx >= 0) {
    history[idx].isFavorited = isFavorited;
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }
}

export async function isFavorited(id: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.id === id);
}

// ====== 占驗（事後回填實際結果）======

/**
 * 記下某次占卜的實際結果。
 *
 * 收藏清單存的是記錄的完整副本，兩邊都要更新——只改歷史的話，
 * 從收藏頁進去看到的會是沒有占驗的舊副本，同一筆記錄在兩個頁面顯示不一致。
 */
export async function setOutcome(
  id: string,
  status: OutcomeStatus,
  note?: string,
): Promise<DivinationOutcome> {
  const outcome: DivinationOutcome = {
    status,
    note: note?.trim() || undefined,
    verifiedAt: Date.now(),
  };
  await patchRecord(id, r => ({ ...r, outcome }));
  return outcome;
}

/** 清除占驗，讓記錄回到「未驗」狀態 */
export async function clearOutcome(id: string): Promise<void> {
  await patchRecord(id, ({ outcome, ...rest }) => rest);
}

/** 儲存籤詩筆記；空白內容會清除既有筆記。 */
export async function setRecordNote(id: string, note: string): Promise<void> {
  const trimmed = note.trim();
  await patchRecord(id, r => {
    if (!trimmed) {
      const { note: _note, ...rest } = r;
      return rest;
    }
    return { ...r, note: trimmed };
  });
}

/** 同時套用到歷史與收藏兩份副本 */
async function patchRecord(
  id: string,
  patch: (r: DivinationRecord) => DivinationRecord,
): Promise<void> {
  const [history, favorites] = await Promise.all([getHistory(), getFavorites()]);

  const nextHistory = history.map(r => (r.id === id ? patch(r) : r));
  const nextFavorites = favorites.map(r => (r.id === id ? patch(r) : r));

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(nextHistory)),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(nextFavorites)),
  ]);
}

// ====== Settings ======

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
  return normalizeSettings(raw);
}

/**
 * 設定寫入的序列化佇列。
 *
 * saveSettings 是「讀出整包 → 合併 → 寫回整包」，兩個並行的呼叫會同時
 * 讀到同一份舊值，後寫的那個把先寫的整個蓋掉。這不是理論問題：
 * reveal 頁的同一個 effect 裡 recordUsage() 與 syncAchievements() 併發
 * 且都不 await，撞上時當日的 usageDates／currentStreak 更新會遺失，
 * 連續天數就這麼斷了——而且不像成就會在下次進頁面時自我修復，
 * 那一天過了就補不回來。
 *
 * 佇列讓每次「讀-改-寫」相對於其他設定寫入是不可分割的。
 */
let settingsQueue: Promise<unknown> = Promise.resolve();

/**
 * 以函式形式更新設定：updater 收到的一定是**佇列輪到它時**的最新值。
 *
 * 需要「依現值決定新值」的呼叫端都該用這個而非 saveSettings——
 * 在佇列外先 getSettings() 再 saveSettings(算出來的值)，讀到的仍是
 * 可能過期的快照，佇列只保證寫入不交錯，救不了在外面讀舊值這件事。
 */
export async function updateSettings(
  updater: (current: AppSettings) => Partial<AppSettings>,
): Promise<AppSettings> {
  const run = settingsQueue.then(async () => {
    const current = await getSettings();
    const updated = { ...current, ...updater(current) };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  });
  // 佇列不可因為某次寫入失敗就整條斷掉，之後的寫入還是要能排進來
  settingsQueue = run.catch(() => undefined);
  return run;
}

export function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return updateSettings(() => settings);
}

// ====== Folders ======

const FOLDER_COLORS = FolderColors;

export async function getFolders(): Promise<Folder[]> {
  const s = await getSettings();
  return s.folders || [];
}

export async function addFolder(name: string): Promise<Folder> {
  // 整包讀-改-寫必須在佇列裡完成，否則與另一次資料夾寫入（例如刪除）
  // 交錯時，兩邊各自基於同一份寫前快照算出新陣列，後寫的把前一次蓋掉
  let folder!: Folder;
  await updateSettings(current => {
    const folders = current.folders || [];
    folder = {
      // 用 generateId 而非單純的 Date.now()——同一毫秒內連續建立兩個資料夾
      // 會拿到相同 id，刪除其一會連帶刪掉另一個。
      id: `folder-${generateId()}`,
      name,
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
      recordIds: [],
    };
    return { folders: [...folders, folder] };
  });
  return folder;
}

/** 墓碑清單上限，比照記錄墓碑的作法夾住無限成長 */
const DELETED_KEYS_LIMIT = 200;

/** 記下刪除，讓同步不會把它從另一端的舊副本復活 */
function withTombstone(existing: string[] | undefined, id: string): string[] {
  return [...new Set([...(existing || []), id])].slice(-DELETED_KEYS_LIMIT);
}

export async function deleteFolder(id: string): Promise<void> {
  // 讀-改-寫走 updateSettings 的佇列，避免與其他寫入交錯時
  // 資料夾刪除與墓碑其中一邊被覆蓋掉
  await updateSettings(current => ({
    folders: (current.folders || []).filter(f => f.id !== id),
    deletedFolderIds: withTombstone(current.deletedFolderIds, id),
  }));
}

/** 刪除自訂類別並留下墓碑；與 deleteFolder 同理 */
export async function deleteCustomCategory(key: string): Promise<CustomCategory[]> {
  const updated = await updateSettings(current => ({
    customCategories: (current.customCategories || []).filter(c => c.key !== key),
    deletedCategoryKeys: withTombstone(current.deletedCategoryKeys, key),
  }));
  return updated.customCategories || [];
}

export async function addToFolder(folderId: string, recordId: string): Promise<void> {
  await updateSettings(current => ({
    folders: (current.folders || []).map(f =>
      f.id === folderId ? { ...f, recordIds: [...new Set([...f.recordIds, recordId])] } : f
    ),
  }));
}

export async function removeFromFolder(folderId: string, recordId: string): Promise<void> {
  await updateSettings(current => ({
    folders: (current.folders || []).map(f =>
      f.id === folderId ? { ...f, recordIds: f.recordIds.filter(id => id !== recordId) } : f
    ),
  }));
}

// ====== Daily Fortune ======

export interface DailyFortune {
  date: string;          // YYYY-MM-DD（當地時區，非 UTC）
  luckyPiece: string;    // piece type
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: number;
  fortuneLevel: string;
  fortuneText: string;
  poemId?: number;       // 當日之卦對應的籤詩
  luckyElement?: string; // 當日主氣五行
}

export async function getDailyFortune(): Promise<DailyFortune | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_FORTUNE);
  if (!raw) return null;
  try {
    const fortune = JSON.parse(raw);
    if (fortune.date !== todayString()) return null;
    return fortune;
  } catch {
    return null;
  }
}

export async function saveDailyFortune(fortune: DailyFortune): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DAILY_FORTUNE, JSON.stringify(fortune));
}

// ====== Export helpers for records ======

export function recordFromDivination(
  poem: Poem,
  pieces: ChessPiece[],
  mode: DivinationMode,
  questionCategory?: string,
  questionText?: string,
  positionSummary?: string,
  hexagram?: { name: string; index: number; movingLine: number; hourBranch: number },
  spreadId?: SpreadId,
): Omit<DivinationRecord, 'id'> {
  return {
    poemId: poem.id,
    poemTitle: poem.title,
    poemContent: poem.content,
    poemLevel: poem.level,
    drawnPieceTypes: pieces.map(p => p.type),
    drawnPieceColors: pieces.map(p => p.color),
    drawnPieceChars: pieces.map(p => p.displayChar),
    mode,
    questionCategory,
    questionText,
    positionSummary,
    spreadId,
    timestamp: Date.now(),
    isFavorited: false,
    engineVersion: DIVINATION_ENGINE_VERSION,
    hexagramName: hexagram?.name,
    hexagramIndex: hexagram?.index,
    movingLine: hexagram?.movingLine,
    hourBranch: hexagram?.hourBranch,
  };
}

/**
 * 靈棋記錄。走《靈棋經》125 卦目而非六十四籤詩，故 poemId 留 0、poemLevel 留空——
 * 兩者都不可被當成籤詩欄位使用，理由與邊界見 DivinationRecord.lingqiKey。
 */
export function recordFromLingqi(
  oracle: { key: string; notation: string; name: string; shi: string[] },
  questionCategory?: string,
  questionText?: string,
): Omit<DivinationRecord, 'id'> {
  return {
    poemId: 0,
    poemTitle: oracle.name,
    poemContent: oracle.shi.join('\n'),
    poemLevel: '',
    drawnPieceTypes: [],
    drawnPieceColors: [],
    drawnPieceChars: [],
    mode: 'lingqi',
    questionCategory,
    questionText,
    lingqiKey: oracle.key,
    timestamp: Date.now(),
    isFavorited: false,
    engineVersion: DIVINATION_ENGINE_VERSION,
  };
}

/**
 * 這筆記錄有沒有吉凶等級。靈棋走的《靈棋經》原典未載等級，我們也不替它補寫，
 * 因此吉凶分佈與依等級應驗率必須先過這一關，否則靈棋記錄會以空字串自成一類。
 */
export function recordHasLevel(record: Pick<DivinationRecord, 'poemLevel'>): boolean {
  return record.poemLevel.length > 0;
}
