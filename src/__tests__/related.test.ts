// 同一件事的占卜（路線圖 #11）— 服務層
//
// 每一條斷言都對應一個設計決定，理由寫在各條上。核心是「不猜」：
// 程式只在問題文字完全相同時建議，其餘一律交給使用者；連結只指向更早的記錄。

import {
  normalizeQuestion, isSameQuestion, isSameCategory,
  relatedCandidates, suggestedPrevious, resolvePrevious, laterAsks, linkedRecordIds,
  summarizeReading, compareReadings, formatShortDate,
  RELATED_CANDIDATE_LIMIT,
} from '../services/related';
import type { DivinationRecord } from '../services/storage';

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 19, 12, 0, 0).getTime();

let seq = 0;
function rec(over: Partial<DivinationRecord> = {}): DivinationRecord {
  return {
    id: `r${seq++}`,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: ['king'], drawnPieceColors: ['red'], drawnPieceChars: ['帥'],
    mode: 'draw', timestamp: NOW - DAY, isFavorited: false, engineVersion: 4,
    ...over,
  };
}
/** 有完整六爻卦例資料的記錄 */
function liuyao(hexagramIndex: number, movingLine: number, over: Partial<DivinationRecord> = {}) {
  return rec({ hexagramIndex, movingLine, ...over });
}

describe('問題與類別的比對', () => {
  test('問題相同：忽略空白與英文大小寫，只做到這裡', () => {
    expect(normalizeQuestion('  我該 換工作嗎 ？ ')).toBe('我該換工作嗎？');
    expect(isSameQuestion({ questionText: '我該換工作嗎' }, { questionText: ' 我該 換工作嗎 ' })).toBe(true);
    expect(isSameQuestion({ questionText: 'Will I pass?' }, { questionText: 'will i PASS?' })).toBe(true);
  });

  /**
   * 「差不多」的問題不是「相同」的問題。加了標點、換了說法都不算——
   * 那條線要留給使用者自己劃，程式一旦開始猜，就會把兩件無關的事說成同一件。
   */
  test('稍微換個說法就不算相同（不做相似度）', () => {
    expect(isSameQuestion({ questionText: '我該換工作嗎' }, { questionText: '我要不要換工作' })).toBe(false);
    expect(isSameQuestion({ questionText: '我該換工作嗎' }, { questionText: '我該換工作嗎？' })).toBe(false);
  });

  test('兩邊都沒填問題不算相同：空等於空沒有資訊量', () => {
    expect(isSameQuestion({}, {})).toBe(false);
    expect(isSameQuestion({ questionText: '' }, { questionText: '   ' })).toBe(false);
    expect(isSameQuestion({ questionText: '我該換工作嗎' }, {})).toBe(false);
  });

  test('類別相同：子領域先映回主類別；任一邊沒填則為否', () => {
    expect(isSameCategory({ questionCategory: 'relationship' }, { questionCategory: 'marriage' })).toBe(true);
    expect(isSameCategory({ questionCategory: 'career' }, { questionCategory: 'wealth' })).toBe(false);
    // 都沒填不能算「同一類」
    expect(isSameCategory({}, {})).toBe(false);
    expect(isSameCategory({ questionCategory: 'career' }, {})).toBe(false);
  });
});

