import { branchesClash, julianDayNumber, sexagenaryDay, sixSpiritsForDate, xunKongForDate } from '@/services/sexagenary';
import { hourBranchNumber, monthBranchContext, toLocalDateString } from '@/services/date';

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

/**
 * 「同一個時鐘」守門。
 *
 * 審查曾提出日柱應改用固定的台北時間（裝置設在別的時區時日柱會差一天）。
 * 但起卦的三個時間量——日柱、時辰、月建——目前全部取自裝置本地時鐘，
 * 這是刻意的：傳統起卦以問卜者當下所在的時間為準。
 *
 * 只把日柱改成台北時間會讓卦盤自身不自洽：倫敦晚上八點起卦會得到「戌時」
 * 配上台北隔天的日柱，旬空、六神、暗動全部錯位。這幾條測試把「三者同源」
 * 釘住——日後真要改時區政策，必須三個一起改，而不是只動其中一個。
 */
describe('起卦的時間量取自同一個時鐘', () => {
  test('日柱只看本地年月日，同一天的不同時刻結果相同', () => {
    const morning = new Date(2026, 7, 26, 0, 1);
    const night = new Date(2026, 7, 26, 23, 59);
    expect(sexagenaryDay(morning)).toEqual(sexagenaryDay(night));
  });

  test('本地日期跨到隔天，日柱才前進一位', () => {
    const before = sexagenaryDay(new Date(2026, 7, 26, 23, 59));
    const after = sexagenaryDay(new Date(2026, 7, 27, 0, 0));
    expect(after.index).toBe((before.index + 1) % 60);
  });

  /**
   * 若日柱改用台北時間而時辰不改，這條會紅：UTC+8 之外的裝置在深夜或
   * 清晨起卦時，日柱會跳到隔天，但時辰仍停在當地的夜裡。
   */
  test('深夜子時：日柱仍是當地的今天，時辰是子時', () => {
    const lateNight = new Date(2026, 7, 26, 23, 30);
    expect(hourBranchNumber(lateNight)).toBe(1);                       // 子時
    expect(toLocalDateString(lateNight)).toBe('2026-08-26');
    expect(sexagenaryDay(lateNight)).toEqual(sexagenaryDay(new Date(2026, 7, 26, 12, 0)));
  });

  test('月建同樣取自本地月份，與日柱不會分屬不同時區', () => {
    // 月底最後一刻：三者都必須還在同一個本地日曆日之內
    const monthEnd = new Date(2026, 7, 31, 23, 45);
    expect(monthBranchContext(monthEnd).branch).toBe(monthBranchContext(new Date(2026, 7, 31, 0, 5)).branch);
    expect(sexagenaryDay(monthEnd)).toEqual(sexagenaryDay(new Date(2026, 7, 31, 0, 5)));
  });

  test('連續 400 天的日柱嚴格遞增循環，中間不跳日也不重複', () => {
    // 窮舉跨越年界與閏月，確保沒有某個特定日期被時區換算吃掉一天
    let previous = sexagenaryDay(new Date(2026, 0, 1, 12, 0)).index;
    for (let i = 1; i < 400; i++) {
      const index = sexagenaryDay(new Date(2026, 0, 1 + i, 12, 0)).index;
      expect(index).toBe((previous + 1) % 60);
      previous = index;
    }
  });
});
