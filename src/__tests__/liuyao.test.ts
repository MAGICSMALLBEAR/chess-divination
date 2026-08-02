import {
  hexagramLines, trigramLine, trigramsFromLines,
  lineName, hexagramIndex, YANG, YIN,
} from '../services/hexagram';
import { buildLiuYaoReading, summarizeReading } from '../services/liuyao';
import { computeHexagram } from '../services/divination';
import { ALL_PIECES } from '../data/pieces';
import { hourBranchNumber, hourBranchName } from '../services/date';

// 先天序：0乾 1兌 2離 3震 4巽 5坎 6艮 7坤
const QIAN = 0, DUI = 1, LI = 2, ZHEN = 3, XUN = 4, KAN = 5, GEN = 6, KUN = 7;

describe('六爻推導', () => {
  test('pure trigrams should have the expected lines', () => {
    // 乾三爻皆陽、坤三爻皆陰
    expect([1, 2, 3].map(p => trigramLine(QIAN, p as 1 | 2 | 3))).toEqual([YANG, YANG, YANG]);
    expect([1, 2, 3].map(p => trigramLine(KUN, p as 1 | 2 | 3))).toEqual([YIN, YIN, YIN]);
    // 震☳ 一陽在下
    expect([1, 2, 3].map(p => trigramLine(ZHEN, p as 1 | 2 | 3))).toEqual([YANG, YIN, YIN]);
    // 艮☶ 一陽在上
    expect([1, 2, 3].map(p => trigramLine(GEN, p as 1 | 2 | 3))).toEqual([YIN, YIN, YANG]);
    // 坎☵ 一陽居中
    expect([1, 2, 3].map(p => trigramLine(KAN, p as 1 | 2 | 3))).toEqual([YIN, YANG, YIN]);
    // 離☲ 一陰居中
    expect([1, 2, 3].map(p => trigramLine(LI, p as 1 | 2 | 3))).toEqual([YANG, YIN, YANG]);
    // 兌☱ 一陰在上
    expect([1, 2, 3].map(p => trigramLine(DUI, p as 1 | 2 | 3))).toEqual([YANG, YANG, YIN]);
    // 巽☴ 一陰在下
    expect([1, 2, 3].map(p => trigramLine(XUN, p as 1 | 2 | 3))).toEqual([YIN, YANG, YANG]);
  });

  test('水雷屯 should match the traditional line pattern', () => {
    // 屯 ䷂：初九、六二、六三、六四、九五、上六
    expect(hexagramLines(KAN, ZHEN)).toEqual([YANG, YIN, YIN, YIN, YANG, YIN]);
  });

  test('lines and trigrams should round-trip for all 64 hexagrams', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        const lines = hexagramLines(upper, lower);
        expect(lines).toHaveLength(6);
        expect(trigramsFromLines(lines)).toEqual({ upper, lower });
      }
    }
  });

  test('line names should follow 初/上 and 九/六 conventions', () => {
    const qianLines = hexagramLines(QIAN, QIAN);
    expect(lineName(qianLines, 1)).toBe('初九');
    expect(lineName(qianLines, 2)).toBe('九二');
    expect(lineName(qianLines, 6)).toBe('上九');

    const kunLines = hexagramLines(KUN, KUN);
    expect(lineName(kunLines, 1)).toBe('初六');
    expect(lineName(kunLines, 3)).toBe('六三');
    expect(lineName(kunLines, 6)).toBe('上六');
  });
});

describe('變卦與互卦', () => {
  test('changed hexagram should differ from the primary by exactly one line', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let moving = 1; moving <= 6; moving++) {
          const { primary, changed } = buildLiuYaoReading(upper, lower, moving);
          const diffs = primary.lines.filter((v, i) => v !== changed.lines[i]);
          expect(diffs).toHaveLength(1);
          expect(primary.lines[moving - 1]).not.toBe(changed.lines[moving - 1]);
        }
      }
    }
  });

  test('flipping the moving line twice should return to the primary hexagram', () => {
    const first = buildLiuYaoReading(KAN, ZHEN, 2);
    const back = buildLiuYaoReading(
      first.changed.upper, first.changed.lower, 2,
    );
    expect(back.changed.index).toBe(hexagramIndex(KAN, ZHEN));
  });

  test('nuclear hexagram of 乾為天 is 乾為天, of 坤為地 is 坤為地', () => {
    expect(buildLiuYaoReading(QIAN, QIAN, 1).nuclear.name).toBe('乾為天');
    expect(buildLiuYaoReading(KUN, KUN, 1).nuclear.name).toBe('坤為地');
  });

  test('nuclear hexagram of 水雷屯 is 山地剝', () => {
    // 屯卦二三四爻為坤、三四五爻為艮，互卦即山地剝
    const { nuclear } = buildLiuYaoReading(KAN, ZHEN, 1);
    expect(nuclear.lower).toBe(KUN);
    expect(nuclear.upper).toBe(GEN);
    expect(nuclear.name).toBe('山地剝');
  });

  test('every reading should produce valid hexagrams', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let moving = 1; moving <= 6; moving++) {
          const r = buildLiuYaoReading(upper, lower, moving);
          [r.primary, r.changed, r.nuclear].forEach(h => {
            expect(h.poemId).toBeGreaterThanOrEqual(1);
            expect(h.poemId).toBeLessThanOrEqual(64);
            expect(h.name).toBeTruthy();
          });
        }
      }
    }
  });
});

