// 易經學習模式 — 抽認卡＋間隔重複（Leitner）
//
// 為什麼做：App 的盤面上印著八卦、六十四卦與五行，詞典能解釋術語，卻沒辦法讓人「記住」。
// 抽認卡配間隔重複是教育上成熟的做法：答對的卡片間隔拉長，答錯的回到隔天，
// 把練習時間花在還沒記住的那幾張上。
//
// 取法上刻意保守（與 App 其他地方同一個原則：不猜）：
//   - 題目與答案**全部取自既有的真相來源**（hexagram.ts 的卦名、卦象、五行，籤詩的卦名），
//     不另寫一份卦資料——兩份資料遲早會對不上。
//   - 排程用最簡單、說得清楚的 Leitner 五格，不用 SM-2 這類要調參數的演算法：
//     使用者看得懂「答對了下次隔幾天」，才會信任它排出來的複習。
//   - 進度只存本機（並納入備份），不進雲端同步：同步的合併規則是為占卜記錄訂的，
//     學習進度要合併得另訂一套，這一版不做半套。
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TRIGRAM_NAMES, TRIGRAM_SYMBOLS, TRIGRAM_ELEMENTS, XIANTIAN_TO_KINGWEN,
  trigramsFromIndex, hexagramNameOf, hexagramLines, trigramLine, type LineValue,
} from './hexagram';

export const LEARNING_KEY = '@chess_divination_learning';

// ====== 牌組 ======

export type DeckId = 'trigram' | 'trigramElement' | 'hexagram';

/** 牌組的呈現順序：先認八卦，再記五行，最後才是由八卦組成的六十四卦 */
export const DECKS: readonly DeckId[] = ['trigram', 'trigramElement', 'hexagram'] as const;

export interface Card {
  /** `${deck}:${index}`，存進進度表的鍵 */
  id: string;
  deck: DeckId;
  /** 八卦牌：卦序 0–7（乾兌離震巽坎艮坤）；六十四卦牌：先天序索引 0–63 */
  index: number;
}

/**
 * 牌組裡的卡片，依「介紹新卡」的順序排列。
 * 八卦依先天序（乾兌離震巽坎艮坤）；六十四卦依文王卦序（乾、坤、屯、蒙…），
 * 那是讀《易》的人熟悉的順序，也是本 App 籤詩的編號。
 */
export function deckCards(deck: DeckId): Card[] {
  if (deck === 'hexagram') {
    return Array.from({ length: 64 }, (_, i) => i)
      .sort((a, b) => XIANTIAN_TO_KINGWEN[a] - XIANTIAN_TO_KINGWEN[b])
      .map(index => ({ id: `${deck}:${index}`, deck, index }));
  }
  return TRIGRAM_NAMES.map((_, index) => ({ id: `${deck}:${index}`, deck, index }));
}

/** 八卦的標示：卦名・自然象（如「乾・天」），答案與選項用同一種寫法 */
export function trigramLabel(trigram: number): string {
  return `${TRIGRAM_NAMES[trigram]}・${TRIGRAM_SYMBOLS[trigram]}`;
}

/** 八卦的三爻，索引 0 為初爻（最下）——與 HexagramLines 的慣例相同 */
export function trigramLinesOf(trigram: number): LineValue[] {
  return [trigramLine(trigram, 1), trigramLine(trigram, 2), trigramLine(trigram, 3)];
}

const ELEMENTS = ['金', '木', '水', '火', '土'] as const;

// ====== 出題 ======

export type QuestionPrompt =
  | { kind: 'lines'; lines: LineValue[] }
  | { kind: 'trigram'; trigram: number };

export interface Question {
  card: Card;
  prompt: QuestionPrompt;
  options: string[];
  answer: string;
  /**
   * 答完之後的解說素材（畫面負責組句）。六十四卦給上下卦，讓人看出「卦名＝上卦象＋下卦象」；
   * 五行牌給卦名，八卦牌給卦象——都是換個方向再看一次答案，不另外寫說明文字。
   */
  upper?: number;
  lower?: number;
}

/** 可注入的亂數來源（測試要可重現）；預設 Math.random */
export type Rng = () => number;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 八卦與六十四卦都給四個選項：少了太好猜，多了在手機上擠 */
export const OPTION_COUNT = 4;

