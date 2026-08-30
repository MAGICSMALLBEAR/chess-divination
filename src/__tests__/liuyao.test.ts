import {
  hexagramLines, trigramLine, trigramsFromLines,
  lineName, hexagramIndex, YANG, YIN,
} from '../services/hexagram';
import {
  buildLiuYaoReading, strengthState, applyStrength,
  type StrengthState,
} from '../services/liuyao';
import { TRIGRAM_ELEMENTS } from '../services/hexagram';
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

  // 三卦本身要成立：本卦、互卦、變卦各有卦名，動爻有爻名。
  // （「解讀文字裡有沒有提到這三卦」由 interpretation.test.ts 管，
  //   那才是真正會被使用者看到的輸出。）
  test('reading should carry all three named hexagrams', () => {
    const r = buildLiuYaoReading(KAN, ZHEN, 3);
    for (const name of [r.primary.name, r.nuclear.name, r.changed.name, r.movingLineName]) {
      expect(name).toBeTruthy();
    }
    // 動爻在第 3 爻，變卦必與本卦不同
    expect(r.changed.name).not.toBe(r.primary.name);
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

// ── 月建旺衰 ──

/** 各月中旬的日期，用來固定月建 */
const MID = (m: number) => new Date(2026, m - 1, 15, 12, 0, 0);
const SPRING = MID(2);   // 二月 → 寅月 → 春 → 木當令
const SUMMER = MID(6);   // 六月 → 午月 → 夏 → 火當令
const AUTUMN = MID(9);   // 九月 → 酉月 → 秋 → 金當令
const WINTER = MID(12);  // 十二月 → 子月 → 冬 → 水當令
const EARTH = MID(4);    // 四月 → 辰月 → 土旺 → 土當令

describe('五行旺衰五態', () => {
  /**
   * 以春（木當令）為例逐一驗證五態的定義：
   *   木旺（同令）、火相（令所生）、水休（生令）、金囚（剋令）、土死（令所剋）
   * 這五句是判斷體卦有沒有力氣的全部依據，錯一個就會全盤誤判。
   */
  test('春月木當令：木旺、火相、水休、金囚、土死', () => {
    expect(strengthState('木', '木')).toBe('旺');
    expect(strengthState('火', '木')).toBe('相');
    expect(strengthState('水', '木')).toBe('休');
    expect(strengthState('金', '木')).toBe('囚');
    expect(strengthState('土', '木')).toBe('死');
  });

  test('秋月金當令：金旺、水相、土休、火囚、木死', () => {
    expect(strengthState('金', '金')).toBe('旺');
    expect(strengthState('水', '金')).toBe('相');
    expect(strengthState('土', '金')).toBe('休');
    expect(strengthState('火', '金')).toBe('囚');
    expect(strengthState('木', '金')).toBe('死');
  });

  /** 每個當令五行之下，五種體卦五行必須恰好分到五種不同的態，不得重複或遺漏 */
  test('任一當令五行下，五種五行剛好對應五種相異的態', () => {
    const ELEMENTS = ['金', '木', '水', '火', '土'];
    for (const season of ELEMENTS) {
      const states = ELEMENTS.map(e => strengthState(e, season));
      expect(new Set(states).size).toBe(5);
      expect(new Set(states)).toEqual(new Set(['旺', '相', '休', '囚', '死']));
    }
  });
});

describe('旺衰對吉凶的位移', () => {
  test('旺相上調一級、囚死下調一級、休不動', () => {
    expect(applyStrength('平', 1)).toBe('吉');
    expect(applyStrength('平', -1)).toBe('小凶');
    expect(applyStrength('平', 0)).toBe('平');
  });

  /**
   * 旺衰只是輔助條件，不該把「用剋體」翻成大吉。
   * 位移限定 ±1 且夾在序列兩端，避免最凶被推過頭或最吉溢位。
   */
  test('位移在序列兩端夾住，不溢位', () => {
    expect(applyStrength('大吉', 1)).toBe('大吉');
    expect(applyStrength('凶', -1)).toBe('凶');
  });

  test('至多位移一級，凶不會因得時直接變吉', () => {
    expect(applyStrength('凶', 1)).toBe('小凶');
    expect(applyStrength('大吉', -1)).toBe('吉');
  });
});

describe('卦例的月建旺衰', () => {
  test('reading 帶出月建、季節、當令五行與體卦五行', () => {
    const r = buildLiuYaoReading(KAN, ZHEN, 2, SPRING);
    expect(r.strength.monthBranchName).toBe('寅月');
    expect(r.strength.season).toBe('春');
    expect(r.strength.seasonElement).toBe('木');
    // 動爻在下卦 → 上卦坎為體，坎屬水
    expect(r.strength.bodyElement).toBe(TRIGRAM_ELEMENTS[KAN]);
    expect(r.strength.text.length).toBeGreaterThan(20);
  });

  /**
   * 這是本功能存在的理由：同一卦在不同月份必須能給出不同的斷語。
   * 舊版沒有月建，一月和七月看同一卦得到一模一樣的結論。
   */
  test('同一卦在不同月份的旺衰不同', () => {
    const spring = buildLiuYaoReading(QIAN, DUI, 1, SPRING); // 體為金
    const autumn = buildLiuYaoReading(QIAN, DUI, 1, AUTUMN);
    expect(spring.strength.state).not.toBe(autumn.strength.state);
    // 金在春為囚（剋令木）、在秋為旺（同令金）
    expect(spring.strength.state).toBe('囚');
    expect(autumn.strength.state).toBe('旺');
  });

  test('生剋關係不受月份影響，只有旺衰與最終斷語會變', () => {
    const a = buildLiuYaoReading(KAN, ZHEN, 2, SUMMER);
    const b = buildLiuYaoReading(KAN, ZHEN, 2, WINTER);
    expect(a.bodyUse.relation).toBe(b.bodyUse.relation);
    expect(a.bodyUse.level).toBe(b.bodyUse.level);
    expect(a.strength.state).not.toBe(b.strength.state);
  });

  test('finalLevel 等於原斷語套用旺衰位移的結果', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (const moving of [1, 4]) {
          for (const at of [SPRING, SUMMER, AUTUMN, WINTER, EARTH]) {
            const r = buildLiuYaoReading(upper, lower, moving, at);
            expect(r.finalLevel).toBe(applyStrength(r.bodyUse.level, r.strength.shift));
          }
        }
      }
    }
  });

  test('shift 與 state 一致：旺相為 +1、休為 0、囚死為 −1', () => {
    const expected: Record<StrengthState, number> = {
      旺: 1, 相: 1, 休: 0, 囚: -1, 死: -1,
    };
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        const r = buildLiuYaoReading(upper, lower, 1, AUTUMN);
        expect(r.strength.shift).toBe(expected[r.strength.state]);
      }
    }
  });

  /** 未傳 at 時以現在為準，仍須產出合法的旺衰 */
  test('省略 at 參數時使用當下月份', () => {
    const r = buildLiuYaoReading(QIAN, QIAN, 1);
    expect(['旺', '相', '休', '囚', '死']).toContain(r.strength.state);
    expect(r.strength.monthBranch).toBeGreaterThanOrEqual(1);
    expect(r.strength.monthBranch).toBeLessThanOrEqual(12);
  });

  test('全部 64 卦 × 6 動爻 × 五季皆能產出合法斷語', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let moving = 1; moving <= 6; moving++) {
          for (const at of [SPRING, SUMMER, AUTUMN, WINTER, EARTH]) {
            const r = buildLiuYaoReading(upper, lower, moving, at);
            expect(['大吉', '吉', '平', '小凶', '凶']).toContain(r.finalLevel);
            expect(['旺', '相', '休', '囚', '死']).toContain(r.strength.state);
          }
        }
      }
    }
  });
});

