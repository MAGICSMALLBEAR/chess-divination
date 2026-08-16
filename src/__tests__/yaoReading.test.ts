import { getMovingLineGuidance, hasVerifiedYaoText } from '@/services/yaoReading';

describe('moving-line guidance', () => {
  it('returns verified Zhouyi text for a checked pure hexagram', () => {
    const guidance = getMovingLineGuidance(1, 1, '吉');

    expect(guidance.classicalText).toBe('初九：潛龍勿用。');
    expect(guidance.plainLanguage).toContain('事情剛發端');
    expect(guidance.action).toContain('低風險');
    expect(hasVerifiedYaoText(1, 1)).toBe(true);
  });

  it('does not invent a classical quotation for an unknown hexagram id', () => {
    const guidance = getMovingLineGuidance(999, 4, '小凶');

    expect(guidance.classicalText).toBeNull();
    expect(guidance.plainLanguage).toContain('防守');
    expect(hasVerifiedYaoText(999, 4)).toBe(false);
  });

  it('clamps damaged moving-line values into the valid range', () => {
    expect(getMovingLineGuidance(1, 99, '平').classicalText).toBe('上九：亢龍，有悔。');
  });

  it('covers every one of the 64 hexagrams and all six lines', () => {
    for (let poemId = 1; poemId <= 64; poemId += 1) {
      for (let movingLine = 1; movingLine <= 6; movingLine += 1) {
        expect(hasVerifiedYaoText(poemId, movingLine)).toBe(true);
      }
    }
  });
});
