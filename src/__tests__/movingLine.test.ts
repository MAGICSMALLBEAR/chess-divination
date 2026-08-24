// 動爻公式的守門測試。
//
// 為什麼要單獨立一個檔：liuyao.test.ts 只驗了動爻的範圍（1–6）、六個值都
// 到得了、以及時辰與棋盤位置會改變結果——全都是「有在動」的性質，沒有
// 任何一條釘住**它應該等於多少**。缺陷正好活在這個縫裡：v3 以前把 0 基的
// trigram 索引當卦數相加，每一卦的動爻都比梅花易數少 2（三顆棋時少 3）。
// 分佈仍均勻、內部也自洽，所以既有測試全綠。
//
// 梅花易數：動爻 = (上卦數 + 下卦數 + 其餘數 + 時辰數) mod 6，得 0 為上爻。
// 卦數是先天數 乾一 兌二 離三 震四 巽五 坎六 艮七 坤八，即 trigram + 1。

import { computeHexagram, DIVINATION_ENGINE_VERSION } from '../services/divination';
import { ALL_PIECES } from '../data/pieces';
import type { ChessPiece } from '../data/pieces';

// 先天序索引：0乾 1兌 2離 3震 4巽 5坎 6艮 7坤
const QIAN = 0, DUI = 1, LI = 2, ZHEN = 3, XUN = 4, KAN = 5, GEN = 6, KUN = 7;

/** 取一顆該卦的棋子。棋子只是載體，這裡在意的是它的 trigram。 */
function pieceOf(trigram: number): ChessPiece {
  const piece = ALL_PIECES.find(p => p.trigram === trigram);
  if (!piece) throw new Error(`找不到 trigram 為 ${trigram} 的棋子`);
  return piece;
}

/** 依古法直接算出期望值，與被測程式各自獨立 */
function classical(numbers: number[], hour: number): number {
  const remainder = (numbers.reduce((sum, n) => sum + n, 0) + hour) % 6;
  return remainder === 0 ? 6 : remainder;
}

describe('動爻依梅花易數的先天數', () => {
  /**
   * 逐例驗算，每一筆的期望值都是手算的：
   * 水雷屯＝上坎下震，坎六震四，午時（時辰數 7）→ (6+4+7)=17，17 mod 6=5 → 五爻動。
   * 舊算法用索引 5+3+7=15，15 mod 6=3 → 三爻動，體用因此對調、吉凶翻面。
   */
  // 標題只用 %s 帶入第一欄：test.each 的格式符是依序取用各欄，
  // 寫 '%s → %i' 會把第二欄（上卦索引）當成爻數印出來，看起來像測錯了東西
  test.each([
    ['水雷屯（上坎下震）午時 → 五爻動', KAN, ZHEN, 7, 5],
    ['天澤履（上乾下兌）午時 → 四爻動', QIAN, DUI, 7, 4],
    ['乾為天（上乾下乾）子時 → 三爻動', QIAN, QIAN, 1, 3],
    ['坤為地（上坤下坤）子時 → 五爻動', KUN, KUN, 1, 5],
    ['火風鼎（上離下巽）卯時 → 上爻動', LI, XUN, 4, 6],
    ['山水蒙（上艮下坎）亥時 → 初爻動', GEN, KAN, 12, 1],
  ])('%s', (_label, upper, lower, hour, expected) => {
    const hex = computeHexagram([pieceOf(upper), pieceOf(lower)], { hourBranch: hour });
    expect(hex.movingLine).toBe(expected);
    // 與獨立算出的古法結果對照，避免上面的期望值與被測程式一起錯
    expect(hex.movingLine).toBe(classical([upper + 1, lower + 1], hour));
  });

  test('八卦兩兩相配、十二時辰全覆蓋皆與古法一致', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let hour = 1; hour <= 12; hour++) {
          const hex = computeHexagram([pieceOf(upper), pieceOf(lower)], { hourBranch: hour });
          expect(hex.movingLine).toBe(classical([upper + 1, lower + 1], hour));
        }
      }
    }
  });

  /** 抽一顆時上下同卦，卦數要算兩次 */
  test('單棋起卦：同一卦數計入上下兩卦', () => {
    for (let trigram = 0; trigram < 8; trigram++) {
      const hex = computeHexagram([pieceOf(trigram)], { hourBranch: 5 });
      expect(hex.movingLine).toBe(classical([trigram + 1, trigram + 1], 5));
    }
  });

  /** 第三顆棋也是卦，同樣取先天數而非索引 */
  test('三棋起卦：第三顆亦以先天數計入', () => {
    const hex = computeHexagram(
      [pieceOf(KAN), pieceOf(ZHEN), pieceOf(GEN)],
      { hourBranch: 7 },
    );
    expect(hex.movingLine).toBe(classical([KAN + 1, ZHEN + 1, GEN + 1], 7));
  });

  /**
   * 乾的索引是 0：第三顆若寫成 `trigram ?? 0`，「沒有第三顆」與
   * 「第三顆是乾」會算出同一個動爻。
   */
  test('第三顆為乾時，結果與只有兩顆棋不同', () => {
    const two = computeHexagram([pieceOf(KAN), pieceOf(ZHEN)], { hourBranch: 7 });
    const three = computeHexagram(
      [pieceOf(KAN), pieceOf(ZHEN), pieceOf(QIAN)],
      { hourBranch: 7 },
    );
    expect(three.movingLine).not.toBe(two.movingLine);
    expect(three.movingLine).toBe(classical([KAN + 1, ZHEN + 1, QIAN + 1], 7));
  });

  /** 棋盤格位數是計數不是卦數，不加一 */
  test('棋盤的 extra 以原值計入，不視為卦數', () => {
    const hex = computeHexagram([pieceOf(KAN), pieceOf(ZHEN)], { hourBranch: 7, extra: 5 });
    expect(hex.movingLine).toBe(classical([KAN + 1, ZHEN + 1, 5], 7));
  });

  /** 餘 0 取上爻，不是取 0 也不是取初爻 */
  test('整除時為上爻（第 6 爻）', () => {
    // 乾一 + 兌二 + 時辰三 = 6，6 mod 6 = 0
    const hex = computeHexagram([pieceOf(QIAN), pieceOf(DUI)], { hourBranch: 3 });
    expect(hex.movingLine).toBe(6);
  });
});

describe('引擎版本', () => {
  /** 動爻算法改變必須連帶升版，否則新舊記錄混在一起無從分辨 */
  test('版本為 4', () => {
    expect(DIVINATION_ENGINE_VERSION).toBe(4);
  });
});
