// 納甲盤與爻辭的結構性守門測試
//
// 這兩份資料（八宮卦表 384 條爻辭）都是人工整理的靜態表，
// 抄錯一格不會讓程式壞掉，只會安靜地輸出錯誤的命理盤面——
// 光看單元測試的「函式回傳非 null」是抓不到的。
// 故改以「可機械驗證的傳統規則」逐條檢查。

import { buildNaJiaReading } from '../services/najja';
import { getMovingLineGuidance } from '../services/yaoReading';
import {
  hexagramLines, lineName, poemIdFromTrigrams, hexagramNameOf,
} from '../services/hexagram';

const DUMMY_LINES = [0, 0, 0, 0, 0, 0] as any;

/** 走訪 64 卦：回傳 [文王序, 上卦, 下卦, 六爻] */
function eachHexagram(): [number, number, number, ReturnType<typeof hexagramLines>][] {
  const out: [number, number, number, ReturnType<typeof hexagramLines>][] = [];
  for (let upper = 0; upper < 8; upper++) {
    for (let lower = 0; lower < 8; lower++) {
      out.push([poemIdFromTrigrams(upper, lower), upper, lower, hexagramLines(upper, lower)]);
    }
  }
  return out;
}

describe('京房八宮卦表', () => {
  test('64 卦全部歸宮，無遺漏', () => {
    const missing: number[] = [];
    for (let id = 1; id <= 64; id++) {
      if (!buildNaJiaReading(0, 0, id, DUMMY_LINES)) missing.push(id);
    }
    expect(missing).toEqual([]);
  });

  test('八宮各領八卦，世次不重複', () => {
    const byPalace = new Map<string, string[]>();
    for (let id = 1; id <= 64; id++) {
      const r = buildNaJiaReading(0, 0, id, DUMMY_LINES)!;
      if (!byPalace.has(r.palace)) byPalace.set(r.palace, []);
      byPalace.get(r.palace)!.push(r.generation);
    }
    expect(byPalace.size).toBe(8);
    for (const [palace, generations] of byPalace) {
      // 每宮恰為本宮、一至五世、遊魂、歸魂各一
      expect(`${palace}:${generations.length}`).toBe(`${palace}:8`);
      expect(`${palace}:${new Set(generations).size}`).toBe(`${palace}:8`);
    }
  });

  test('世應恆相隔三位', () => {
    for (let id = 1; id <= 64; id++) {
      const r = buildNaJiaReading(0, 0, id, DUMMY_LINES)!;
      expect(`#${id}:${Math.abs(r.worldLine - r.respondingLine)}`).toBe(`#${id}:3`);
    }
  });

  /**
   * 對照傳統盤面抽驗一卦。
   * 水雷屯（坎宮二世）：上六兄弟子水／九五官鬼戌土／六四父母申金／
   * 六三官鬼辰土／六二子孫寅木／初九兄弟子水，世在二、應在五。
   */
  test('水雷屯的納甲六親世應與傳統盤面一致', () => {
    const lines = hexagramLines(5, 3);
    const r = buildNaJiaReading(5, 3, 3, lines, new Date(2026, 0, 1))!;

    expect(r.palace).toBe('坎');
    expect(r.generation).toBe('二世');
    expect(r.worldLine).toBe(2);
    expect(r.respondingLine).toBe(5);
    expect(r.lines.map(l => `${l.stemBranch}${l.element}:${l.relative}`)).toEqual([
      '庚子水:兄弟',
      '庚寅木:子孫',
      '庚辰土:官鬼',
      '戊申金:父母',
      '戊戌土:官鬼',
      '戊子水:兄弟',
    ]);
  });
});

describe('《周易》爻辭', () => {
  /**
   * 爻名（初九／六二…）由該爻的陰陽決定，陽稱九、陰稱六。
   * 若經文抄錯行或錯置卦號，爻名與卦象的陰陽就會對不上——
   * 這是唯一能純機械驗證 384 條經文是否錯位的規則。
   */
  test('全部 384 條爻辭的爻名與卦象陰陽相符', () => {
    const mismatches: string[] = [];
    for (const [id, upper, lower, lines] of eachHexagram()) {
      for (let pos = 1; pos <= 6; pos++) {
        const text = getMovingLineGuidance(id, pos, lines, undefined as any)?.classicalText;
        if (!text) {
          mismatches.push(`#${id} ${hexagramNameOf(upper, lower)} 爻${pos} 缺經文`);
          continue;
        }
        const expected = lineName(lines, pos);
        if (!text.startsWith(expected)) {
          mismatches.push(
            `#${id} ${hexagramNameOf(upper, lower)} 爻${pos}: 「${text.slice(0, 6)}」應為「${expected}」`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test('爻辭一律以全形冒號分隔爻名與經文', () => {
    // 第 12 卦原本用逗號，與其餘 63 卦不一致；
    // 任何依冒號切分爻名的處理都會在那一卦上得到整句
    const odd: string[] = [];
    for (const [id, , , lines] of eachHexagram()) {
      for (let pos = 1; pos <= 6; pos++) {
        const text = getMovingLineGuidance(id, pos, lines, undefined as any)?.classicalText;
        if (text && !text.includes('：')) odd.push(`#${id} 爻${pos}: ${text.slice(0, 12)}`);
      }
    }
    expect(odd).toEqual([]);
  });
});
