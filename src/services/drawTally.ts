// 抽棋的隨機性 — 把每一次抽出的棋子記下來，與棋盤組成的預期並列（統計學的適合度檢定）
//
// 為什麼要另外記、不直接數歷史記錄：抽棋頁在存檔前會先亮出棋子，而且可以「重新抽取」。
// 存進歷史的只有使用者**留下來**的那幾次——拿它來檢驗亂數，量到的是亂數加上使用者的挑選。
// 所以在抽出的那一刻就計數（丟掉的也算），從這一版開始累積；舊的重抽沒有留下紀錄，補不回來。
//
// 只數抽棋模式：棋盤佈局的棋子是使用者自己挑的，靈棋擲的是棋子正反、不是哪一顆棋。
//
// 預期分佈取自 ALL_PIECES（每卦幾顆棋除以 32），不另寫一份比例。卦象不等機率是 A24 定案的
// 棋盤性質——這張卡只是把它列出來給使用者看，不改變抽取。
//
// 進度只存本機並納入備份，不進雲端同步（與學習進度同一個理由：合併規則是為占卜記錄訂的）。
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_PIECES } from '@/data/pieces';
import { TRIGRAM_NAMES } from './hexagram';

export const DRAW_TALLY_KEY = '@chess_divination_draw_tally';

export interface DrawTally {
  /** 各卦（先天序 0–7）被抽中的棋子數 */
  counts: number[];
}

const TRIGRAM_COUNT = TRIGRAM_NAMES.length;

function emptyTally(): DrawTally {
  return { counts: Array(TRIGRAM_COUNT).fill(0) };
}

/** 讀回來的資料逐項檢查：備份還原或手改的檔案可能帶進壞值，壞了就當作從零開始 */
export function normalizeDrawTally(raw: unknown): DrawTally {
  const counts = (raw as Partial<DrawTally> | null)?.counts;
  if (!Array.isArray(counts) || counts.length !== TRIGRAM_COUNT
    || !counts.every(n => Number.isInteger(n) && n >= 0)) {
    return emptyTally();
  }
  return { counts: [...counts] };
}

export async function getDrawTally(): Promise<DrawTally> {
  try {
    const raw = await AsyncStorage.getItem(DRAW_TALLY_KEY);
    return raw ? normalizeDrawTally(JSON.parse(raw)) : emptyTally();
  } catch {
    return emptyTally();
  }
}

// 連續抽棋（抽了馬上重抽）時兩次讀-改-寫可能交錯，後寫的會蓋掉先寫的——排成一條佇列
let queue: Promise<unknown> = Promise.resolve();

/** 記下一次抽出的棋子（每顆各算一次）。計數失敗不影響占卜本身，只吞掉錯誤 */
export function recordDraw(trigrams: readonly number[]): Promise<void> {
  const task = queue.then(async () => {
    const tally = await getDrawTally();
    for (const t of trigrams) {
      if (Number.isInteger(t) && t >= 0 && t < TRIGRAM_COUNT) tally.counts[t]++;
    }
    await AsyncStorage.setItem(DRAW_TALLY_KEY, JSON.stringify(tally));
  }).catch(e => { console.warn('抽棋計數失敗:', e); });
  queue = task;
  return task;
}

// ====== 預期與檢定 ======

/** 各卦的預期比例：對應那一卦的棋子數除以全部棋子數 */
export function expectedShares(): number[] {
  const counts = Array(TRIGRAM_COUNT).fill(0);
  for (const p of ALL_PIECES) counts[p.trigram]++;
  return counts.map(c => c / ALL_PIECES.length);
}

/** 各卦對應幾顆棋子（文案用：「乾、坤各只有 1 顆」要有真相來源） */
export function piecesPerTrigram(): number[] {
  return expectedShares().map(s => Math.round(s * ALL_PIECES.length));
}

/** 卡方檢定的慣例：每一格的預期次數至少 5，近似才可靠 */
export const MIN_EXPECTED_PER_CELL = 5;
/** 顯著水準（%） */
export const SIGNIFICANCE_PCT = 5;

/** 要抽到幾顆，最少的那一卦預期次數才到 MIN_EXPECTED_PER_CELL */
export function minDrawsForTest(): number {
  return Math.ceil(MIN_EXPECTED_PER_CELL / Math.min(...expectedShares()));
}

export interface RandomnessRow {
  trigram: number;
  observed: number;
  observedShare: number;
  expectedShare: number;
}

export interface RandomnessReport {
  total: number;
  rows: RandomnessRow[];
  minDraws: number;
  enoughSamples: boolean;
  /** 只在樣本足夠時有值 */
  chiSquare?: number;
  pValue?: number;
  /** p < 顯著水準：差距大於一般的隨機起伏 */
  deviates?: boolean;
}

export function randomnessReport(tally: DrawTally): RandomnessReport {
  const shares = expectedShares();
  const total = tally.counts.reduce((a, b) => a + b, 0);
  const rows = tally.counts.map((observed, trigram) => ({
    trigram, observed,
    observedShare: total > 0 ? observed / total : 0,
    expectedShare: shares[trigram],
  }));
  const minDraws = minDrawsForTest();
  if (total < minDraws) return { total, rows, minDraws, enoughSamples: false };

  const chiSquare = tally.counts.reduce((sum, o, i) => {
    const e = total * shares[i];
    return sum + ((o - e) ** 2) / e;
  }, 0);
  const pValue = chiSquareSurvival(chiSquare, TRIGRAM_COUNT - 1);
  return {
    total, rows, minDraws, enoughSamples: true,
    chiSquare, pValue, deviates: pValue < SIGNIFICANCE_PCT / 100,
  };
}

/** p 值印兩位小數；太小時不印 0.00（那會被讀成「不可能」） */
export function formatP(p: number): string {
  return p < 0.01 ? '< 0.01' : `= ${p.toFixed(2)}`;
}

// ====== 卡方分佈的右尾機率 ======
//
// Q(k/2, x/2)——正規化上不完全 gamma 函數。級數與連分式兩段接起來（Numerical Recipes 的做法），
// 在本檢定的範圍內誤差遠小於畫面上印的兩位小數。

function lnGamma(z: number): number {
  // Lanczos 近似（g = 7, n = 9）
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  const x = z - 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const gln = lnGamma(a);
  if (x < a + 1) {
    // 級數求 P，再取 1 − P
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  // 連分式（Lentz）
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** 自由度 df 的卡方分佈，P(X ≥ x) */
export function chiSquareSurvival(x: number, df: number): number {
  return Math.min(1, Math.max(0, gammaQ(df / 2, x / 2)));
}
