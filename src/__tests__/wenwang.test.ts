// 伏神與文王卦斷語的行為測試
//
// 斷語是加權結果，測「分數等於某個數字」會綁死權重、改一個常數就全紅。
// 故一律測**方向性**：某條件加入後結論不該變好／變壞，以及可機械驗證的
// 結構性質（例如缺席的六親必定找得到伏神）。

import {
  buildNaJiaReading, flyingHiddenRelation, type SixRelative,
} from '../services/najja';
import { judgeUseGod } from '../services/wenwang';
import { detectTriads } from '../services/conditions';
import { hexagramLines, poemIdFromTrigrams, trigramsFromLines, type LineValue } from '../services/hexagram';
import { branchesClash } from '../services/sexagenary';

const ALL_RELATIVES: SixRelative[] = ['兄弟', '子孫', '妻財', '官鬼', '父母'];

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

describe('伏神', () => {
  test('卦中缺席的六親一定找得到伏神', () => {
    // 八純卦的六個地支必涵蓋五行，故五種六親都取得到；
    // 若這條不成立，問財無妻財時整張盤就會無用神可斷
    const gaps: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      const present = new Set(r.lines.map(l => l.relative));
      for (const relative of ALL_RELATIVES) {
        if (present.has(relative)) continue;
        if (!r.hidden.some(h => h.relative === relative)) {
          gaps.push(`${r.palace}宮 #${poemIdFromTrigrams(upper, lower)} 缺${relative}且無伏神`);
        }
      }
    }
    expect(gaps).toEqual([]);
  });

  test('已上卦的六親不會再出現在伏神裡', () => {
    const dupes: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      const present = new Set(r.lines.map(l => l.relative));
      for (const h of r.hidden) {
        if (present.has(h.relative)) dupes.push(`#${poemIdFromTrigrams(upper, lower)} ${h.relative}`);
      }
    }
    expect(dupes).toEqual([]);
  });

  test('八純卦六親俱全，故無伏神', () => {
    for (let t = 0; t < 8; t++) {
      const r = readingFor(t, t);
      expect(`${r.palace}:${r.hidden.length}`).toBe(`${r.palace}:0`);
    }
  });

  test('飛伏關係涵蓋五種生剋方向', () => {
    expect(flyingHiddenRelation('水', '水')).toBe('飛伏比和');
    expect(flyingHiddenRelation('水', '木')).toBe('飛來生伏');
    expect(flyingHiddenRelation('水', '火')).toBe('飛來剋伏');
    expect(flyingHiddenRelation('木', '水')).toBe('伏去生飛');
    expect(flyingHiddenRelation('火', '水')).toBe('伏去剋飛');
  });

  test('飛來剋伏與伏去生飛判為不能透出', () => {
    for (const { upper, lower } of eachHexagram()) {
      for (const h of readingFor(upper, lower).hidden) {
        const expected = h.relation !== '飛來剋伏' && h.relation !== '伏去生飛';
        expect(`${h.relation}:${h.canEmerge}`).toBe(`${h.relation}:${expected}`);
      }
    }
  });
});

