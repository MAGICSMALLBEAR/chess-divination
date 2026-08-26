// 文王卦結構性條件的行為測試
//
// 一律測可機械驗證的性質（進退神必同五行、反吟必相沖、暗動必旺相），
// 不綁死任何一個卦的具體結果——換一組納甲表就全紅的測試沒有守門價值。

import {
  advanceOrRetreat, detectTriads, darkMovingLines, TRIADS,
} from '../services/conditions';
import { buildNaJiaReading, type NaJiaLine } from '../services/najja';
import {
  hexagramLines, poemIdFromTrigrams, trigramsFromLines, type LineValue,
} from '../services/hexagram';
import { branchesClash, EARTHLY_BRANCHES } from '../services/sexagenary';
import { strengthState } from '../services/liuyao';

const BRANCH_ELEMENT: Record<string, string> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};

function readingFor(upper: number, lower: number, at = new Date(2026, 0, 1)) {
  const id = poemIdFromTrigrams(upper, lower);
  return buildNaJiaReading(upper, lower, id, hexagramLines(upper, lower), at)!;
}

function eachHexagram() {
  const out: { upper: number; lower: number }[] = [];
  for (let upper = 0; upper < 8; upper++) {
    for (let lower = 0; lower < 8; lower++) out.push({ upper, lower });
  }
  return out;
}

describe('進神與退神', () => {
  test('順行為進、逆行為退', () => {
    expect(advanceOrRetreat('寅', '卯')).toBe('進神');
    expect(advanceOrRetreat('卯', '寅')).toBe('退神');
    expect(advanceOrRetreat('亥', '子')).toBe('進神');
    expect(advanceOrRetreat('酉', '申')).toBe('退神');
  });

  test('土支自成一圈，丑辰未戌順進逆退', () => {
    expect(advanceOrRetreat('丑', '辰')).toBe('進神');
    expect(advanceOrRetreat('戌', '丑')).toBe('進神');
    expect(advanceOrRetreat('未', '辰')).toBe('退神');
  });

  test('相沖的兩土支不是進退神', () => {
    // 丑未、辰戌相隔兩位，是沖不是進退；判成進神會把壞事說成好事
    expect(advanceOrRetreat('丑', '未')).toBeNull();
    expect(advanceOrRetreat('辰', '戌')).toBeNull();
  });

  test('進退神必為同五行，且同支不算', () => {
    for (const from of EARTHLY_BRANCHES) {
      for (const to of EARTHLY_BRANCHES) {
        const result = advanceOrRetreat(from, to);
        if (from === to) {
          expect(result).toBeNull();
        } else if (result) {
          expect(`${from}${to}:${BRANCH_ELEMENT[from]}`).toBe(`${from}${to}:${BRANCH_ELEMENT[to]}`);
        }
      }
    }
  });
});

