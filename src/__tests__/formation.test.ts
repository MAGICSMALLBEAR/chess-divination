// 兩軍對壘陣 — 紅黑各成一卦的起卦引擎
//
// 這個引擎最容易被「修好」的地方，恰好是它的設計核心：
//   1. 爻序由河邊向外——改成年級式的由上而下看起來更「整齊」，
//      卻會讓「布在哪裡」不再決定爻位，牌陣的形變成假的；
//   2. 動爻取帶符號的子力差——改成絕對值會讓紅強黑強殊途同歸，
//      而方向本身是這個牌陣要給的訊息。
// 因此這裡刻意用混色陣形釘住幾個具體數字，擋掉未來「順手簡化」。

import { ALL_PIECES, type ChessPiece } from '../data/pieces';
import { YANG, YIN } from '../services/hexagram';
import {
  FORMATION_PER_SIDE, FORMATION_RED_ROWS, FORMATION_BLACK_ROWS, PIECE_FORCE,
  formationSideOf, formationLines, formationForce, formationCounts,
  computeFormationHexagram, formationForceReading,
  type FormationPiece,
} from '../services/formation';

const piece = (type: ChessPiece['type'], color: 'red' | 'black'): ChessPiece =>
  ALL_PIECES.find(p => p.type === type && p.color === color)!;

const at = (p: ChessPiece, col: number, row: number): FormationPiece => ({ piece: p, col, row });

describe('兩軍對壘陣半場', () => {
  test('楚河漢界分半場：黑在上（0–4）、紅在下（5–9）', () => {
    expect(FORMATION_RED_ROWS).toEqual([5, 9]);
    expect(FORMATION_BLACK_ROWS).toEqual([0, 4]);
    expect(formationSideOf(0)).toBe('black');
    expect(formationSideOf(4)).toBe('black');
    expect(formationSideOf(5)).toBe('red');
    expect(formationSideOf(9)).toBe('red');
  });

  test('半場之外的格位不屬於任何一方', () => {
    expect(() => formationSideOf(10)).toThrow();
    expect(() => formationSideOf(-1)).toThrow();
  });
});

describe('兩軍對壘陣成爻', () => {
  /** 混色才能釘住爻序——全同色時換位不影響結果，看不出排序有沒有壞 */
  test('爻序由河邊向外，同排依 col 由左至右', () => {
    // 紅方半場：河邊兩子在前（初、二爻），後方一子（三爻）
    const redSide = [
      at(piece('king', 'red'), 4, 9),     // 離河最遠 → 三爻
      at(piece('pawn', 'black'), 4, 5),   // 河邊，col 4 → 二爻
      at(piece('chariot', 'red'), 0, 5),  // 河邊，col 0 → 初爻
    ];
    expect(formationLines(redSide, 'red')).toEqual([YANG, YIN, YANG]);

    // 黑方半場：河邊在前（初爻），往上依序
    const blackSide = [
      at(piece('cannon', 'black'), 0, 0),  // 最遠 → 三爻
      at(piece('pawn', 'red'), 1, 2),      // 第二排 → 二爻
      at(piece('chariot', 'black'), 0, 4), // 河邊 → 初爻
    ];
    expect(formationLines(blackSide, 'black')).toEqual([YIN, YANG, YIN]);
  });

  /**
   * 棋子顏色成爻，不是半場成爻：黑棋落進紅方半場，
   * 那一爻就是陰——敵方勢力滲進己陣，正是這個牌陣要顯現的訊息。
   */
  test('落在半場的敵方顏色棋子成為陰爻', () => {
    const redSide = [
      at(piece('pawn', 'black'), 0, 5),
      at(piece('chariot', 'red'), 4, 5),
      at(piece('king', 'red'), 4, 9),
    ];
    expect(formationLines(redSide, 'red')).toEqual([YIN, YANG, YANG]);
  });

  test('半場不滿三子不成陣', () => {
    const two = [at(piece('king', 'red'), 4, 9), at(piece('chariot', 'red'), 0, 5)];
    expect(() => formationLines(two, 'red')).toThrow(/恰好 3 子/);
    // 對方半場沒子也不算——兩軍對壘必須兩邊都成陣
    expect(() => formationLines(two, 'black')).toThrow(/恰好 3 子/);
  });

  test('同一組棋子、不同陣形，成不同的卦', () => {
    // 同一黑卒一車一帥，黑卒在前排是初爻、在後排就換爻位
    const blackAtFront = [
      at(piece('pawn', 'black'), 0, 5),
      at(piece('king', 'red'), 4, 5),
      at(piece('chariot', 'red'), 8, 7),
    ];
    const blackAtRear = [
      at(piece('chariot', 'red'), 8, 5),
      at(piece('pawn', 'black'), 0, 7),
      at(piece('king', 'red'), 4, 7),
    ];
    expect(formationLines(blackAtFront, 'red')).toEqual([YIN, YANG, YANG]);
    expect(formationLines(blackAtRear, 'red')).toEqual([YANG, YIN, YANG]);
  });
});

describe('兩軍對壘陣子力', () => {
  test('子力表與象棋通行估值相符', () => {
    expect(PIECE_FORCE).toEqual({
      king: 9, chariot: 9, cannon: 5, horse: 4, elephant: 2, advisor: 2, pawn: 1,
    });
  });

  test('子力依半場歸屬計算，不看棋子顏色', () => {
    const pieces = [
      at(piece('chariot', 'black'), 0, 5), // 黑車落在紅方半場，算紅方陣的戰力
      at(piece('chariot', 'red'), 4, 5),
      at(piece('king', 'red'), 4, 9),
      at(piece('pawn', 'red'), 0, 0),      // 紅兵落在黑方半場，算黑方陣的戰力
    ];
    expect(formationForce(pieces, 'red')).toBe(27);
    expect(formationForce(pieces, 'black')).toBe(1);
  });

  test('formationCounts 統計各半場落子數', () => {
    const pieces = [
      at(piece('chariot', 'black'), 0, 5),
      at(piece('chariot', 'red'), 4, 5),
      at(piece('king', 'red'), 4, 9),
      at(piece('pawn', 'red'), 0, 0),
    ];
    expect(formationCounts(pieces)).toEqual({ red: 3, black: 1 });
  });
});

