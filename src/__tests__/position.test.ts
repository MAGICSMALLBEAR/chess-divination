import {
  getBoardDirection,
  getPositionMeaning,
  generatePositionSummaryDeep,
} from '../services/position';

describe('棋盤方位', () => {
  /**
   * 迴歸：舊版只取 中／北／南 三值且完全沒用到 col，
   * 九宮以外的格子在東西向上無法區分。
   */
  test('should use both col and row to derive one of the eight directions', () => {
    // 依「上南下北、左東右西」
    expect(getBoardDirection(0, 0)).toBe('東南');
    expect(getBoardDirection(8, 0)).toBe('西南');
    expect(getBoardDirection(0, 9)).toBe('東北');
    expect(getBoardDirection(8, 9)).toBe('西北');
    expect(getBoardDirection(0, 4)).toBe('東');
    expect(getBoardDirection(8, 4)).toBe('西');
    expect(getBoardDirection(4, 3)).toBe('南');
    expect(getBoardDirection(4, 6)).toBe('北');
  });

  test('the palace should be the centre', () => {
    expect(getBoardDirection(4, 1)).toBe('中');
    expect(getBoardDirection(3, 8)).toBe('中');
  });

  test('columns must actually change the result', () => {
    const west = getBoardDirection(8, 0);
    const east = getBoardDirection(0, 0);
    expect(west).not.toBe(east);
  });
});

describe('五行生剋', () => {
  /**
   * 迴歸：舊版只判四種關係，把「生我（印）」誤併入「比和」，
   * 漏掉「有貴人扶助」這個最正面的訊號。
   */
  test('should distinguish all five relations', () => {
    // 以卦氣屬金的棋子為例，走遍五種關係
    const tips = [
      getPositionMeaning(4, 1, '金').wuxingTip,  // 中(土) 生金 → 生我
      getPositionMeaning(8, 4, '金').wuxingTip,  // 西(金)     → 比和
      getPositionMeaning(4, 6, '金').wuxingTip,  // 北(水) 金生水 → 我生
      getPositionMeaning(0, 4, '金').wuxingTip,  // 東(木) 金剋木 → 我剋
      getPositionMeaning(4, 3, '金').wuxingTip,  // 南(火) 火剋金 → 剋我
    ];

    expect(tips[0]).toContain('生我');
    expect(tips[1]).toContain('比和');
    expect(tips[2]).toContain('我生');
    expect(tips[3]).toContain('我剋');
    expect(tips[4]).toContain('剋我');

    // 五種關係的敘述必須各不相同
    expect(new Set(tips).size).toBe(5);
  });

  test('生我 must not be reported as 比和', () => {
    const tip = getPositionMeaning(4, 1, '金').wuxingTip!;
    expect(tip).toContain('土生金');
    expect(tip).not.toContain('比和');
  });
});

describe('位置解讀', () => {
  test('should always return a board direction', () => {
    for (let col = 0; col < 9; col++) {
      for (let row = 0; row < 10; row++) {
        const m = getPositionMeaning(col, row, '金', '直線');
        expect(m.boardDirection).toBeTruthy();
        expect(m.zone).toBeTruthy();
        expect(m.advice).toBeTruthy();
      }
    }
  });

  test('deep summary should mention the direction and gua element', () => {
    const summary = generatePositionSummaryDeep([
      { col: 0, row: 0, guaElement: '金', direction: '直線', pieceName: '車' },
    ]);
    expect(summary).toContain('車');
    expect(summary).toContain('卦氣屬金');
    expect(summary).toContain('東南');
  });

  test('empty placements should produce an empty summary', () => {
    expect(generatePositionSummaryDeep([])).toBe('');
  });
});
