import {
  HEXAGRAM_CATALOG, hexagramEntry, hexagramMatchesSearch,
} from '../services/hexagramCatalog';
import { lineName } from '../services/hexagram';
import { buildLiuYaoReading } from '../services/liuyao';
import { getMovingLineGuidance } from '../services/yaoReading';
import { ALL_POEMS } from '../data/poems';
import { ZHOUYI_TEXTS } from '../data/zhouyiTexts';

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

describe('卦典：卦辭與大象', () => {
  // 籤詩卦名與維基原文的用字不同（無妄／无妄、恒／恆），比對卦名時視為同字；
  // 畫面上各自印來源原字，這裡只是認人
  const same = (s: string) => s.replace(/無/g, '无').replace(/恒/g, '恆');

  it('產生檔 64 卦齊全，卦序 1–64', () => {
    expect(Object.keys(ZHOUYI_TEXTS).map(Number).sort((a, b) => a - b))
      .toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });

  // 產生檔的卦名來自維基逐卦頁，App 的卦名來自籤詩——兩個來源互相獨立，
  // 對得上才證明產生腳本沒有把卦序排錯（例如把第三卦的卦辭掛到第四卦）
  it('產生檔的卦名就是同一號籤詩卦名的卦名部分（坎卦原文作「習坎」）', () => {
    for (const poem of ALL_POEMS) {
      const shortName = poem.hexagramName.includes('為') ? poem.hexagramName[0] : poem.hexagramName.slice(2);
      const name = ZHOUYI_TEXTS[poem.id].name;
      expect([same(shortName), `習${same(shortName)}`]).toContain(same(name));
    }
  });

  it('卦辭一律以卦名起首（「屯：」或「履虎尾」這種卦名入句的寫法）', () => {
    for (const e of HEXAGRAM_CATALOG) {
      expect(e.judgment.startsWith(ZHOUYI_TEXTS[e.poemId].name)).toBe(true);
    }
  });

  it('大象都提到本卦卦名（乾坤除外：「天行健」「地勢坤」以象起首）', () => {
    for (const e of HEXAGRAM_CATALOG.filter(x => x.poemId > 2)) {
      const shortName = ZHOUYI_TEXTS[e.poemId].name.replace(/^習/, '');
      expect(same(e.image)).toContain(same(shortName));
    }
  });

  it.each([
    [1, '乾：元亨。利貞。', '天行健，君子以自強不息。'],
    [2, '坤：元亨。利牝馬之貞。', '地勢坤，君子以厚德載物。'],
    [10, '履虎尾，不咥人，亨。', '上天下澤，履；君子以辨上下，定民志。'],
  ])('#%i 的卦辭與大象', (id, judgment, image) => {
    expect(byId(id).judgment).toBe(judgment);
    expect(byId(id).image).toBe(image);
  });

  it('兩處已裁定的異文：剝取「山附於地」、革取「巳日乃孚」', () => {
    expect(byId(23).image).toContain('山附於地');
    expect(byId(49).judgment).toContain('巳日乃孚');
  });

  it('經文裡沒有維基標記殘留，也沒有空白', () => {
    for (const e of HEXAGRAM_CATALOG) {
      for (const text of [e.judgment, e.image]) {
        expect(text).not.toMatch(/[-{}<>'|\s]/);
      }
    }
  });

  it('可以用卦辭或大象搜到那一卦', () => {
    const hits = (q: string) => HEXAGRAM_CATALOG.filter(e => hexagramMatchesSearch(e, q)).map(e => e.poemId);
    expect(hits('自強不息')).toEqual([1]);
    expect(hits('厚德載物')).toEqual([2]);
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
