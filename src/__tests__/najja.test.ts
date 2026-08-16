import { buildNaJiaReading, transformedLineRelation } from '@/services/najja';
import { hexagramLines, poemIdFromTrigrams } from '@/services/hexagram';

describe('納甲六親世應', () => {
  test('乾為天納甲、六親、世應正確', () => {
    const lines = hexagramLines(0, 0);
    const reading = buildNaJiaReading(0, 0, 1, lines, new Date(2021, 9, 10));

    expect(reading).toMatchObject({
      palace: '乾', palaceElement: '金', generation: '本宮', worldLine: 6, respondingLine: 3, dayStemBranch: '辛卯',
    });
    expect(reading?.lines.map(line => line.stemBranch)).toEqual(['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌']);
    expect(reading?.lines[0]).toMatchObject({ relative: '子孫', element: '水' });
    expect(reading?.lines[5]).toMatchObject({ relative: '父母', isWorld: true });
    expect(reading?.lines[2].isResponding).toBe(true);
    expect(reading?.lines.map(line => line.spirit)).toEqual(['白虎', '玄武', '青龍', '朱雀', '勾陳', '螣蛇']);
    expect(reading?.xun).toBe('甲申旬');
    expect(reading?.voidBranches).toEqual(['午', '未']);
    expect(reading?.lines[3].isVoid).toBe(true); // 壬午
    expect(reading?.monthBranch).toBe('戌');
    expect(reading?.dayBranch).toBe('卯');
    expect(reading?.lines[2].isMonthBroken).toBe(true); // 甲辰，辰戌沖
    expect(reading?.lines.every(line => !line.isDayClashed)).toBe(true);
  });

  test('世爻與應爻始終相隔三爻', () => {
    for (let upper = 0; upper < 8; upper += 1) {
      for (let lower = 0; lower < 8; lower += 1) {
        const reading = buildNaJiaReading(
          upper, lower, poemIdFromTrigrams(upper, lower), hexagramLines(upper, lower),
        );
        expect(reading).not.toBeNull();
        expect(Math.abs((reading?.worldLine ?? 0) - (reading?.respondingLine ?? 0))).toBe(3);
        expect(reading?.lines).toHaveLength(6);
        expect(reading?.lines.filter(line => line.isWorld)).toHaveLength(1);
        expect(reading?.lines.filter(line => line.isResponding)).toHaveLength(1);
      }
    }
  });

  test('損毀的卦號或爻數不產生假盤', () => {
    expect(buildNaJiaReading(0, 0, 999, hexagramLines(0, 0))).toBeNull();
    expect(buildNaJiaReading(0, 0, 1, [0, 0, 0])).toBeNull();
  });

  test('動爻與變爻的五行方向完整且不直接偷換成吉凶', () => {
    expect(transformedLineRelation('水', '水')).toBe('比和');
    expect(transformedLineRelation('木', '水')).toBe('變爻生本爻');
    expect(transformedLineRelation('水', '土')).toBe('變爻剋本爻');
    expect(transformedLineRelation('水', '木')).toBe('本爻生變爻');
    expect(transformedLineRelation('木', '土')).toBe('本爻剋變爻');
  });
});