describe('relatedCandidates', () => {
  test('只列比這次更早的記錄，不含自己——連結永遠是新指向舊，所以不可能成環', () => {
    const current = rec({ id: 'cur', timestamp: NOW });
    const older = rec({ id: 'old', timestamp: NOW - 5 * DAY });
    const newer = rec({ id: 'new', timestamp: NOW + DAY });
    const sameTime = rec({ id: 'same', timestamp: NOW });

    const ids = relatedCandidates(current, [current, older, newer, sameTime]).map(c => c.record.id);
    expect(ids).toEqual(['old']);
  });

  test('排序：同題 > 同類別 > 其餘，同級再由近而遠', () => {
    const current = rec({ id: 'cur', timestamp: NOW, questionText: '要不要換工作', questionCategory: 'career' });
    const plainNewest = rec({ id: 'plainNewest', timestamp: NOW - 1 * DAY });
    const catOld = rec({ id: 'catOld', timestamp: NOW - 20 * DAY, questionCategory: 'career' });
    const catNew = rec({ id: 'catNew', timestamp: NOW - 10 * DAY, questionCategory: 'career' });
    const sameQOldest = rec({ id: 'sameQ', timestamp: NOW - 90 * DAY, questionText: '要不要 換工作', questionCategory: 'wealth' });

    const out = relatedCandidates(current, [plainNewest, catOld, catNew, sameQOldest, current]);
    expect(out.map(c => c.record.id)).toEqual(['sameQ', 'catNew', 'catOld', 'plainNewest']);
    expect(out[0]).toMatchObject({ sameQuestion: true, sameCategory: false });
    expect(out[1]).toMatchObject({ sameQuestion: false, sameCategory: true });
  });

  test('最多列 RELATED_CANDIDATE_LIMIT 筆；同一時間的以 id 定序，不隨輸入順序漂移', () => {
    const current = rec({ id: 'cur', timestamp: NOW });
    const many = Array.from({ length: RELATED_CANDIDATE_LIMIT + 10 }, (_, i) =>
      rec({ id: `m${String(i).padStart(3, '0')}`, timestamp: NOW - (i + 1) * DAY }));
    expect(relatedCandidates(current, many)).toHaveLength(RELATED_CANDIDATE_LIMIT);

    const a = rec({ id: 'a', timestamp: NOW - DAY });
    const b = rec({ id: 'b', timestamp: NOW - DAY });
    expect(relatedCandidates(current, [b, a]).map(c => c.record.id))
      .toEqual(relatedCandidates(current, [a, b]).map(c => c.record.id));
  });
});

describe('suggestedPrevious（唯一的自動行為：只建議）', () => {
  test('有更早的記錄問了完全相同的問題：建議最近的那一筆', () => {
    const current = rec({ id: 'cur', timestamp: NOW, questionText: '我該換工作嗎' });
    const older = rec({ id: 'older', timestamp: NOW - 30 * DAY, questionText: '我該換工作嗎' });
    const recent = rec({ id: 'recent', timestamp: NOW - 3 * DAY, questionText: '我該換工作嗎' });
    expect(suggestedPrevious(current, [current, older, recent])?.id).toBe('recent');
  });

  test('同類別但問題不同：不建議（那是使用者的判斷，不是程式的）', () => {
    const current = rec({ id: 'cur', timestamp: NOW, questionText: '我該換工作嗎', questionCategory: 'career' });
    const other = rec({ timestamp: NOW - DAY, questionText: '這份工作能做多久', questionCategory: 'career' });
    expect(suggestedPrevious(current, [current, other])).toBeNull();
  });

  test('已經連結過就不再建議', () => {
    const older = rec({ id: 'older', timestamp: NOW - DAY, questionText: '同一句' });
    const current = rec({ id: 'cur', timestamp: NOW, questionText: '同一句', relatedTo: 'older' });
    expect(suggestedPrevious(current, [older, current])).toBeNull();
  });

  test('更晚的記錄問了相同問題不算：只回顧過去，不指向未來', () => {
    const current = rec({ id: 'cur', timestamp: NOW, questionText: '同一句' });
    const later = rec({ id: 'later', timestamp: NOW + DAY, questionText: '同一句' });
    expect(suggestedPrevious(current, [current, later])).toBeNull();
  });
});

