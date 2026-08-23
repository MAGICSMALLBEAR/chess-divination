import { getSpread, nextSpreadSlot, spreadReadingPrefix, spreadRoleReading } from '../services/spreads';

describe('牌陣規則', () => {
  test('自由佈局不強制固定格位', () => {
    expect(getSpread('free').slots).toEqual([]);
    expect(nextSpreadSlot('free', 0)).toBeNull();
  });

  test.each(['timeline', 'choice', 'relationship', 'strategy'] as const)(
    '%s 固定為三個互不重複的角色格位',
    (id) => {
      const slots = getSpread(id).slots;
      expect(slots).toHaveLength(3);
      expect(new Set(slots.map(slot => `${slot.col},${slot.row}`)).size).toBe(3);
      expect(nextSpreadSlot(id, 0)).toBe(slots[0]);
      expect(nextSpreadSlot(id, 3)).toBeNull();
    },
  );

  test('固定牌陣可產生可儲存的閱讀前綴', () => {
    expect(spreadReadingPrefix('choice')).toContain('兩難抉擇陣');
    expect(spreadReadingPrefix('choice')).toContain('選項 A');
    expect(spreadReadingPrefix('free')).toBe('');
  });

  test('實際落子會依序綁定牌陣角色', () => {
    const text = spreadRoleReading('timeline', [
      { pieceName: '車', meaning: '直行突破。' },
      { pieceName: '馬', meaning: '靈活應對。' },
      { pieceName: '兵', meaning: '穩步前進。' },
    ]);
    expect(text).toContain('過去・車');
    expect(text).toContain('當下・馬');
    expect(text).toContain('下一步・兵');
  });

  test('自由佈局不額外加入角色閱讀', () => {
    expect(spreadRoleReading('free', [{ pieceName: '車', meaning: '直行突破。' }])).toBe('');
  });
});
