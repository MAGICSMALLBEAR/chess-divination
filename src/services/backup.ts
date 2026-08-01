// 備份還原服務
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateString } from './date';

const BACKUP_KEYS = [
  '@chess_divination_history',
  '@chess_divination_favorites',
  '@chess_divination_settings',
];

export async function backupData(): Promise<string | null> {
  try {
    const data: Record<string, any> = {};
    for (const key of BACKUP_KEYS) {
      const raw = await AsyncStorage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : null;
    }
    const json = JSON.stringify({ version: 1, date: new Date().toISOString(), data }, null, 2);

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

    // Native: clipboard fallback
    return json;
  } catch (e) {
    console.log('Backup error:', e);
    return null;
  }
}

export async function restoreData(): Promise<boolean> {
  try {
    // Web: prompt for file
    if (typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) { resolve(false); return; }
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed.data) {
            for (const key of BACKUP_KEYS) {
              if (parsed.data[key] !== undefined) {
                await AsyncStorage.setItem(key, JSON.stringify(parsed.data[key]));
              }
            }
          }
          resolve(true);
        };
        input.click();
      });
    }
    // Native would use DocumentPicker
    return false;
  } catch (e) {
    console.log('Restore error:', e);
    return false;
  }
}