describe('卦例含旺衰', () => {
  test('旺衰說明帶入月建與旺衰狀態', () => {
    const { strength } = buildLiuYaoReading(QIAN, DUI, 1, AUTUMN);
    expect(strength.text).toContain('酉月');
    expect(strength.text).toContain('旺');
  });

  /**
   * shift 為 0 時 finalLevel 必須與 bodyUse.level 相同。
   * 呈現端（interpretation.ts）靠這個差異決定要不要多寫一句「調整為…」，
   * 若這裡不成立，使用者會看到「有調整」卻前後同級。
   */
  test('旺衰未改動判定時等級不變', () => {
    // 找一組 shift 為 0（休）的卦例
    let found = false;
    for (let upper = 0; upper < 8 && !found; upper++) {
      for (let lower = 0; lower < 8 && !found; lower++) {
        const r = buildLiuYaoReading(upper, lower, 1, AUTUMN);
        if (r.strength.shift === 0) {
          expect(r.finalLevel).toBe(r.bodyUse.level);
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });

  /** 反面：秋月 64 組裡至少要有一組真的被旺衰改掉等級，否則 applyStrength 等同沒接上 */
  test('旺衰確實會改動判定', () => {
    let found = false;
    for (let upper = 0; upper < 8 && !found; upper++) {
      for (let lower = 0; lower < 8 && !found; lower++) {
        const r = buildLiuYaoReading(upper, lower, 1, AUTUMN);
        if (r.finalLevel !== r.bodyUse.level) {
          expect(r.strength.shift).not.toBe(0);
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });
});
