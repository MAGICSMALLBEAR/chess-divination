import {
  HEXAGRAM_CATALOG, hexagramEntry, hexagramMatchesSearch,
} from '../services/hexagramCatalog';
import { lineName } from '../services/hexagram';
import { buildLiuYaoReading } from '../services/liuyao';
import { getMovingLineGuidance } from '../services/yaoReading';
import { ALL_POEMS } from '../data/poems';

const byId = (id: number) => {
  const e = hexagramEntry(id);
  if (!e) throw new Error(`卦典缺 #${id}`);
  return e;
};

describe('卦典：六十四卦齊全，依文王卦序', () => {
  it('恰好 64 卦，卦序 1–64 依序排列', () => {
    expect(HEXAGRAM_CATALOG.map(e => e.poemId)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });

  it('卦名就是同一號籤詩上的卦名（不另存一份）', () => {
    for (const poem of ALL_POEMS) {
      expect(byId(poem.id).name).toBe(poem.hexagramName);
    }
  });

  it('前幾卦是乾、坤、屯、蒙——讀《易》的人熟悉的順序', () => {
    expect(HEXAGRAM_CATALOG.slice(0, 4).map(e => e.name)).toEqual(['乾為天', '坤為地', '水雷屯', '山水蒙']);
  });
});

describe('卦典：爻辭', () => {
  it('每一卦都有六條爻辭', () => {
    for (const e of HEXAGRAM_CATALOG) {
      expect(e.yaoTexts).not.toBeNull();
      expect(e.yaoTexts).toHaveLength(6);
    }
  });

  // 爻辭開頭的爻名（初九、六二…）是經文自帶的，而卦形是由卦名推出來的。
  // 兩者互相獨立，對得上才證明爻辭沒有放錯卦、也沒有上下顛倒
  it('每條爻辭開頭的爻名，與由卦形推出的爻名一致（384 條）', () => {
    for (const e of HEXAGRAM_CATALOG) {
      e.yaoTexts!.forEach((text, i) => {
        expect(text.startsWith(`${lineName(e.lines, i + 1)}：`)).toBe(true);
      });
    }
  });

  it('與揭曉頁讀到的動爻爻辭是同一份', () => {
    for (const e of HEXAGRAM_CATALOG) {
      for (let line = 1; line <= 6; line++) {
        expect(e.yaoTexts![line - 1]).toBe(getMovingLineGuidance(e.poemId, line, '平').classicalText);
      }
    }
  });
});

describe('卦典：互、錯、綜', () => {
  // 以下是可以在任何一本《易》書查到的配對，不是拿同一條算式驗自己
  it.each([
    [1, 2], [3, 50], [29, 30], [63, 64], [11, 12],
  ])('錯卦：#%i 與 #%i 互為錯卦', (a, b) => {
    expect(byId(a).opposite.poemId).toBe(b);
    expect(byId(b).opposite.poemId).toBe(a);
  });

  it.each([
    [3, 4], [5, 6], [11, 12], [63, 64], [31, 32],
  ])('綜卦：#%i 與 #%i 互為綜卦', (a, b) => {
    expect(byId(a).reversed.poemId).toBe(b);
    expect(byId(b).reversed.poemId).toBe(a);
  });

  it('綜卦是自己的，恰好是乾、坤、頤、大過、坎、離、中孚、小過八卦', () => {
    const selfInverse = HEXAGRAM_CATALOG.filter(e => e.reversed.poemId === e.poemId).map(e => e.poemId);
    expect(selfInverse).toEqual([1, 2, 27, 28, 29, 30, 61, 62]);
  });

  it('錯卦沒有一卦是自己（六爻全變必然不同）', () => {
    expect(HEXAGRAM_CATALOG.some(e => e.opposite.poemId === e.poemId)).toBe(false);
  });

  it('錯與綜都是對合：做兩次回到本卦', () => {
    for (const e of HEXAGRAM_CATALOG) {
      expect(byId(e.opposite.poemId).opposite.poemId).toBe(e.poemId);
      expect(byId(e.reversed.poemId).reversed.poemId).toBe(e.poemId);
    }
  });

  it.each([
    [1, 1], [2, 2], [3, 23], [63, 64], [64, 63],
  ])('互卦：#%i 的互卦是 #%i', (from, to) => {
    expect(byId(from).nuclear.poemId).toBe(to);
  });

  it('六十四卦的互卦只落在十六卦上（互卦只看中間四爻）', () => {
    expect(new Set(HEXAGRAM_CATALOG.map(e => e.nuclear.poemId)).size).toBe(16);
  });

  it('互卦與揭曉頁盤面上的互卦是同一個答案', () => {
    for (const e of HEXAGRAM_CATALOG) {
      const reading = buildLiuYaoReading(e.upper, e.lower, 1);
      expect(e.nuclear.poemId).toBe(reading.nuclear.poemId);
      expect(e.nuclear.name).toBe(reading.nuclear.name);
    }
  });

  it('關係卦的卦名就是那一號卦的卦名', () => {
    for (const e of HEXAGRAM_CATALOG) {
      for (const ref of [e.nuclear, e.opposite, e.reversed]) {
        expect(ref.name).toBe(byId(ref.poemId).name);
      }
    }
  });
});

describe('hexagramMatchesSearch', () => {
  const hits = (q: string) => HEXAGRAM_CATALOG.filter(e => hexagramMatchesSearch(e, q)).map(e => e.poemId);

  it('空字串全中', () => {
    expect(hits('  ')).toHaveLength(64);
  });

  it('以卦名找得到', () => {
    expect(hits('水雷屯')).toEqual([3]);
  });

  it('以某一句爻辭找得到它在哪一卦——使用者記得的常是句子而不是卦', () => {
    expect(hits('潛龍勿用')).toEqual([1]);
    expect(hits('履霜')).toEqual([2]);
  });

  it('查無此字時是空的', () => {
    expect(hits('不存在的句子')).toEqual([]);
  });
});
