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

export type DivinationMode = 'draw' | 'board';

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
  positionSummary?: string;      // board position interpretation summary
  /** 棋盤占卜所用牌陣；舊記錄缺省為自由佈局，保留向後相容。 */
  spreadId?: SpreadId;
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
}

export async function clearHistory(): Promise<void> {
  const [history, favorites] = await Promise.all([getHistory(), getFavorites()]);
  // 墓碑取兩邊 id 的聯集。只記歷史的話，歷史已無、收藏還在的孤兒記錄
  // （舊版只刪歷史所留下的）會被清掉卻沒有墓碑，下次同步就從雲端復活。
  await addDeletedIds([...new Set([...history.map(r => r.id), ...favorites.map(r => r.id)])]);
  // 「清除所有歷史」是使用者確認過的破壞性操作——收藏若留著，
  // 收藏頁會繼續顯示整套記錄，與剛接受的確認互相矛盾。
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([])),
    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([])),
  ]);
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

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ====== Folders ======

const FOLDER_COLORS = FolderColors;

export async function getFolders(): Promise<Folder[]> {
  const s = await getSettings();
  return s.folders || [];
}

export async function addFolder(name: string): Promise<Folder> {
  const s = await getSettings();
  const folders = s.folders || [];
  const folder: Folder = {
    // 用 generateId 而非單純的 Date.now()——同一毫秒內連續建立兩個資料夾
    // 會拿到相同 id，刪除其一會連帶刪掉另一個。
    id: `folder-${generateId()}`,
    name,
    color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
    recordIds: [],
  };
  await saveSettings({ folders: [...folders, folder] });
  return folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const s = await getSettings();
  const folders = (s.folders || []).filter(f => f.id !== id);
  await saveSettings({ folders });
}

export async function addToFolder(folderId: string, recordId: string): Promise<void> {
  const s = await getSettings();
  const folders = (s.folders || []).map(f =>
    f.id === folderId ? { ...f, recordIds: [...new Set([...f.recordIds, recordId])] } : f
  );
  await saveSettings({ folders });
}

export async function removeFromFolder(folderId: string, recordId: string): Promise<void> {
  const s = await getSettings();
  const folders = (s.folders || []).map(f =>
    f.id === folderId ? { ...f, recordIds: f.recordIds.filter(id => id !== recordId) } : f
  );
  await saveSettings({ folders });
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
