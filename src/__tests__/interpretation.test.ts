// interpretation.ts 測試
//
// 這是使用者在籤詩頁直接讀到的文字。過去它被標示為「AI 智慧解讀」
// 卻從未呼叫任何模型（tryRemoteAPI 永遠回傳 null），已正名為規則式深度解讀。
// 測試重點在於：該出現的段落有沒有出現、所問類別有沒有真的影響輸出。

import { buildInterpretation } from '../services/interpretation';
import { ALL_POEMS, POEM_LEVELS } from '../data/poems';
import { buildLiuYaoReading } from '../services/liuyao';

const poem = ALL_POEMS[0];           // #1 乾為天，大吉
const lowPoem = ALL_POEMS.find(p => p.level === '下下')!;

/** 產生一組真實的六爻卦例供測試使用（上卦、下卦、動爻） */
function makeReading() {
  return buildLiuYaoReading(0, 0, 3);   // 乾上乾下（乾為天），動爻三
}

describe('解讀組成', () => {
  test('必定包含等級指引、籤詩意境與典故', () => {
    const { interpretation } = buildInterpretation({ poem });

    expect(interpretation).toContain('籤詩意境');
    expect(interpretation).toContain(poem.vernacular);
    expect(interpretation).toContain('典故啟示');
    expect(interpretation).toContain(poem.story);
  });

  test('五種吉凶等級都有對應的指引文字', () => {
    for (const level of POEM_LEVELS) {
      const sample = ALL_POEMS.find(p => p.level === level);
      if (!sample) continue;
      const { interpretation } = buildInterpretation({ poem: sample });
      // 指引段落是第一段，不應為空或退回預設以外的空字串
      expect(interpretation.split('\n\n')[0].length).toBeGreaterThan(10);
    }
  });

  test('有寫問題時會複述問題', () => {
    const { interpretation } = buildInterpretation({
      poem, questionText: '該不該換工作',
    });
    expect(interpretation).toContain('該不該換工作');
  });

  test('沒寫問題時不應出現空的複述段落', () => {
    const { interpretation } = buildInterpretation({ poem });
    expect(interpretation).not.toContain('針對您問的');
  });

  test('段落之間以空行分隔', () => {
    const { interpretation } = buildInterpretation({ poem });
    expect(interpretation.split('\n\n').length).toBeGreaterThanOrEqual(3);
  });
});

describe('所問類別影響解讀', () => {
  test('指定類別會帶出該面向的詳解', () => {
    const { interpretation } = buildInterpretation({
      poem, questionCategory: 'marriage',
    });
    expect(interpretation).toContain('感情方面');
    expect(interpretation).toContain(poem.jieYue.marriage);
  });

  test('六種具體類別各自帶出對應欄位', () => {
    const cases = [
      ['marriage', '感情', poem.jieYue.marriage],
      ['wealth', '財運', poem.jieYue.wealth],
      ['career', '事業', poem.jieYue.career],
      ['health', '健康', poem.jieYue.health],
      ['study', '學業', poem.jieYue.study],
      ['travel', '出行', poem.jieYue.travel],
    ] as const;

    for (const [key, label, text] of cases) {
      const { interpretation } = buildInterpretation({ poem, questionCategory: key });
      expect(interpretation).toContain(`${label}方面`);
      expect(interpretation).toContain(text);
    }
  });

  /** 綜合類別的內容已含在其他段落，不另外重複一段 */
  test('綜合類別不額外插入面向段落', () => {
    const { interpretation } = buildInterpretation({ poem, questionCategory: 'general' });
    expect(interpretation).not.toContain('綜合方面');
  });

  test('未知類別退回綜合，不應拋錯', () => {
    expect(() =>
      buildInterpretation({ poem, questionCategory: '不存在的類別' }),
    ).not.toThrow();
  });

  /** 迴歸：類別若沒真的影響輸出，等於問事分類形同虛設 */
  test('不同類別產生不同的解讀內容', () => {
    const a = buildInterpretation({ poem, questionCategory: 'marriage' }).interpretation;
    const b = buildInterpretation({ poem, questionCategory: 'wealth' }).interpretation;
    expect(a).not.toBe(b);
  });
});