describe('兩軍對壘陣起卦', () => {
  /**
   * 釘住一組已知的完整陣：
   *   紅方半場 黑卒（陰）＋紅車（陽）＋紅帥（陽）＝巽（風），力 19；
   *   黑方半場 黑卒＋黑馬＋黑車＝坤（地），力 14；紅強 5。
   * 上風下地 → 風地觀。
   */
  const formation: FormationPiece[] = [
    at(piece('pawn', 'black'), 0, 5),
    at(piece('chariot', 'red'), 4, 5),
    at(piece('king', 'red'), 4, 9),
    at(piece('pawn', 'black'), 0, 4),
    at(piece('horse', 'black'), 1, 2),
    at(piece('chariot', 'black'), 0, 0),
  ];

  test('紅方為上卦、黑方為下卦', () => {
    const result = computeFormationHexagram(formation, { hourBranch: 1 });
    expect(result.upper).toBe(4);  // 巽
    expect(result.lower).toBe(7);  // 坤
    expect(result.name).toBe('風地觀');
    expect(result.poemId).toBe(20);
  });

  test('動爻 = (上卦數＋下卦數＋子力差＋時辰數) mod 6，餘 0 為上爻', () => {
    // (4+1) + (7+1) + (19−14) + 1 = 19 → 19 mod 6 = 1
    expect(computeFormationHexagram(formation, { hourBranch: 1 }).movingLine).toBe(1);
    // 餘 0 → 上爻（6），不是第 0 爻
    expect(computeFormationHexagram(formation, { hourBranch: 6 }).movingLine).toBe(6);
  });

  /**
   * 子力差帶符號：黑強時動爻與紅強時不同。
   * 改成 Math.abs 之後下面這條會紅——那正是「方向訊息被抹掉」的哨兵。
   */
  test('黑方較盛時子力差為負，動爻異於紅方較盛時', () => {
    const blackStrong: FormationPiece[] = [
      at(piece('pawn', 'red'), 0, 5),
      at(piece('pawn', 'red'), 2, 5),
      at(piece('pawn', 'red'), 4, 5),
      at(piece('chariot', 'black'), 0, 0),
      at(piece('chariot', 'black'), 2, 2),
      at(piece('chariot', 'black'), 4, 4),
    ];
    // 紅 3 力 − 黑 27 力 = −24；hourBranch 2 → (0+1)+(7+1)+(−24)+2 = −13 → mod 6 = 5
    expect(computeFormationHexagram(blackStrong, { hourBranch: 2 }).movingLine).toBe(5);
  });

  test('全紅上卦全黑下卦為天地否，籤詩對應文王卦序 #12', () => {
    const pure: FormationPiece[] = [
      at(piece('pawn', 'red'), 0, 5),
      at(piece('pawn', 'red'), 2, 5),
      at(piece('pawn', 'red'), 4, 5),
      at(piece('pawn', 'black'), 0, 0),
      at(piece('pawn', 'black'), 2, 0),
      at(piece('pawn', 'black'), 4, 0),
    ];
    const result = computeFormationHexagram(pure, { hourBranch: 1 });
    expect(result.upper).toBe(0);  // 乾
    expect(result.lower).toBe(7);  // 坤
    expect(result.name).toBe('天地否');
    expect(result.poemId).toBe(12);
  });
});

describe('兩軍強弱對比', () => {
  const formation: FormationPiece[] = [
    at(piece('pawn', 'black'), 0, 5),
    at(piece('chariot', 'red'), 4, 5),
    at(piece('king', 'red'), 4, 9),
    at(piece('pawn', 'black'), 0, 4),
    at(piece('horse', 'black'), 1, 2),
    at(piece('chariot', 'black'), 0, 0),
  ];

  test('統計雙方子力並給出強弱判斷', () => {
    const text = formationForceReading(formation);
    expect(text).toContain('紅方陣');
    expect(text).toContain('黑方陣');
    expect(text).toContain('＝19');
    expect(text).toContain('＝14');
    expect(text).toContain('紅方子力較盛');
  });

  test('勢均力敵與黑方較盛各有斷語', () => {
    const even: FormationPiece[] = [
      at(piece('pawn', 'red'), 0, 5),
      at(piece('pawn', 'red'), 2, 5),
      at(piece('pawn', 'red'), 4, 5),
      at(piece('pawn', 'black'), 0, 0),
      at(piece('pawn', 'black'), 2, 0),
      at(piece('pawn', 'black'), 4, 0),
    ];
    expect(formationForceReading(even)).toContain('雙方勢均力敵');

    const blackStrong: FormationPiece[] = [
      at(piece('pawn', 'red'), 0, 5),
      at(piece('pawn', 'red'), 2, 5),
      at(piece('pawn', 'red'), 4, 5),
      at(piece('chariot', 'black'), 0, 0),
      at(piece('chariot', 'black'), 2, 2),
      at(piece('chariot', 'black'), 4, 4),
    ];
    expect(formationForceReading(blackStrong)).toContain('黑方子力較盛');
  });

  test('每方落子數為三的常數被釘住', () => {
    expect(FORMATION_PER_SIDE).toBe(3);
  });
});
