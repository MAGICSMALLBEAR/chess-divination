// 占卜記錄匯出成 CSV（路線圖 #30）：給想用試算表自己分析的人。
//
// 備份 JSON 是給 App 讀的（還原用），長圖報告是給人看的；這一份是給試算表讀的——
// 一筆記錄一列、欄位固定、值是看得懂的文字而非內部代碼（類別、方式、占驗都轉成顯示名稱）。
//
// 隱私：問題、直覺、占驗自述、筆記、決策日誌跟著報告匯出的同一個開關（ReportExportSheet），
// 預設收——檔案是給自己的；要交給別人時使用者自己關。關掉時整欄仍在、值留空，
// 欄位不隨選項變動，同一個人前後兩次匯出的表才對得起來。

import { categoryLabel, t } from './i18n';
import { isLegacyRecord, type DivinationRecord } from './storage';
import { recordTitle } from './poemList';
import { SPREAD_LABEL_KEYS } from './spreads';
import { REALIZED_LABEL_KEYS } from './calibration';
import { toLocalDateString } from './date';
import { deliverTextFile, type ExportChannel } from './fileExport';

export interface CsvOptions {
  /** 與報告匯出同義：問題、直覺、占驗自述、筆記、決策日誌 */
  includePersonalText: boolean;
  /** 自訂類別的名字（設定裡的 customCategories）；記錄只存 key，沒給就印不出名字 */
  customCategories?: readonly { key: string; label: string }[];
}

const MODE_KEYS: Record<DivinationRecord['mode'], string> = {
  draw: 'mode.draw', board: 'mode.board', lingqi: 'mode.lingqi',
};
const OUTCOME_KEYS = {
  accurate: 'outcome.accurate', partial: 'outcome.partial', inaccurate: 'outcome.inaccurate',
} as const;

/** 欄位順序即輸出順序；personal 為 true 的欄位受隱私開關控制 */
const COLUMNS: readonly { key: string; personal?: boolean; value: (r: DivinationRecord, options: CsvOptions) => string | number | undefined }[] = [
  { key: 'csv.date', value: r => localDateTime(r.timestamp) },
  { key: 'csv.mode', value: r => t(MODE_KEYS[r.mode] ?? r.mode) },
  { key: 'csv.spread', value: r => r.mode === 'board' && r.spreadId && SPREAD_LABEL_KEYS[r.spreadId] ? t(SPREAD_LABEL_KEYS[r.spreadId]) : undefined },
  { key: 'csv.category', value: (r, o) => r.questionCategory ? categoryLabel(r.questionCategory, o.customCategories) : undefined },
  { key: 'csv.title', value: r => recordTitle(r) },
  { key: 'csv.level', value: r => r.poemLevel || undefined },
  // v1 舊記錄的卦象與籤詩對不上（isLegacyRecord），寧可留空也不要讓試算表拿錯卦去統計；
  // 籤題那欄仍在——那首籤詩確實是當時看到的
  { key: 'csv.hexagram', value: r => r.mode !== 'lingqi' && !isLegacyRecord(r) ? r.hexagramName : undefined },
  { key: 'csv.movingLine', value: r => r.mode !== 'lingqi' && !isLegacyRecord(r) ? r.movingLine : undefined },
  { key: 'csv.question', personal: true, value: r => r.questionText },
  { key: 'csv.intuition', personal: true, value: r => r.intuition },
  { key: 'csv.outcome', value: r => r.outcome && OUTCOME_KEYS[r.outcome.status] ? t(OUTCOME_KEYS[r.outcome.status]) : undefined },
  { key: 'csv.realized', value: r => r.outcome?.realized && REALIZED_LABEL_KEYS[r.outcome.realized] ? t(REALIZED_LABEL_KEYS[r.outcome.realized]) : undefined },
  { key: 'csv.verifiedAt', value: r => r.outcome ? localDateTime(r.outcome.verifiedAt) : undefined },
  { key: 'csv.outcomeNote', personal: true, value: r => r.outcome?.note },
  { key: 'csv.note', personal: true, value: r => r.note },
  { key: 'csv.expectation', personal: true, value: r => r.decisionJournal?.expectation },
  { key: 'csv.evidence', personal: true, value: r => r.decisionJournal?.evidence },
  { key: 'csv.nextStep', personal: true, value: r => r.decisionJournal?.nextStep },
  { key: 'csv.favorited', value: r => r.isFavorited ? t('csv.yes') : undefined },
  // 用來在試算表裡把「同一件事」接起來：relatedTo 指向同一張表裡的另一列 id
  { key: 'csv.id', value: r => r.id },
  { key: 'csv.relatedTo', value: r => r.relatedTo },
];

function pad(n: number): string { return String(n).padStart(2, '0'); }

/** 本地時間 `YYYY-MM-DD HH:mm`——試算表認得出是日期，也與 App 內顯示同一個時區 */
function localDateTime(ms: number): string | undefined {
  if (!Number.isFinite(ms)) return undefined;
  const d = new Date(ms);
  return `${toLocalDateString(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 一格 CSV（RFC 4180）。另外擋試算表公式注入：使用者自己打的問題若以 = + - @ 開頭，
 * Excel／Google 試算表打開時會當成公式執行。前面補一個 ' 讓它維持文字。
 */
export function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 整份 CSV。依時間由舊到新排——試算表裡往下是時間往後，畫圖與累計都比較自然。
 * 開頭帶 BOM：少了它，Excel 會把 UTF-8 中文當成本機編碼讀成亂碼。
 */
export function buildHistoryCsv(history: readonly DivinationRecord[], options: CsvOptions): string {
  const cols = COLUMNS;
  const rows = [...history]
    .filter(r => r && typeof r.id === 'string')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .map(r => cols.map(c => csvCell(c.personal && !options.includePersonalText ? undefined : c.value(r, options))).join(','));
  const header = cols.map(c => csvCell(t(c.key))).join(',');
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}

export function csvFileName(date: Date = new Date()): string {
  return `chess-divination-records-${toLocalDateString(date)}.csv`;
}

/** 失敗回 null（連剪貼簿都寫不進去） */
export async function exportHistoryCsv(
  history: readonly DivinationRecord[],
  options: CsvOptions,
): Promise<ExportChannel | null> {
  try {
    return await deliverTextFile({
      fileName: csvFileName(),
      content: buildHistoryCsv(history, options),
      mimeType: 'text/csv',
      uti: 'public.comma-separated-values-text',
      dialogTitle: t('settings.exportCsv'),
    });
  } catch (e) {
    console.warn('CSV 匯出失敗:', e);
    return null;
  }
}