describe('resolvePrevious / laterAsks', () => {
  test('連結指到的記錄找得到：回傳它', () => {
    const older = rec({ id: 'older', timestamp: NOW - 2 * DAY });
    const current = rec({ id: 'cur', timestamp: NOW, relatedTo: 'older' });
    expect(resolvePrevious(current, [older, current])?.id).toBe('older');
  });

  /**
   * 不信任儲存的 id：指到的記錄被刪、手改的備份、同步合併的殘留都可能讓它指不到東西
   * 或指到一筆更晚的記錄。顯示端寧可少顯示，也不顯示一條錯的關係。
   */
  test('指不到、或指到不是更早的記錄：當作沒有連結', () => {
    const current = rec({ id: 'cur', timestamp: NOW, relatedTo: 'gone' });
    expect(resolvePrevious(current, [current])).toBeNull();

    const newer = rec({ id: 'newer', timestamp: NOW + DAY });
    const bad = rec({ id: 'bad', timestamp: NOW, relatedTo: 'newer' });
    expect(resolvePrevious(bad, [bad, newer])).toBeNull();

    expect(resolvePrevious(rec({ id: 'plain' }), [])).toBeNull();
  });

  test('之後又連結到這一筆的，由舊到新', () => {
    const base = rec({ id: 'base', timestamp: NOW - 20 * DAY });
    const second = rec({ id: 'second', timestamp: NOW - 10 * DAY, relatedTo: 'base' });
    const third = rec({ id: 'third', timestamp: NOW - 5 * DAY, relatedTo: 'base' });
    const stranger = rec({ id: 'stranger', timestamp: NOW - DAY });
    expect(laterAsks(base, [third, stranger, second, base]).map(r => r.id)).toEqual(['second', 'third']);
  });
});

/**
 * 收藏頁卡片上的「同一件事」標記（S76 補完）。規則必須與 resolvePrevious 一致：
 * 卡片標著有連結、點進去卻什麼都沒有，是比不標更糟的謊話。
 */
describe('linkedRecordIds（清單畫面一次算完）', () => {
  test('有效連結的兩端都算，無關的記錄不算', () => {
    const older = rec({ id: 'older', timestamp: NOW - 2 * DAY });
    const cur = rec({ id: 'cur', timestamp: NOW, relatedTo: 'older' });
    const stranger = rec({ id: 'stranger', timestamp: NOW - DAY });
    expect([...linkedRecordIds([cur, stranger, older])].sort()).toEqual(['cur', 'older']);
  });

  test('指不到或指到更晚的記錄：兩端都不算（與 resolvePrevious 同一條規則）', () => {
    const newer = rec({ id: 'newer', timestamp: NOW + DAY });
    const bad = rec({ id: 'bad', timestamp: NOW, relatedTo: 'newer' });
    const dangling = rec({ id: 'dangling', timestamp: NOW, relatedTo: 'gone' });
    expect(linkedRecordIds([newer, bad, dangling]).size).toBe(0);
  });

  test('與 resolvePrevious／laterAsks 逐筆一致', () => {
    const all = [
      rec({ id: 'a', timestamp: NOW - 9 * DAY }),
      rec({ id: 'b', timestamp: NOW - 5 * DAY, relatedTo: 'a' }),
      rec({ id: 'c', timestamp: NOW - 3 * DAY, relatedTo: 'a' }),
      rec({ id: 'd', timestamp: NOW - 2 * DAY, relatedTo: 'zzz' }),
      rec({ id: 'e', timestamp: NOW - 8 * DAY, relatedTo: 'c' }),
      rec({ id: 'f', timestamp: NOW - DAY }),
    ];
    const set = linkedRecordIds(all);
    for (const r of all) {
      const expected = resolvePrevious(r, all) !== null || laterAsks(r, all).length > 0;
      expect([r.id, set.has(r.id)]).toEqual([r.id, expected]);
    }
  });
});