describe('用神斷語', () => {
  test('用神上卦時取卦中之爻，不取伏神', () => {
    const r = readingFor(5, 3); // 水雷屯，坎宮
    const a = judgeUseGod({ reading: r, subject: '官鬼' });
    expect(a.lines.length).toBeGreaterThan(0);
    expect(a.hidden).toBeNull();
    expect(a.element).toBe(a.lines[0].element);
  });

  test('用神不上卦時改用伏神的五行論斷', () => {
    // 找一個確實缺某六親的卦
    const found = eachHexagram()
      .map(({ upper, lower }) => readingFor(upper, lower))
      .find(r => r.hidden.length > 0)!;
    const missing = found.hidden[0].relative;

    const a = judgeUseGod({ reading: found, subject: missing });
    expect(a.lines).toEqual([]);
    expect(a.hidden).not.toBeNull();
    expect(a.element).toBe(found.hidden[0].element);
  });

  test('每條斷語都附有可檢查的理由', () => {
    const r = readingFor(0, 0);
    const a = judgeUseGod({ reading: r, subject: '妻財' });
    expect(a.reasons.length).toBeGreaterThan(0);
    // 分數必須等於各條理由之和，不得有隱藏的加減
    expect(a.score).toBe(a.reasons.reduce((s, x) => s + x.score, 0));
  });

  test('斷語落在五等第之內', () => {
    const seen = new Set<string>();
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (const relative of ALL_RELATIVES) {
        seen.add(judgeUseGod({ reading: r, subject: relative }).verdict);
      }
    }
    for (const v of seen) {
      expect(['大吉', '吉', '平', '小凶', '凶']).toContain(v);
    }
  });

  /**
   * 方向性迴歸：同一卦同一用神，只換占卜日期使月令改變，
   * 用神當令時的分數不該低於失令時。
   */
  test('用神當令的分數高於失令', () => {
    const worse: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const relative: SixRelative = '妻財';
      // 卯月（春，木當權）與酉月（秋，金當權）
      const spring = judgeUseGod({ reading: readingFor(upper, lower, new Date(2026, 2, 20)), subject: relative });
      const autumn = judgeUseGod({ reading: readingFor(upper, lower, new Date(2026, 8, 20)), subject: relative });
      if (spring.element !== autumn.element) continue;
      if (spring.monthState === '旺' && autumn.monthState === '死' && spring.score <= autumn.score) {
        worse.push(`#${poemIdFromTrigrams(upper, lower)} 旺(${spring.score}) 未高於 死(${autumn.score})`);
      }
    }
    expect(worse).toEqual([]);
  });

  test('伏而不出比伏而可出扣分更多', () => {
    const pairs = eachHexagram()
      .map(({ upper, lower }) => readingFor(upper, lower))
      .flatMap(r => r.hidden.map(h => ({ r, h })));

    const blocked = pairs.find(p => !p.h.canEmerge);
    const open = pairs.find(p => p.h.canEmerge);
    if (!blocked || !open) return; // 資料不足時不強求

    const blockedReason = judgeUseGod({ reading: blocked.r, subject: blocked.h.relative })
      .reasons.find(x => x.label.includes('伏於'))!;
    const openReason = judgeUseGod({ reading: open.r, subject: open.h.relative })
      .reasons.find(x => x.label.includes('伏於'))!;

    expect(blockedReason.score).toBeLessThan(openReason.score);
  });

  test('伏神逢月破與上卦用神一視同仁', () => {
    // 伏神的地支被月建沖到一樣是月破，不該因為「沒上卦」就躲過這一項
    const dates = [
      new Date(2026, 0, 1), new Date(2026, 2, 20),
      new Date(2026, 5, 15), new Date(2026, 8, 20),
    ];
    const mismatched: string[] = [];
    for (const at of dates) {
      for (const { upper, lower } of eachHexagram()) {
        const r = readingFor(upper, lower, at);
        for (const h of r.hidden) {
          const a = judgeUseGod({ reading: r, subject: h.relative, at });
          const hasBreak = a.reasons.some(x => x.label.includes('月破'));
          const shouldBreak = branchesClash(h.branch, r.monthBranch);
          if (hasBreak !== shouldBreak) {
            mismatched.push(
              `${r.palace}#${poemIdFromTrigrams(upper, lower)} ${h.branch}vs${r.monthBranch}`,
            );
          }
        }
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe('世爻為用（自占疾病、出行）', () => {
  test('取的是世爻，且世爻必在卦中故永無伏神', () => {
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      const a = judgeUseGod({ reading: r, subject: '世爻' });
      expect(a.lines.map(l => l.position)).toEqual([r.worldLine]);
      expect(a.hidden).toBeNull();
      expect(a.relative).toBe(r.lines[r.worldLine - 1].relative);
    }
  });

  test('斷語先講明是誰持世，否則看不出斷的是哪一爻', () => {
    const r = readingFor(0, 0);
    const a = judgeUseGod({ reading: r, subject: '世爻' });
    expect(a.reasons[0].label).toContain('持世');
    expect(a.reasons[0].score).toBe(0);
    expect(a.score).toBe(a.reasons.reduce((s, x) => s + x.score, 0));
  });

  test('忌神持世比同一卦不計喜忌時更差', () => {
    // 問疾病而官鬼持世，是病纏其身之象；分數必須反映這一點
    const found = eachHexagram()
      .map(({ upper, lower }) => readingFor(upper, lower))
      .find(r => r.lines[r.worldLine - 1].relative === '官鬼')!;
    expect(found).toBeDefined();

    const plain = judgeUseGod({ reading: found, subject: '世爻' });
    const withTaboo = judgeUseGod({ reading: found, subject: '世爻', taboo: '官鬼', favorable: '子孫' });
    expect(withTaboo.score).toBeLessThan(plain.score);
  });

  test('喜神持世比同一卦不計喜忌時更好', () => {
    const found = eachHexagram()
      .map(({ upper, lower }) => readingFor(upper, lower))
      .find(r => r.lines[r.worldLine - 1].relative === '子孫')!;
    expect(found).toBeDefined();

    const plain = judgeUseGod({ reading: found, subject: '世爻' });
    const withFavorable = judgeUseGod({ reading: found, subject: '世爻', taboo: '官鬼', favorable: '子孫' });
    expect(withFavorable.score).toBeGreaterThan(plain.score);
  });

  test('喜忌之神只在六親為用時不計持世', () => {
    // 用神已是某一六親時，「忌神持世」講的是問卜者的處境，不該混進用神的旺衰
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      const a = judgeUseGod({ reading: r, subject: '妻財', taboo: '兄弟', favorable: '子孫' });
      expect(a.reasons.some(x => x.label.includes('持世'))).toBe(false);
    }
  });
});

describe('用神兩現（優先取動爻）', () => {
  /** 依文王卦序找卦，方便用卦號指認具體卦例 */
  function byPoemId(id: number) {
    const found = eachHexagram().find(
      ({ upper, lower }) => poemIdFromTrigrams(upper, lower) === id,
    );
    if (!found) throw new Error(`找不到 #${id}`);
    return found;
  }

  function changedFor(upper: number, lower: number, movingLine: number, at = new Date(2026, 0, 1)) {
    const lines = hexagramLines(upper, lower);
    const flipped = lines.map((v, i) => (i === movingLine - 1 ? (v === 0 ? 1 : 0) : v)) as LineValue[];
    const { upper: u, lower: l } = trigramsFromLines(flipped);
    return buildNaJiaReading(u, l, poemIdFromTrigrams(u, l), flipped, at)!;
  }

  test('第二現才是動爻時取動爻，回頭生剋因此被檢查', () => {
    // 天風姤 #44：兄弟兩現於 3、5 爻，動 5 爻（第二現）時變爻回頭生剋。
    // 舊寫法一律取 lines[0]（3 爻），isUseGodMoving 恆為 false，
    // 「回頭生剋」整段從來不會被採計。
    const { upper, lower } = byPoemId(44);
    const r = readingFor(upper, lower);
    const a = judgeUseGod({
      reading: r, changed: changedFor(upper, lower, 5), movingLine: 5, subject: '兄弟',
    });

    expect(a.reasons.some(x => x.label === '用神兄弟兩現，5爻為動爻，取之為主')).toBe(true);
    expect(a.reasons.some(x => x.label.includes('回頭生') || x.label.includes('回頭剋'))).toBe(true);
  });

  test('第二現才是動爻時取動爻，進退神因此被檢查', () => {
    // 乾為天 #1：父母兩現於 3、6 爻，動 6 爻（第二現）時化進神／退神。
    const { upper, lower } = byPoemId(1);
    const r = readingFor(upper, lower);
    const a = judgeUseGod({
      reading: r, changed: changedFor(upper, lower, 6), movingLine: 6, subject: '父母',
    });

    expect(a.reasons.some(x => x.label === '用神父母兩現，6爻為動爻，取之為主')).toBe(true);
    expect(a.reasons.some(x => x.label.includes('進神') || x.label.includes('退神'))).toBe(true);
  });

  test('動爻不在兩現之中時，維持取最先出現者', () => {
    const { upper, lower } = byPoemId(44);
    const r = readingFor(upper, lower);
    const a = judgeUseGod({ reading: r, movingLine: 2, subject: '兄弟' });

    expect(a.reasons.some(x => x.label === '用神兄弟兩現，取3爻為主')).toBe(true);
    // 兩現取用只有這兩個出口，不得混出第三種說法
    expect(a.reasons.some(x => x.label.includes('為動爻'))).toBe(false);
  });

  test('揭露的取用爻一定在兩現之中；動爻在兩現中時必取動爻', () => {
    const offenders: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (const relative of ALL_RELATIVES) {
        const positions = r.lines.filter(l => l.relative === relative).map(l => l.position);
        if (positions.length < 2) continue;
        for (let movingLine = 1; movingLine <= 6; movingLine++) {
          const a = judgeUseGod({
            reading: r, changed: changedFor(upper, lower, movingLine), movingLine, subject: relative,
          });
          const note = a.reasons.find(x => x.label.includes('兩現'))?.label ?? '';
          // 兩種說法：「取N爻為主」與「N爻為動爻，取之為主」
          const named = Number(/兩現，(?:取)?(\d)爻/.exec(note)?.[1]);
          if (!positions.includes(named)) {
            offenders.push(`#${poemIdFromTrigrams(upper, lower)} ${relative} 取用${named}不在${positions}`);
          }
          if (positions.includes(movingLine) && !note.includes(`${movingLine}爻為動爻`)) {
            offenders.push(`#${poemIdFromTrigrams(upper, lower)} ${relative} 動${movingLine}未取動爻`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('喜忌之神發動', () => {
  test('同一個動爻不會既算生剋又算喜忌，避免重複計分', () => {
    const doubled: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        const a = judgeUseGod({
          reading: r, subject: '世爻', movingLine, taboo: '官鬼', favorable: '子孫',
        });
        const byElement = a.reasons.some(x => x.label.includes('動而生用神') || x.label.includes('動而剋用神'));
        const byRole = a.reasons.some(x => x.label.includes('發動，為所問之'));
        if (byElement && byRole) {
          doubled.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻`);
        }
      }
    }
    expect(doubled).toEqual([]);
  });

  test('忌神發動的卦，分數不高於不計喜忌的同一卦', () => {
    const worse: string[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        const plain = judgeUseGod({ reading: r, subject: '世爻', movingLine });
        const withRoles = judgeUseGod({
          reading: r, subject: '世爻', movingLine, taboo: '官鬼',
        });
        if (withRoles.score > plain.score) {
          worse.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻`);
        }
      }
    }
    expect(worse).toEqual([]);
  });
});

describe('結構性條件（進退神、暗動、三合局）', () => {
  /** 翻掉動爻那一爻，取變卦的納甲盤 */
  function changedFor(upper: number, lower: number, movingLine: number, at = new Date(2026, 0, 1)) {
    const lines = hexagramLines(upper, lower);
    const flipped = lines.map((v, i) => (i === movingLine - 1 ? (v === 0 ? 1 : 0) : v)) as LineValue[];
    const { upper: u, lower: l } = trigramsFromLines(flipped);
    return buildNaJiaReading(u, l, poemIdFromTrigrams(u, l), flipped, at)!;
  }

  /** 跑遍六十四卦 × 六爻，蒐集所有斷語 */
  function everyJudgment(
    subject: Parameters<typeof judgeUseGod>[0]['subject'] = '世爻',
    at = new Date(2026, 0, 1),
  ) {
    const out: { id: number; movingLine: number; a: ReturnType<typeof judgeUseGod> }[] = [];
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower, at);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        out.push({
          id: poemIdFromTrigrams(upper, lower),
          movingLine,
          a: judgeUseGod({
            reading: r, changed: changedFor(upper, lower, movingLine, at), movingLine, subject, at,
          }),
        });
      }
    }
    return out;
  }

  test('進退神只在用神自己發動時採計', () => {
    // 這一項講的是「用神化成了什麼」，用神沒動就無所謂化不化
    const offenders: string[] = [];
    for (const { id, movingLine, a } of everyJudgment()) {
      const mentions = a.reasons.some(
        x => x.label.includes('進神') || x.label.includes('退神'),
      );
      if (mentions && a.lines[0]?.position !== movingLine) {
        offenders.push(`#${id} 第${movingLine}爻`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('暗動採計的一定不是動爻本身', () => {
    // 己卯日、丑月（土令）：日沖之支為酉金，金在土令為相，暗動成立。
    // 換成別的日子可能一次都不觸發，那樣這條就只是空轉的測試。
    const at = new Date(2026, 0, 5);
    const offenders: string[] = [];
    let seen = 0;
    for (const { id, movingLine, a } of everyJudgment('世爻', at)) {
      for (const reason of a.reasons.filter(x => x.label.includes('暗動'))) {
        seen += 1;
        if (reason.label.startsWith(`${movingLine}爻`)) offenders.push(`#${id} 第${movingLine}爻`);
      }
    }
    expect(offenders).toEqual([]);
    expect(seen).toBeGreaterThan(0);
  });

  test('三合局的採計必定伴隨動爻——無動不成局', () => {
    const r = readingFor(0, 0);
    const noMoving = judgeUseGod({ reading: r, subject: '世爻' });
    expect(noMoving.reasons.some(x => x.label.includes('局'))).toBe(false);
  });

  test('「用神入局」一定真的在局中', () => {
    // 舊版只比五行：局與用神同氣就貼「入局」標籤，哪怕用神爻坐在
    // 局的 positions 之外（64 卦掃描下 136 次中有 16 次如此）。
    const offenders: string[] = [];
    let seen = 0;
    for (const { upper, lower } of eachHexagram()) {
      const r = readingFor(upper, lower);
      for (let movingLine = 1; movingLine <= 6; movingLine++) {
        const a = judgeUseGod({
          reading: r,
          changed: changedFor(upper, lower, movingLine),
          movingLine,
          subject: '世爻',
        });
        const mentions = a.reasons.filter(x => x.label.includes('入局'));
        if (mentions.length === 0) continue;
        seen += mentions.length;
        // 斷語採計的唯一入口是 judgeUseGod，用同一份輸入重算三合局
        const triads = detectTriads({ lines: r.lines, movingLine, dayBranch: r.dayBranch });
        const useGod = a.lines[0];
        if (!useGod || !triads.some(t => t.positions.includes(useGod.position))) {
          offenders.push(`#${poemIdFromTrigrams(upper, lower)} 第${movingLine}爻`);
        }
      }
    }
    expect(offenders).toEqual([]);
    // 掃不到任何「入局」的話，上面那條就只是空轉
    expect(seen).toBeGreaterThan(0);
  });

  test('補上結構性條件後，斷語仍落在五等第之內且分數等於理由之和', () => {
    for (const { a } of everyJudgment()) {
      expect(['大吉', '吉', '平', '小凶', '凶']).toContain(a.verdict);
      expect(a.score).toBe(a.reasons.reduce((s, x) => s + x.score, 0));
    }
  });
});
