import {
  SPREADS, SPREAD_LABEL_KEYS, SPREAD_DESC_KEYS, SPREAD_HINT_KEYS,
  getSpread, nextSpreadSlot, spreadContextReading, spreadReadingPrefix, spreadRoleReading,
  type SpreadId,
} from '../services/spreads';
import { t, setLang } from '../services/i18n';

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

  test('兩難抉擇陣可保存使用者替選項取的名稱', () => {
    expect(spreadContextReading('choice', { optionA: ' 留在現職 ', optionB: '轉職' }))
      .toBe('本次比較：選項 A＝留在現職；選項 B＝轉職\n\n');
    expect(spreadContextReading('timeline', { optionA: '不應顯示' })).toBe('');
  });
});

// ── 介面三語守門 ──
//
// 生成的命理解讀文字是中文限定（與 position.ts、interpretation.ts 一致），
// 但**介面**是三語的。角色名若把 slot.label 直接插進已翻譯的句子，
// 英文使用者會看到「Next: 過去」這種混語，日文同理。

describe('牌陣角色名的三語覆蓋', () => {
  const LANGS = ['zh-TW', 'en', 'ja'] as const;

  test('每個角色都帶 labelKey，且不是空字串', () => {
    for (const spread of Object.values(SPREADS)) {
      for (const slot of spread.slots) {
        expect(`${spread.id}/${slot.id}: ${slot.labelKey}`)
          .toMatch(/: board\.slot\w+$/);
      }
    }
  });

  test('labelKey 在三種語言都查得到，不會回退成鍵名', () => {
    const missing: string[] = [];
    for (const spread of Object.values(SPREADS)) {
      for (const slot of spread.slots) {
        for (const lang of LANGS) {
          setLang(lang);
          const text = t(slot.labelKey);
          // t() 查無此鍵時原樣回傳鍵名——那就是漏翻譯
          if (text === slot.labelKey) missing.push(`${lang}/${slot.labelKey}`);
        }
      }
    }
    setLang('zh-TW');
    expect(missing).toEqual([]);
  });

  /** 同一個 slot id 在不同牌陣代表不同角色（如 self 在抉擇陣與關係陣），鍵不可共用 */
  test('不同牌陣的同名角色使用各自的鍵', () => {
    const keys = Object.values(SPREADS).flatMap(s => s.slots.map(sl => sl.labelKey));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('角色解讀的邊界', () => {
  test('落子數少於角色數時只讀出已落的部分', () => {
    const reading = spreadRoleReading('timeline', [
      { pieceName: '車', meaning: '推進力強' },
    ]);
    expect(reading).toContain('車');
    // 尚未落子的角色不該出現
    expect(reading).not.toContain('下一步');
  });

  test('落子數多於角色數時只取前 N 顆，不溢出', () => {
    const pieces = ['車', '馬', '炮', '兵'].map(n => ({ pieceName: n, meaning: 'x' }));
    const reading = spreadRoleReading('timeline', pieces);
    expect(reading).toContain('炮');
    expect(reading).not.toContain('兵');
  });

  test('沒有落子時回傳空字串', () => {
    expect(spreadRoleReading('timeline', [])).toBe('');
  });
});

// ── 對照表完整性 ──
//
// 牌陣的 i18n 鍵分成三張表（名稱／說明／適用提示），由兩批平行開發
// 先後加入。新增一種牌陣時只補其中一兩張表，缺的那張會讓畫面直接
// 顯示鍵名——功能不會壞，所以人工測試很容易放過。

describe('牌陣 i18n 對照表', () => {
  const LANGS = ['zh-TW', 'en', 'ja'] as const;
  const ids = Object.keys(SPREADS) as SpreadId[];
  const TABLES: [string, Record<SpreadId, string>][] = [
    ['SPREAD_LABEL_KEYS', SPREAD_LABEL_KEYS],
    ['SPREAD_DESC_KEYS', SPREAD_DESC_KEYS],
    ['SPREAD_HINT_KEYS', SPREAD_HINT_KEYS],
  ];

  test('三張表都涵蓋全部牌陣，沒有多餘項目', () => {
    for (const [name, table] of TABLES) {
      expect(`${name}: ${Object.keys(table).sort().join(',')}`)
        .toBe(`${name}: ${[...ids].sort().join(',')}`);
    }
  });

  test('三張表的鍵在三種語言都查得到', () => {
    const missing: string[] = [];
    for (const [name, table] of TABLES) {
      for (const id of ids) {
        for (const lang of LANGS) {
          setLang(lang);
          if (t(table[id]) === table[id]) missing.push(`${lang}/${name}/${id}`);
        }
      }
    }
    setLang('zh-TW');
    expect(missing).toEqual([]);
  });

  test('三張表彼此不共用同一個鍵', () => {
    const all = TABLES.flatMap(([, table]) => Object.values(table));
    expect(new Set(all).size).toBe(all.length);
  });
});
