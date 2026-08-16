import { branchesClash, julianDayNumber, sexagenaryDay, sixSpiritsForDate, xunKongForDate } from '@/services/sexagenary';

describe('日干支與六神', () => {
  test('可由本地民用日期算出官方例示的 JDN 與干支日', () => {
    // 中央氣象署例：2021-10-10 的 JDN 為 2459498，日干支為辛卯。
    const date = new Date(2021, 9, 10, 23, 59);
    expect(julianDayNumber(date)).toBe(2459498);
    expect(sexagenaryDay(date)).toMatchObject({ index: 27, stem: '辛', branch: '卯', name: '辛卯' });
  });

  test('日干支只取本地日曆日期，不受當天時分影響', () => {
    expect(sexagenaryDay(new Date(2021, 9, 10, 0, 1))).toEqual(sexagenaryDay(new Date(2021, 9, 10, 23, 59)));
  });

  test('六神依日干從初爻向上輪轉', () => {
    // 辛日：庚辛起白虎。
    expect(sixSpiritsForDate(new Date(2021, 9, 10))).toEqual(['白虎', '玄武', '青龍', '朱雀', '勾陳', '螣蛇']);
  });

  test('旬空依十日一旬正確切換', () => {
    // 辛卯是第 28 位，屬甲申旬，午未空。
    expect(xunKongForDate(new Date(2021, 9, 10))).toEqual({ xun: '甲申旬', voidBranches: ['午', '未'] });
    // 甲子日屬甲子旬，戌亥空。
    expect(xunKongForDate(new Date(2019, 0, 27))).toEqual({ xun: '甲子旬', voidBranches: ['戌', '亥'] });
  });

  test('地支六沖成對且方向無關', () => {
    expect(branchesClash('子', '午')).toBe(true);
    expect(branchesClash('午', '子')).toBe(true);
    expect(branchesClash('卯', '酉')).toBe(true);
    expect(branchesClash('寅', '亥')).toBe(false);
  });
});
