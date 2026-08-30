import { castLingqi, lingqiKey } from '../services/lingqi';

describe('靈棋十二子', () => {
  test('三才各由四枚棋子組成', () => {
    const cast = castLingqi(() => 0);
    expect(cast).toEqual({ upper: 4, middle: 4, lower: 4 });
  });

  test('125 種三才結果均有唯一鍵值', () => {
    const keys = new Set<string>();
    for (let upper = 0; upper <= 4; upper++) for (let middle = 0; middle <= 4; middle++) for (let lower = 0; lower <= 4; lower++) keys.add(lingqiKey({ upper, middle, lower }));
    expect(keys.size).toBe(125);
  });
});
