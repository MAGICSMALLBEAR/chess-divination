// 易經學習（learning.ts）
//
// 重點：題目與答案一律對回既有的真相來源（hexagram.ts／籤詩卦名），排程照 Leitner 的規則走，
// 壞掉的進度資料不讓整頁拋錯。

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve(); }),
  },
}));

import {
  DECKS, deckCards, buildQuestion, trigramLabel, trigramLinesOf,
  applyAnswer, sessionQueue, deckSummary, addDays, normalizeLearningState,
  getLearningState, recordAnswer,
  LEITNER_INTERVALS, MAX_BOX, NEW_PER_SESSION, OPTION_COUNT, LEARNING_KEY,
  type LearningState,
} from '../services/learning';
import {
  TRIGRAM_NAMES, TRIGRAM_ELEMENTS, XIANTIAN_TO_KINGWEN,
  trigramsFromIndex, hexagramNameOf, hexagramLines, trigramFromLines, trigramsFromLines,
} from '../services/hexagram';
import { getPoemById } from '../data/poems';

/** 可重現的亂數（線性同餘），讓選項順序在測試裡固定 */
function seeded(seed = 1) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}

beforeEach(() => mockStore.clear());

describe('牌組', () => {
  test('八卦與五行各 8 張、六十四卦 64 張，id 不重複', () => {
    expect(deckCards('trigram')).toHaveLength(8);
    expect(deckCards('trigramElement')).toHaveLength(8);
    expect(deckCards('hexagram')).toHaveLength(64);
    const ids = DECKS.flatMap(d => deckCards(d).map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('六十四卦依文王卦序介紹：第一張乾、第二張坤、第三張屯，最後一張未濟', () => {
    const names = deckCards('hexagram').map(c => hexagramNameOf(...trigramsFromIndex(c.index)));
    expect(names[0]).toBe('乾為天');
    expect(names[1]).toBe('坤為地');
    expect(names[2]).toBe('水雷屯');
    expect(names[63]).toBe('火水未濟');
    deckCards('hexagram').forEach((c, i) => expect(XIANTIAN_TO_KINGWEN[c.index]).toBe(i + 1));
  });
});

describe('出題：答案對回真相來源', () => {
  test('八卦：題目的三爻還原得回同一卦，答案是那一卦的標示', () => {
    for (const card of deckCards('trigram')) {
      const q = buildQuestion(card, seeded(card.index + 1));
      expect(q.prompt.kind).toBe('lines');
      if (q.prompt.kind !== 'lines') continue;
      expect(trigramFromLines(q.prompt.lines)).toBe(card.index);
      expect(q.answer).toBe(trigramLabel(card.index));
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
    }
  });

  test('八卦五行：答案是 TRIGRAM_ELEMENTS，五個五行全列', () => {
    for (const card of deckCards('trigramElement')) {
      const q = buildQuestion(card);
      expect(q.answer).toBe(TRIGRAM_ELEMENTS[card.index]);
      expect([...q.options].sort()).toEqual(['金', '木', '水', '火', '土'].sort());
    }
  });

  test('六十四卦：六爻還原得回同一組上下卦，答案等於籤詩上的卦名', () => {
    for (const card of deckCards('hexagram')) {
      const q = buildQuestion(card, seeded(card.index + 7));
      if (q.prompt.kind !== 'lines') throw new Error('六十四卦應以卦形出題');
      const { upper, lower } = trigramsFromLines(q.prompt.lines);
      expect([upper, lower]).toEqual(trigramsFromIndex(card.index));
      expect(q.answer).toBe(getPoemById(XIANTIAN_TO_KINGWEN[card.index]).hexagramName);
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
      expect([q.upper, q.lower]).toEqual([upper, lower]);
    }
  });

  /** 只換一半的卦當干擾，才考得到是不是真的看懂六爻 */
  test('六十四卦的干擾選項至少兩個與答案共用上卦或下卦', () => {
    const allNames = Array.from({ length: 64 }, (_, i) => [hexagramNameOf(...trigramsFromIndex(i)), i] as const);
    const indexOf = new Map(allNames);
    for (const card of deckCards('hexagram')) {
      const q = buildQuestion(card, seeded(card.index + 3));
      const [u, l] = trigramsFromIndex(card.index);
      const sharing = q.options
        .filter(o => o !== q.answer)
        .filter(o => { const [ou, ol] = trigramsFromIndex(indexOf.get(o)!); return ou === u || ol === l; });
      expect(sharing.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('卦形與 hexagramLines 同一個慣例（索引 0 為初爻）', () => {
    const q = buildQuestion({ id: 'hexagram:40', deck: 'hexagram', index: 40 });
    if (q.prompt.kind !== 'lines') throw new Error();
    expect(q.prompt.lines).toEqual(hexagramLines(...trigramsFromIndex(40)));
    expect(trigramLinesOf(3)).toEqual(hexagramLines(3, 3).slice(0, 3));
  });

  test('八卦標示是「卦名・象」', () => {
    expect(TRIGRAM_NAMES.map((_, i) => trigramLabel(i))).toEqual(
      ['乾・天', '兌・澤', '離・火', '震・雷', '巽・風', '坎・水', '艮・山', '坤・地']);
  });
});

describe('排程（Leitner）', () => {
  const TODAY = '2026-09-25';

  test('新卡答對進第一格、隔 1 天；連續答對一路升到最後一格，不會超過', () => {
    let p = applyAnswer(undefined, true, TODAY);
    expect(p).toMatchObject({ box: 1, due: '2026-09-26', reviews: 1, lapses: 0 });
    for (let i = 2; i <= MAX_BOX + 2; i++) p = applyAnswer(p, true, TODAY);
    expect(p.box).toBe(MAX_BOX);
    expect(p.due).toBe(addDays(TODAY, LEITNER_INTERVALS[MAX_BOX - 1]));
  });

  test('答錯回第一格、隔天再來，並記一次失誤', () => {
    const p = applyAnswer({ box: 4, due: TODAY, reviews: 5, lapses: 0 }, false, TODAY);
    expect(p).toMatchObject({ box: 1, due: '2026-09-26', reviews: 6, lapses: 1 });
  });

  test('間隔一格比一格長', () => {
    for (let i = 1; i < LEITNER_INTERVALS.length; i++) {
      expect(LEITNER_INTERVALS[i]).toBeGreaterThan(LEITNER_INTERVALS[i - 1]);
    }
  });

  test('addDays 以當地日曆跨月、跨年', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 16)).toBe('2027-01-16');
  });

  test('練習順序：到期的複習（最早的先）排在新卡前面，新卡最多 NEW_PER_SESSION 張', () => {
    const state: LearningState = {
      'hexagram:0': { box: 2, due: '2026-09-24', reviews: 2, lapses: 0 },
      'hexagram:63': { box: 1, due: '2026-09-20', reviews: 1, lapses: 1 },
      'hexagram:9': { box: 3, due: '2026-10-05', reviews: 3, lapses: 0 },  // 還沒到期
    };
    const queue = sessionQueue('hexagram', state, TODAY);
    expect(queue.slice(0, 2).map(c => c.id)).toEqual(['hexagram:63', 'hexagram:0']);
    const fresh = queue.slice(2);
    expect(fresh).toHaveLength(NEW_PER_SESSION);
    expect(fresh.every(c => !state[c.id])).toBe(true);
    expect(queue.some(c => c.id === 'hexagram:9')).toBe(false);
  });

  test('全部學過且都沒到期：這次沒有題目', () => {
    const state: LearningState = Object.fromEntries(
      deckCards('trigram').map(c => [c.id, { box: 3, due: '2026-10-01', reviews: 3, lapses: 0 }]));
    expect(sessionQueue('trigram', state, TODAY)).toEqual([]);
    expect(deckSummary('trigram', state, TODAY)).toEqual({ total: 8, seen: 8, mastered: 0, due: 0 });
  });

  test('摘要：精熟＝在最後一格；待複習不含新卡', () => {
    const state: LearningState = {
      'trigram:0': { box: MAX_BOX, due: '2026-09-25', reviews: 9, lapses: 0 },
      'trigram:1': { box: 1, due: '2026-09-30', reviews: 1, lapses: 0 },
    };
    expect(deckSummary('trigram', state, TODAY)).toEqual({ total: 8, seen: 2, mastered: 1, due: 1 });
  });
});

describe('儲存', () => {
  test('記下作答後讀得回來', async () => {
    await recordAnswer('trigram:2', true, '2026-09-25');
    expect((await getLearningState())['trigram:2']).toMatchObject({ box: 1, due: '2026-09-26' });
  });

  test('壞掉的整份資料：當成還沒學過，不拋錯', async () => {
    mockStore.set(LEARNING_KEY, '{not json');
    await expect(getLearningState()).resolves.toEqual({});
  });

  test('壞掉的單張卡片被丟掉，其他的保留', () => {
    const state = normalizeLearningState({
      'trigram:0': { box: 2, due: '2026-09-30', reviews: 2, lapses: 0 },
      'trigram:1': { box: 9, due: '2026-09-30' },          // 格數越界
      'trigram:2': { box: 1, due: 'tomorrow' },            // 日期格式不對
      'trigram:3': null,
      'trigram:4': { box: 1, due: '2026-09-30' },          // 缺計數：補 0
    });
    expect(Object.keys(state).sort()).toEqual(['trigram:0', 'trigram:4']);
    expect(state['trigram:4']).toEqual({ box: 1, due: '2026-09-30', reviews: 0, lapses: 0 });
    expect(normalizeLearningState([1, 2])).toEqual({});
  });
});