describe('卦例推演納入解讀', () => {
  test('有卦例時會描述本卦／互卦／變卦', () => {
    const reading = makeReading();
    const { interpretation } = buildInterpretation({ poem, reading });

    expect(interpretation).toContain('卦象推演');
    expect(interpretation).toContain(reading.primary.name);
    expect(interpretation).toContain(reading.nuclear.name);
    expect(interpretation).toContain(reading.changed.name);
    expect(interpretation).toContain(reading.movingLineName);
  });

  test('有卦例時會描述體用生剋', () => {
    const reading = makeReading();
    const { interpretation } = buildInterpretation({ poem, reading });

    expect(interpretation).toContain('體用而論');
    expect(interpretation).toContain(reading.bodyUse.text);
  });

  test('沒有卦例時不應出現卦例段落', () => {
    const { interpretation } = buildInterpretation({ poem, reading: null });
    expect(interpretation).not.toContain('卦象推演');
    expect(interpretation).not.toContain('體用而論');
  });

  test('卦例會讓解讀內容不同於無卦例版本', () => {
    const withReading = buildInterpretation({ poem, reading: makeReading() }).interpretation;
    const without = buildInterpretation({ poem }).interpretation;
    expect(withReading.length).toBeGreaterThan(without.length);
  });
});

describe('行動建議', () => {
  test('一定會產生建議且不含空字串', () => {
    const { actionPlan } = buildInterpretation({ poem });
    expect(actionPlan.length).toBeGreaterThan(0);
    for (const item of actionPlan) {
      expect(typeof item).toBe('string');
      expect(item.trim().length).toBeGreaterThan(0);
    }
  });

  test('有卦例時建議會提到動爻與變卦', () => {
    const reading = makeReading();
    const { actionPlan } = buildInterpretation({ poem, reading });
    const joined = actionPlan.join('\n');

    expect(joined).toContain(reading.changed.name);
    expect(joined).toContain(reading.movingLineName);
  });

  /** 五種體用關係都該有對應的行動基調，缺一就會出現 undefined 進到畫面 */
  test('體用關係都能對應到行動基調，不產生 undefined', () => {
    // 窮舉上下卦與動爻，涵蓋所有可能的體用關係
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let line = 1; line <= 6; line++) {
          const reading = buildLiuYaoReading(upper, lower, line);
          const { actionPlan } = buildInterpretation({ poem, reading });
          expect(actionPlan.join('|')).not.toContain('undefined');
        }
      }
    }
  });

  test('吉籤與凶籤在無卦例時給出不同基調', () => {
    const good = buildInterpretation({ poem }).actionPlan.join('|');
    const bad = buildInterpretation({ poem: lowPoem }).actionPlan.join('|');
    expect(good).not.toBe(bad);
  });

  test('下下籤的心態建議改為堅韌', () => {
    const { actionPlan } = buildInterpretation({ poem: lowPoem });
    expect(actionPlan.join('|')).toContain('堅韌');
  });
});

describe('全籤詩健全性', () => {
  /** 任何一首籤詩、任何類別，都不該產生 undefined 或空段落 */
  test('64 首籤詩 × 7 種類別皆能產生完整解讀', () => {
    const categories = ['general', 'marriage', 'wealth', 'career', 'health', 'study', 'travel'];
    for (const p of ALL_POEMS) {
      for (const c of categories) {
        const { interpretation, actionPlan } = buildInterpretation({
          poem: p, questionCategory: c,
        });
        expect(interpretation).not.toContain('undefined');
        expect(interpretation.trim().length).toBeGreaterThan(20);
        expect(actionPlan.every(x => x && !x.includes('undefined'))).toBe(true);
      }
    }
  });
});