describe('體用生剋', () => {
  test('the moving line decides which trigram is 用', () => {
    for (let moving = 1; moving <= 3; moving++) {
      const r = buildLiuYaoReading(KAN, ZHEN, moving);
      expect(r.bodyUse.use).toBe(ZHEN);   // 動在下卦 → 下卦為用
      expect(r.bodyUse.body).toBe(KAN);
    }
    for (let moving = 4; moving <= 6; moving++) {
      const r = buildLiuYaoReading(KAN, ZHEN, moving);
      expect(r.bodyUse.use).toBe(KAN);    // 動在上卦 → 上卦為用
      expect(r.bodyUse.body).toBe(ZHEN);
    }
  });

  test('all five 體用 relations should be reachable', () => {
    const relations = new Set<string>();
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let moving = 1; moving <= 6; moving++) {
          relations.add(buildLiuYaoReading(upper, lower, moving).bodyUse.relation);
        }
      }
    }
    expect(relations).toEqual(
      new Set(['用生體', '體剋用', '體用比和', '體生用', '用剋體']),
    );
  });

  test('same-element body and use must be 比和', () => {
    // 乾與兌同屬金
    const r = buildLiuYaoReading(QIAN, DUI, 1);
    expect(r.bodyUse.relation).toBe('體用比和');
    expect(r.bodyUse.level).toBe('吉');
  });

  test('用生體 should be the most favourable', () => {
    // 體為震(木)、用為坎(水)，水生木
    const r = buildLiuYaoReading(ZHEN, KAN, 1); // 動在下卦坎 → 用為坎
    expect(r.bodyUse.body).toBe(ZHEN);
    expect(r.bodyUse.use).toBe(KAN);
    expect(r.bodyUse.relation).toBe('用生體');
    expect(r.bodyUse.level).toBe('大吉');
  });

  test('summary should mention all three hexagrams', () => {
    const r = buildLiuYaoReading(KAN, ZHEN, 3);
    const text = summarizeReading(r);
    expect(text).toContain(r.primary.name);
    expect(text).toContain(r.nuclear.name);
    expect(text).toContain(r.changed.name);
    expect(text).toContain(r.movingLineName);
  });
});

describe('起卦動爻', () => {
  test('every draw should yield a moving line between 1 and 6', () => {
    for (const a of ALL_PIECES) {
      for (const b of ALL_PIECES) {
        const hex = computeHexagram([a, b], { hourBranch: 7 });
        expect(hex.movingLine).toBeGreaterThanOrEqual(1);
        expect(hex.movingLine).toBeLessThanOrEqual(6);
      }
    }
  });

  test('all six moving lines should be reachable', () => {
    const seen = new Set<number>();
    for (const a of ALL_PIECES) {
      for (const b of ALL_PIECES) {
        for (let hour = 1; hour <= 12; hour++) {
          seen.add(computeHexagram([a, b], { hourBranch: hour }).movingLine);
        }
      }
    }
    expect(seen.size).toBe(6);
  });

  test('the hour branch must affect the moving line', () => {
    const pieces = [ALL_PIECES[0], ALL_PIECES[1]];
    const atHour1 = computeHexagram(pieces, { hourBranch: 1 }).movingLine;
    const atHour2 = computeHexagram(pieces, { hourBranch: 2 }).movingLine;
    expect(atHour1).not.toBe(atHour2);
  });

  /**
   * 迴歸（A6）：舊版棋盤模式只把 col/row 拿去產生文字敘述，
   * 擺在九宮還是角落得到完全一樣的卦。
   */
  test('board position must affect the moving line', () => {
    const pieces = [ALL_PIECES[0], ALL_PIECES[1]];
    const results = new Set<number>();
    for (let extra = 0; extra < 6; extra++) {
      results.add(computeHexagram(pieces, { hourBranch: 7, extra }).movingLine);
    }
    expect(results.size).toBe(6);
  });

  test('the hexagram itself should not depend on the hour or position', () => {
    const pieces = [ALL_PIECES[0], ALL_PIECES[5]];
    const a = computeHexagram(pieces, { hourBranch: 1, extra: 0 });
    const b = computeHexagram(pieces, { hourBranch: 9, extra: 42 });
    expect(a.index).toBe(b.index);
    expect(a.poemId).toBe(b.poemId);
  });
});

describe('時辰', () => {
  test('should map hours onto the twelve branches', () => {
    // 子時橫跨半夜 23:00–00:59
    expect(hourBranchNumber(new Date(2026, 0, 1, 23, 0))).toBe(1);
    expect(hourBranchNumber(new Date(2026, 0, 1, 0, 30))).toBe(1);
    expect(hourBranchNumber(new Date(2026, 0, 1, 1, 0))).toBe(2);   // 丑
    expect(hourBranchNumber(new Date(2026, 0, 1, 11, 30))).toBe(7); // 午
    expect(hourBranchNumber(new Date(2026, 0, 1, 22, 0))).toBe(12); // 亥
  });

  test('should always be within 1-12', () => {
    for (let h = 0; h < 24; h++) {
      const n = hourBranchNumber(new Date(2026, 0, 1, h, 0));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(12);
    }
  });

  test('branch names should be readable', () => {
    expect(hourBranchName(1)).toBe('子時');
    expect(hourBranchName(7)).toBe('午時');
    expect(hourBranchName(12)).toBe('亥時');
  });
});
