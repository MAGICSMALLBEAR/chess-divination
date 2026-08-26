import {
  ALL_PIECES, ALL_RED_PIECES, ALL_BLACK_PIECES,
  pieceTrigram, getPiecesByType,
  type PieceType,
} from '../data/pieces';
import { TRIGRAM_ELEMENTS, TRIGRAM_OPPOSITE, TRIGRAM_YINYANG } from '../services/hexagram';

const ALL_TYPES: PieceType[] = ['king', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'pawn'];

describe('Chess Pieces', () => {
  test('should have exactly 32 pieces', () => {
    expect(ALL_PIECES).toHaveLength(32);
  });

  test('should have 16 red and 16 black pieces', () => {
    expect(ALL_RED_PIECES).toHaveLength(16);
    expect(ALL_BLACK_PIECES).toHaveLength(16);
  });

  test('each piece should have required fields', () => {
    ALL_PIECES.forEach(piece => {
      expect(piece.id).toBeTruthy();
      expect(piece.type).toBeTruthy();
      expect(piece.color).toMatch(/^(red|black)$/);
      expect(piece.displayChar).toBeTruthy();
      expect(piece.guaElement).toMatch(/^(金|木|水|火|土)$/);
      expect(piece.imageryElement).toMatch(/^(金|木|水|火|土)$/);
      expect(piece.yinYang).toMatch(/^(陰|陽)$/);
      expect(piece.trigram).toBeGreaterThanOrEqual(0);
      expect(piece.trigram).toBeLessThanOrEqual(7);
      expect(piece.keywords.length).toBeGreaterThan(0);
    });
  });

  test('piece ids should be unique', () => {
    const ids = new Set(ALL_PIECES.map(p => p.id));
    expect(ids.size).toBe(32);
  });

  test('piece types should have correct counts', () => {
    expect(getPiecesByType('king')).toHaveLength(2);      // 帥 + 將
    expect(getPiecesByType('advisor')).toHaveLength(4);   // 2 仕 + 2 士
    expect(getPiecesByType('elephant')).toHaveLength(4);  // 2 相 + 2 象
    expect(getPiecesByType('chariot')).toHaveLength(4);   // 4 車
    expect(getPiecesByType('horse')).toHaveLength(4);     // 4 馬
    expect(getPiecesByType('cannon')).toHaveLength(4);    // 2 炮 + 2 砲
    expect(getPiecesByType('pawn')).toHaveLength(10);     // 5 兵 + 5 卒
  });

  test('pieceTrigram should return valid trigrams for every type and color', () => {
    ALL_TYPES.forEach(type => {
      (['red', 'black'] as const).forEach(color => {
        const trigram = pieceTrigram(type, color);
        expect(trigram).toBeGreaterThanOrEqual(0);
        expect(trigram).toBeLessThanOrEqual(7);
      });
    });
  });

  // ====== Phase 1 迴歸：舊版兌卦永遠無棋可對應 ======

  test('all 8 trigrams must be reachable from the 32 pieces', () => {
    const reachable = new Set(ALL_PIECES.map(p => p.trigram));
    expect(reachable.size).toBe(8);
    for (let t = 0; t < 8; t++) {
      expect(reachable.has(t)).toBe(true);
    }
  });

  test('red and black of the same piece type must be opposite trigrams (錯卦)', () => {
    ALL_TYPES.forEach(type => {
      const red = pieceTrigram(type, 'red');
      const black = pieceTrigram(type, 'black');
      expect(TRIGRAM_OPPOSITE[red]).toBe(black);
    });
  });

  test('king anchors 紅陽黑陰: 帥為乾（純陽）、將為坤（純陰）', () => {
    expect(pieceTrigram('king', 'red')).toBe(0);   // 乾
    expect(pieceTrigram('king', 'black')).toBe(7); // 坤
  });

  test('guaElement and yinYang must be derived from the trigram', () => {
    ALL_PIECES.forEach(piece => {
      expect(piece.guaElement).toBe(TRIGRAM_ELEMENTS[piece.trigram]);
      expect(piece.yinYang).toBe(TRIGRAM_YINYANG[piece.trigram]);
    });
  });
});

/**
 * 卦象機率分佈的守門（審查 A24，決定維持現狀）。
 *
 * 七種棋子塞進四組錯卦，必然有兩種共用一組（`advisor` 與 `pawn` 同用
 * 艮／兌）；加上象棋的實際子數，每卦的棋子數就成了 乾1 兌7 離4 震4
 * 巽4 坎4 艮7 坤1。兩顆棋時乾為天／坤為地各約 1/1024、兌為澤／艮為山
 * 約 49/1024，相差約 49 倍。
 *
 * 這是「忠於棋盤實際子數」的刻意選擇，不是缺陷——一副象棋本來就只有
 * 一支帥、卻有五個兵。這幾條測試把現況釘住：數字被動到就會紅，逼人
 * 重新看過 pieces.ts 裡的理由，而不是默默改掉；同時也證明差異來自
 * 棋盤組成而非抽取偏差。
 */
describe('棋子→八卦的分佈（刻意不均）', () => {
  /** 每一卦實際有幾顆棋 */
  const countsByTrigram = (() => {
    const counts = new Array(8).fill(0) as number[];
    ALL_PIECES.forEach(p => { counts[p.trigram] += 1; });
    return counts;
  })();

  test('八卦分佈為 乾1 兌7 離4 震4 巽4 坎4 艮7 坤1', () => {
    expect(countsByTrigram).toEqual([1, 7, 4, 4, 4, 4, 7, 1]);
    expect(countsByTrigram.reduce((a, b) => a + b, 0)).toBe(32);
  });

  test('每一卦都至少有一顆棋——沒有抽不到的卦', () => {
    // 這才是真正的缺陷條件（舊版兌卦無棋，15 首籤詩永遠抽不到）
    expect(countsByTrigram.every(n => n > 0)).toBe(true);
  });

  test('不均來自兩種棋共用一組錯卦，而非抽取偏差', () => {
    const shared = ALL_TYPES.filter(type =>
      pieceTrigram(type, 'red') === pieceTrigram('pawn', 'red'));
    expect(shared.sort()).toEqual(['advisor', 'pawn']);

    // 每顆棋在牌堆中都只出現一次——抽取本身是均勻的
    expect(new Set(ALL_PIECES.map(p => p.id)).size).toBe(ALL_PIECES.length);
  });

  test('錯卦成對，兩兩的棋子數相同', () => {
    // 紅黑互為錯卦，所以對卦的棋子數必然相等；不相等代表配對被改壞了
    for (let trigram = 0; trigram < 8; trigram++) {
      expect(countsByTrigram[trigram]).toBe(countsByTrigram[TRIGRAM_OPPOSITE[trigram]]);
    }
  });

  test('最不均的兩卦相差 7 倍，兩顆棋時即為 49 倍', () => {
    const max = Math.max(...countsByTrigram);
    const min = Math.min(...countsByTrigram);
    expect(max / min).toBe(7);
    // 兩顆棋各自獨立抽取，故卦象機率是兩個邊際機率相乘
    expect((max / 32) ** 2 / (min / 32) ** 2).toBe(49);
  });
});