describe('爻的反吟伏吟（本模型下不可能成立）', () => {
  test('單動爻翻一爻，同位爻既不可能同支也不可能相沖', () => {
    // 這條測試守的是 conditions.ts 裡「不做反吟伏吟」的前提。
    // 翻一爻只換掉一個三爻卦，而單位元相異的兩個三爻卦，同位納甲
    // 既不同支也不相沖。哪天改成多爻同動，這條會紅——屆時補反吟伏吟
    // 才有意義，現在寫進去只是永遠跑不到的死碼。
    const violations: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const lines = hexagramLines(upper, lower);
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        const flipped = lines.map((v, i) => (i === movingLine - 1 ? (v === 0 ? 1 : 0) : v)) as LineValue[];
        const t = trigramsFromLines(flipped);
        const c = buildNaJiaReading(t.upper, t.lower, poemIdFromTrigrams(t.upper, t.lower), flipped)!;
        const from = r.lines[movingLine - 1].branch;
        const to = c.lines[movingLine - 1].branch;
        if (from === to) violations.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻 伏吟`);
        if (branchesClash(from, to)) violations.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻 反吟`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('三合局', () => {
  test('無動爻則不成局', () => {
    const r = readingFor(0, 0);
    expect(detectTriads({ lines: r.lines, dayBranch: r.dayBranch })).toEqual([]);
  });

  test('動爻不在局中則不成局——無動不成局', () => {
    // 三支縱使俱全，沒有動爻參與，傳統不論成局
    const offenders: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        const mover = r.lines[movingLine - 1];
        for (const f of detectTriads({ lines: r.lines, movingLine, dayBranch: r.dayBranch })) {
          if (!TRIADS.find(t => t.name === f.name)!.branches.includes(mover.branch)) {
            offenders.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('成局的三支必定齊備，缺的那一支只能由日辰補', () => {
    const bad: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        for (const f of detectTriads({ lines: r.lines, movingLine, dayBranch: r.dayBranch })) {
          const triad = TRIADS.find(t => t.name === f.name)!;
          const inHexagram = triad.branches.filter(b => r.lines.some(l => l.branch === b));
          const covered = f.fromDay ? [...inHexagram, f.fromDay] : inHexagram;
          if (new Set(covered).size !== 3) bad.push(`#${poemIdFromTrigrams(upper, lower)} ${f.name}`);
          if (f.fromDay && f.fromDay !== r.dayBranch) bad.push(`${f.name} 補了非日支`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('六十四卦中確實找得到成局的例子', () => {
    // 若一個都湊不出來，上面幾條就全是空轉的測試
    let count = 0;
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        count += detectTriads({ lines: r.lines, movingLine, dayBranch: r.dayBranch }).length;
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  /** detectTriads 只看 position／branch／isWorld，其餘欄位補預設值即可 */
  function fakeLine(position: number, branch: string, isWorld = false): NaJiaLine {
    return {
      position, branch, element: BRANCH_ELEMENT[branch], isWorld,
      name: `第${position}爻`, stemBranch: branch, relative: '兄弟',
      spirit: '青龍', isVoid: false, isMonthBroken: false, isDayClashed: false,
      isResponding: false,
    };
  }

  /**
   * 迴歸：同一地支在卦中重複出現（64 卦中 22 卦如此），動爻坐在重複支
   * 的第二個位置。舊寫法只取第一爻，動爻會被靜爻替身頂替入局。
   */
  test('重複地支時，動爻所在的那一爻優先入局', () => {
    const lines = [
      fakeLine(1, '申'),
      fakeLine(2, '子'),
      fakeLine(3, '辰'),
      fakeLine(4, '申'), // 申重複；動爻在第 4 爻
      fakeLine(5, '戌'),
      fakeLine(6, '寅'),
    ];
    const formations = detectTriads({ lines, movingLine: 4, dayBranch: '午' });

    const triad = formations.find(f => f.name === '申子辰');
    expect(triad).toBeDefined();
    expect(triad!.positions).toContain(4);
    expect(triad!.positions).not.toContain(1);
    expect(triad!.fromDay).toBeNull();
  });

  test('重複地支時，世爻優先於普通靜爻入局', () => {
    const lines = [
      fakeLine(1, '申', true), // 世爻在申
      fakeLine(2, '子'),
      fakeLine(3, '辰'),
      fakeLine(4, '子', true), // 子重複；世爻坐在重複支的後段
      fakeLine(5, '戌'),
      fakeLine(6, '寅'),
    ];
    const formations = detectTriads({ lines, movingLine: 3, dayBranch: '午' });

    const triad = formations.find(f => f.name === '申子辰');
    expect(triad).toBeDefined();
    expect(triad!.positions).toContain(4);
    expect(triad!.positions).not.toContain(2);
  });
});

describe('暗動', () => {
  test('暗動必為靜爻、逢日沖、且旺相', () => {
    const bad: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        for (const line of darkMovingLines({ reading: r, movingLine, seasonElement: '水' })) {
          if (line.position === movingLine) bad.push('動爻被當成暗動');
          if (!branchesClash(line.branch, r.dayBranch)) bad.push('未逢日沖');
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('休囚死之爻逢日沖不算暗動——那是日破', () => {
    // 旺相才動得起來，這是暗動與日破的唯一分野。
    // 逐一比對「逢日沖的靜爻」與「判為暗動的爻」，兩者只能差在旺衰與月破。
    const mismatched: string[] = [];
    let excluded = 0;
    for (const seasonElement of ['木', '火', '土', '金', '水']) {
      for (const { upper, lower } of eachHexagram()) {
        const r = readingFor(upper, lower);
        const dark = darkMovingLines({ reading: r, movingLine: 1, seasonElement });
        const clashed = r.lines.filter(
          l => l.position !== 1 && branchesClash(l.branch, r.dayBranch),
        );
        for (const line of clashed) {
          const state = strengthState(line.element, seasonElement);
          const isDark = dark.some(d => d.position === line.position);
          // 月破之爻逢日沖是破上加破，永不算暗動
          if (isDark !== (state === '旺' || state === '相') || (isDark && line.isMonthBroken)) {
            mismatched.push(`#${poemIdFromTrigrams(upper, lower)} ${line.branch} ${state}`);
          }
          if (!isDark) excluded += 1;
        }
      }
    }
    expect(mismatched).toEqual([]);
    // 若一個都沒被排除，上面那條比對就等於沒測到「排除」這一半
    expect(excluded).toBeGreaterThan(0);
  });

  /**
   * 月破優先於旺衰：土旺月裡月破之爻必為土支、土令下恆旺，
   * 月建＝日支的日子它同時逢日沖——但那是破上加破，不是暗動。
   */
  test('月破之爻逢日沖不算暗動', () => {
    const fake = (position: number): NaJiaLine => ({
      position, branch: '子', element: '水', isWorld: false,
      name: `第${position}爻`, stemBranch: '甲子', relative: '兄弟',
      spirit: '青龍', isVoid: false, isDayClashed: true,
      isResponding: false, isMonthBroken: false,
    });
    const broken = { ...fake(1), isMonthBroken: true };
    const intact = fake(2);
    const reading = { lines: [broken, intact], dayBranch: '午' } as never;

    const dark = darkMovingLines({ reading, movingLine: 3, seasonElement: '水' });
    expect(dark.map(l => l.position)).toEqual([2]);
  });
});
