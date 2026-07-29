// 本地儲存服務 — AsyncStorage CRUD
// 模式參照神明占卜 storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChessPiece } from '@/data/pieces';
import type { Poem } from '@/data/poems';

// ====== Keys ======

const KEYS = {
  HISTORY: '@chess_divination_history',
  FAVORITES: '@chess_divination_favorites',
  SETTINGS: '@chess_divination_settings',
  DAILY_FORTUNE: '@chess_divination_daily',
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
  timestamp: number;
  isFavorited: boolean;
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
  themeMode: 'dark' | 'light';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  pieceCountPreset: 1 | 2 | 3;
  hasCompletedOnboarding: boolean;
  questionCategory?: string;
  folders?: Folder[];
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
  const raw = await AsyncStorage.getItem(KEYS.HISTORY);
  return normalizeRecords(raw);
}

export async function addHistory(record: Omit<DivinationRecord, 'id'>): Promise<DivinationRecord> {
  const newRecord: DivinationRecord = { ...record, id: generateId() };
  const history = await getHistory();
  history.unshift(newRecord);
  // Keep last 500 records max
  const trimmed = history.slice(0, 500);
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed));
  return newRecord;
}

export async function removeHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(r => r.id !== id);
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
}

// ====== Favorites ======

export async function getFavorites(): Promise<DivinationRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.FAVORITES);
  return normalizeRecords(raw);
}

export async function toggleFavorite(record: DivinationRecord): Promise<boolean> {
  const favorites = await getFavorites();
  const exists = favorites.findIndex(f => f.id === record.id);

  if (exists >= 0) {
    favorites.splice(exists, 1);
    await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
    // Also update the history record
    await updateHistoryFavorite(record.id, false);
    return false;
  } else {
    favorites.unshift({ ...record, isFavorited: true });
    await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
    await updateHistoryFavorite(record.id, true);
    return true;
  }
}

async function updateHistoryFavorite(id: string, isFavorited: boolean): Promise<void> {
  const history = await getHistory();
  const idx = history.findIndex(r => r.id === id);
  if (idx >= 0) {
    history[idx].isFavorited = isFavorited;
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }
}

export async function isFavorited(id: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.id === id);
}

// ====== Settings ======

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return normalizeSettings(raw);
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ====== Folders ======

const FOLDER_COLORS = ['#C9A96E', '#E5746A', '#6B9B6B', '#6B9BC6', '#C69BC6', '#C6A06B'];

export async function getFolders(): Promise<Folder[]> {
  const s = await getSettings();
  return s.folders || [];
}

export async function addFolder(name: string): Promise<Folder> {
  const s = await getSettings();
  const folders = s.folders || [];
  const folder: Folder = {
    id: `folder-${Date.now()}`,
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
  date: string;          // YYYY-MM-DD
  luckyPiece: string;    // piece type
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: number;
  fortuneLevel: string;
  fortuneText: string;
}

export async function getDailyFortune(): Promise<DailyFortune | null> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_FORTUNE);
  if (!raw) return null;
  try {
    const fortune = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (fortune.date !== today) return null;
    return fortune;
  } catch {
    return null;
  }
}

export async function saveDailyFortune(fortune: DailyFortune): Promise<void> {
  await AsyncStorage.setItem(KEYS.DAILY_FORTUNE, JSON.stringify(fortune));
}

// ====== Export helpers for records ======

export function recordFromDivination(
  poem: Poem,
  pieces: ChessPiece[],
  mode: DivinationMode,
  questionCategory?: string,
  questionText?: string,
  positionSummary?: string,
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
    timestamp: Date.now(),
    isFavorited: false,
  };
}