export function buildQuestion(card: Card, rng: Rng = Math.random): Question {
  if (card.deck === 'trigram') {
    const answer = trigramLabel(card.index);
    const others = shuffle(TRIGRAM_NAMES.map((_, i) => i).filter(i => i !== card.index), rng)
      .slice(0, OPTION_COUNT - 1).map(trigramLabel);
    return {
      card, prompt: { kind: 'lines', lines: trigramLinesOf(card.index) },
      options: shuffle([answer, ...others], rng), answer,
    };
  }

  if (card.deck === 'trigramElement') {
    // 五行只有五個值，全列出來——從五個裡挑兩個出來當干擾，反而是在替使用者刪去答案
    return {
      card, prompt: { kind: 'trigram', trigram: card.index },
      options: [...ELEMENTS], answer: TRIGRAM_ELEMENTS[card.index],
    };
  }

  const [upper, lower] = trigramsFromIndex(card.index);
  const answer = hexagramNameOf(upper, lower);
  // 干擾選項優先挑「上卦或下卦相同」的卦：只換一半的卦，才考得到是不是真的看懂六爻；
  // 隨便抽三個不相干的卦名，看上卦就能猜中
  const sharing = shuffle(
    Array.from({ length: 64 }, (_, i) => i).filter(i => {
      if (i === card.index) return false;
      const [u, l] = trigramsFromIndex(i);
      return u === upper || l === lower;
    }),
    rng,
  ).slice(0, 2);
  const rest = shuffle(
    Array.from({ length: 64 }, (_, i) => i).filter(i => i !== card.index && !sharing.includes(i)),
    rng,
  ).slice(0, OPTION_COUNT - 1 - sharing.length);
  const others = [...sharing, ...rest].map(i => hexagramNameOf(...trigramsFromIndex(i)));
  return {
    card, prompt: { kind: 'lines', lines: hexagramLines(upper, lower) },
    options: shuffle([answer, ...others], rng), answer, upper, lower,
  };
}

// ====== 排程（Leitner 五格） ======

/**
 * 每一格的複習間隔（天）。答對升一格，答錯回第一格。
 * 第五格是「精熟」——仍會每 16 天回來一次，不是永遠不再出現。
 */
export const LEITNER_INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = LEITNER_INTERVALS.length;

/** 每次練習最多加入幾張沒學過的新卡：一次塞太多新卡，隔天的複習量會一口氣爆開 */
export const NEW_PER_SESSION = 5;

export interface CardProgress {
  /** 1–MAX_BOX */
  box: number;
  /** 下次該複習的當地日期 YYYY-MM-DD */
  due: string;
  reviews: number;
  lapses: number;
}

export type LearningState = Record<string, CardProgress>;

/** YYYY-MM-DD 加 n 天（以當地日曆計，與 date.ts 同一理由不用毫秒相加） */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function applyAnswer(prev: CardProgress | undefined, correct: boolean, today: string): CardProgress {
  const box = correct ? Math.min(MAX_BOX, (prev?.box ?? 0) + 1) : 1;
  return {
    box,
    due: addDays(today, LEITNER_INTERVALS[box - 1]),
    reviews: (prev?.reviews ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
  };
}

/**
 * 這次練習要做哪些卡：先是到期的複習（最早到期的先），再補最多 NEW_PER_SESSION 張新卡
 * （依牌組的介紹順序）。複習排在新卡前面：該複習的沒複習，比少學一張新卡損失大。
 */
export function sessionQueue(
  deck: DeckId,
  state: LearningState,
  today: string,
  newLimit: number = NEW_PER_SESSION,
): Card[] {
  const cards = deckCards(deck);
  const due = cards
    .filter(c => state[c.id] && state[c.id].due <= today)
    .sort((a, b) => (state[a.id].due < state[b.id].due ? -1 : state[a.id].due > state[b.id].due ? 1 : 0));
  const fresh = cards.filter(c => !state[c.id]).slice(0, newLimit);
  return [...due, ...fresh];
}

export interface DeckSummary {
  total: number;
  /** 學過（至少答過一次）的張數 */
  seen: number;
  /** 在最後一格的張數 */
  mastered: number;
  /** 今天到期要複習的張數（不含新卡） */
  due: number;
}

export function deckSummary(deck: DeckId, state: LearningState, today: string): DeckSummary {
  const cards = deckCards(deck);
  const seen = cards.filter(c => state[c.id]);
  return {
    total: cards.length,
    seen: seen.length,
    mastered: seen.filter(c => state[c.id].box >= MAX_BOX).length,
    due: seen.filter(c => state[c.id].due <= today).length,
  };
}

// ====== 儲存 ======

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 讀回來的資料一律逐筆檢查：備份還原或手改的檔案可能帶進壞值，
 * 壞的那一筆當成沒學過（重新當新卡），而不是讓整頁拋錯。
 */
export function normalizeLearningState(raw: unknown): LearningState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: LearningState = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = v as Partial<CardProgress> | null;
    if (
      p && typeof p === 'object'
      && Number.isInteger(p.box) && p.box! >= 1 && p.box! <= MAX_BOX
      && typeof p.due === 'string' && DAY_RE.test(p.due)
    ) {
      out[id] = {
        box: p.box!, due: p.due,
        reviews: Number.isInteger(p.reviews) ? p.reviews! : 0,
        lapses: Number.isInteger(p.lapses) ? p.lapses! : 0,
      };
    }
  }
  return out;
}

export async function getLearningState(): Promise<LearningState> {
  try {
    const raw = await AsyncStorage.getItem(LEARNING_KEY);
    return raw ? normalizeLearningState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** 記下一題的作答結果，回傳更新後的整份進度 */
export async function recordAnswer(cardId: string, correct: boolean, today: string): Promise<LearningState> {
  const state = await getLearningState();
  state[cardId] = applyAnswer(state[cardId], correct, today);
  await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify(state));
  return state;
}