describe('summarizeReading / compareReadings', () => {
  test('六爻記錄：給本卦、變卦、動爻與綜合斷語', () => {
    const s = summarizeReading(liuyao(0, 3));
    expect(s.name).toBeTruthy();
    expect(s.changedName).toBeTruthy();
    expect(s.movingLineName).toBeTruthy();
    expect(s.level).toMatch(/大吉|吉|平|小凶|凶/);
  });

  /**
   * 備份還原可能帶進越界或損毀的卦象資料，reveal.tsx 早就擋了；這裡若沒擋，
   * 一筆壞記錄會在並列比較時直接紅屏。舊版（v1）卦序有誤，也不能拿來重算。
   */
  test('越界、損毀或舊版（v1）的卦象資料：只給名稱，不重算、不拋錯', () => {
    for (const bad of [
      liuyao(99, 3), liuyao(-1, 3), liuyao(0, 0), liuyao(0, 7),
      liuyao(0, 3, { timestamp: NaN }), liuyao(0, 3, { engineVersion: undefined }),
    ]) {
      const bad2 = { ...bad, hexagramName: '某卦' };
      expect(() => summarizeReading(bad2)).not.toThrow();
      expect(summarizeReading(bad2)).toEqual({ name: '某卦' });
    }
  });

  test('靈棋記錄：名稱取卦目名，沒有六爻欄位', () => {
    const s = summarizeReading(rec({ mode: 'lingqi', poemId: 0, poemTitle: '大通卦', hexagramIndex: 0, movingLine: 3 }));
    expect(s).toEqual({ name: '大通卦' });
  });

  test('同一張盤：本卦、變卦、動爻都相同', () => {
    const cmp = compareReadings(liuyao(10, 2, { timestamp: NOW - 9 * DAY }), liuyao(10, 2, { timestamp: NOW }));
    expect(cmp).toEqual({ comparable: true, samePrimary: true, sameChanged: true, sameMoving: true });
  });

  test('本卦相同、動爻不同：不是同一張盤（只看卦名會漏掉這個差別）', () => {
    const cmp = compareReadings(liuyao(10, 2), liuyao(10, 5));
    expect(cmp.samePrimary).toBe(true);
    expect(cmp.sameMoving).toBe(false);
    expect(cmp.sameChanged).toBe(false);
  });

  test('本卦不同', () => {
    const cmp = compareReadings(liuyao(10, 2), liuyao(11, 2));
    expect(cmp.samePrimary).toBe(false);
  });

  test('六爻對靈棋：不可逐項比，不說相同或不同', () => {
    const lingqi = rec({ mode: 'lingqi', poemId: 0, poemTitle: '大通卦' });
    expect(compareReadings(liuyao(0, 3), lingqi)).toEqual({
      comparable: false, samePrimary: false, sameChanged: null, sameMoving: null,
    });
  });

  test('任一邊缺卦例資料：變卦與動爻說不出相同或不同，就回 null', () => {
    const noData = rec({ hexagramName: '乾為天', engineVersion: undefined });
    const cmp = compareReadings(noData, liuyao(0, 3));
    expect(cmp.sameChanged).toBeNull();
    expect(cmp.sameMoving).toBeNull();
  });

  test('重算用記錄自己的時間：同一筆記錄不隨「現在」變', () => {
    const a = summarizeReading(liuyao(10, 2, { timestamp: new Date(2026, 0, 15).getTime() }));
    const b = summarizeReading(liuyao(10, 2, { timestamp: new Date(2026, 0, 15).getTime() }));
    expect(a).toEqual(b);
  });
});

describe('formatShortDate', () => {
  test('依語言格式化，且含年份', () => {
    const ts = new Date(2026, 8, 19).getTime();
    expect(formatShortDate(ts, 'zh-TW')).toContain('2026');
    expect(formatShortDate(ts, 'en')).toContain('2026');
    expect(formatShortDate(ts, 'ja')).toContain('2026');
    // 不認得的語言退回 zh-TW，不拋錯
    expect(() => formatShortDate(ts, 'xx')).not.toThrow();
  });
});
