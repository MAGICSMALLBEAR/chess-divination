import { useGodForCategory } from '@/services/useGod';

describe('問事用神候選', () => {
  test('六親為用的類別各有其取法', () => {
    expect(useGodForCategory('wealth')).toMatchObject({ subject: '妻財', relatives: ['妻財'] });
    expect(useGodForCategory('career')).toMatchObject({ subject: '官鬼', relatives: ['官鬼'] });
    expect(useGodForCategory('study')).toMatchObject({ subject: '父母', relatives: ['父母'] });
  });

  test('自占身命之事以世爻為用神，盤面無六親可標', () => {
    // 疾病與出行問的是「我自己如何」，世爻即問卜者本人，
    // 不需要（也不該）猜是哪一個六親
    for (const category of ['health', 'travel']) {
      expect(useGodForCategory(category)).toMatchObject({ subject: '世爻', relatives: [] });
    }
  });

  test('感情取法隨占者性別相反', () => {
    expect(useGodForCategory('marriage', { gender: 'male' })).toMatchObject({ subject: '妻財' });
    expect(useGodForCategory('marriage', { gender: 'female' })).toMatchObject({ subject: '官鬼' });
  });

  test('性別未設定時感情不出用神——取反的用神比沒有用神更誤導', () => {
    expect(useGodForCategory('marriage')).toBeNull();
    expect(useGodForCategory('marriage', {})).toBeNull();
  });

  test('不猜測籠統或自訂問事的用神', () => {
    expect(useGodForCategory('general')).toBeNull();
    expect(useGodForCategory('custom')).toBeNull();
    expect(useGodForCategory()).toBeNull();
  });

  test('喜神與忌神不得相同，忌神也不得就是用神本身', () => {
    // 自我矛盾的設定會讓同一爻同時加分又扣分，斷語就失去意義
    const candidates = [
      useGodForCategory('wealth'),
      useGodForCategory('career'),
      useGodForCategory('study'),
      useGodForCategory('health'),
      useGodForCategory('travel'),
      useGodForCategory('marriage', { gender: 'male' }),
      useGodForCategory('marriage', { gender: 'female' }),
    ];
    for (const c of candidates) {
      expect(c).not.toBeNull();
      expect(c!.favorable).not.toBe(c!.taboo);
      expect(c!.taboo).not.toBe(c!.subject);
    }
  });
});
