import { useGodForCategory } from '@/services/useGod';

describe('問事用神候選', () => {
  test('只為語意明確的類別提供六親候選', () => {
    expect(useGodForCategory('wealth')).toMatchObject({ relatives: ['妻財'] });
    expect(useGodForCategory('career')).toMatchObject({ relatives: ['官鬼'] });
    expect(useGodForCategory('study')).toMatchObject({ relatives: ['父母'] });
  });

  test('不猜測感情、健康或自訂問事的用神', () => {
    expect(useGodForCategory('marriage')).toBeNull();
    expect(useGodForCategory('health')).toBeNull();
    expect(useGodForCategory('general')).toBeNull();
    expect(useGodForCategory('custom')).toBeNull();
    expect(useGodForCategory()).toBeNull();
  });
});
