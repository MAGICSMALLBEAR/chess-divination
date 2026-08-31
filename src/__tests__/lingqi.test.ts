import { castLingqi, lingqiKey, lingqiNotation, lingqiOracle, lingqiOracleByKey } from '../services/lingqi';
import { LINGQI_ORACLES } from '../data/lingqiOracles';
import { recordFromLingqi, recordHasLevel, type DivinationRecord } from '../services/storage';
import { recordTitle } from '../services/poemList';
import { recordLink } from '../services/recordLink';
import { accuracyByLevel, accuracyByMode } from '../services/verification';
import { readFileSync } from 'fs';
import { join } from 'path';

const ALL_CASTS = (() => {
  const casts = [];
  for (let upper = 0; upper <= 4; upper++)
    for (let middle = 0; middle <= 4; middle++)
      for (let lower = 0; lower <= 4; lower++) casts.push({ upper, middle, lower });
  return casts;
})();

describe('靈棋十二子', () => {
  test('三才各由四枚棋子組成', () => {
    const cast = castLingqi(() => 0);
    expect(cast).toEqual({ upper: 4, middle: 4, lower: 4 });
  });

  test('125 種三才結果均有唯一鍵值', () => {
    const keys = new Set(ALL_CASTS.map(lingqiKey));
    expect(keys.size).toBe(125);
  });

  test('三才數量必須介於 0 至 4', () => {
    expect(() => lingqiKey({ upper: 5, middle: 0, lower: 0 })).toThrow();
    expect(() => lingqiKey({ upper: -1, middle: 0, lower: 0 })).toThrow();
    expect(() => lingqiKey({ upper: 1.5, middle: 0, lower: 0 })).toThrow();
  });
});

describe('《靈棋經》卦目資料', () => {
  test('恰好 125 卦，鍵值不重複且無空缺', () => {
    expect(LINGQI_ORACLES).toHaveLength(125);
    expect(new Set(LINGQI_ORACLES.map(o => o.key)).size).toBe(125);
    for (const cast of ALL_CASTS) expect(lingqiOracleByKey(lingqiKey(cast))).toBeDefined();
  });

  test('每一卦都有卦名、象與至少一段象曰、詩曰', () => {
    for (const oracle of LINGQI_ORACLES) {
      expect(oracle.name).not.toBe('');
      expect(oracle.image).not.toBe('');
      expect(oracle.xiang.length).toBeGreaterThan(0);
      expect(oracle.shi.length).toBeGreaterThan(0);
    }
  });

  /**
   * 「又曰」與「又」是原典在正文之後另附的段落，不是每卦都有。
   * 釘住筆數是為了擋解析器日後改壞時的兩種失敗：全部吃進正文（歸零），
   * 或把正文誤切成附段（暴增）——兩者跑起來都不會拋錯，只會靜靜地少字或多字。
   */
  test('附段筆數與原典相符', () => {
    expect(LINGQI_ORACLES.filter(o => o.shiAlt.length > 0)).toHaveLength(41);
    expect(LINGQI_ORACLES.filter(o => o.xiangAlt.length > 0)).toHaveLength(1);
  });

  test('沒有任何標記漏進卦辭內容', () => {
    for (const oracle of LINGQI_ORACLES) {
      const text = [...oracle.xiang, ...oracle.xiangAlt, ...oracle.shi, ...oracle.shiAlt].join('');
      expect(text).not.toMatch(/[象詩許又]曰/);
      expect(text).not.toMatch(/\{\{/);
    }
  });

  /**
   * 原典未載吉凶等級，資料檔也就沒有 level 欄位。
   * 這條擋的是「日後有人覺得少個等級不方便，順手補一個上去」——
   * 那會讓自撰的判斷混進逐字原典，而且從畫面上看不出來。
   */
  test('卦目資料不含吉凶等級', () => {
    for (const oracle of LINGQI_ORACLES) {
      expect(oracle).not.toHaveProperty('level');
    }
  });
});

describe('卦目標記', () => {
  /**
   * 標記取自資料檔而非自行拼字。自行拼字在全零那一卦會對不上——
   * 原典的專名是「純陰饅」，不是照規則拼出來的空字串。
   */
  test('全零的一擲是原典的「純陰饅」', () => {
    expect(lingqiNotation({ upper: 0, middle: 0, lower: 0 })).toBe('純陰饅');
  });

  test('數量為零的一才略去不寫', () => {
    expect(lingqiNotation({ upper: 2, middle: 1, lower: 0 })).toBe('二上一中');
    expect(lingqiNotation({ upper: 0, middle: 0, lower: 4 })).toBe('四下');
  });

  test('原典卦目與三才數量彼此對得起來', () => {
    const numerals = ['零', '一', '二', '三', '四'];
    for (const cast of ALL_CASTS) {
      const oracle = lingqiOracle(cast);
      if (oracle.notation === '純陰饅') {
        expect(cast).toEqual({ upper: 0, middle: 0, lower: 0 });
        continue;
      }
      const expected = ([['上', cast.upper], ['中', cast.middle], ['下', cast.lower]] as const)
        .filter(([, count]) => count > 0)
        .map(([kind, count]) => `${numerals[count]}${kind}`)
        .join('');
      expect(oracle.notation).toBe(expected);
    }
  });
});

describe('靈棋記錄接入既有資料流', () => {
  const oracle = lingqiOracle({ upper: 1, middle: 1, lower: 1 });
  const base = recordFromLingqi(oracle, 'career', '這份工作該接嗎');

  test('poemId 為 0、poemLevel 為空，且帶著卦目鍵值', () => {
    expect(base.mode).toBe('lingqi');
    expect(base.poemId).toBe(0);
    expect(base.poemLevel).toBe('');
    expect(base.lingqiKey).toBe('1-1-1');
    expect(base.poemTitle).toBe(oracle.name);
  });

  /**
   * 標題不可走籤詩表：poemId 0 會被 getPoemById 的 fallback 換成籤詩 #1，
   * 每一筆靈棋記錄都會印成「龍騰九霄」，而且看起來完全正常。
   */
  test('列表標題顯示卦名而非籤詩 #1', () => {
    expect(recordTitle({ ...base, poemId: 0 })).toBe(oracle.name);
    expect(recordTitle({ poemId: 1, poemTitle: '龍騰九霄', mode: 'draw' })).not.toBe(oracle.name);
  });

  test('歷史記錄點回來是靈棋頁，不是 reveal 頁', () => {
    expect(recordLink({ id: 'a', mode: 'lingqi' }).pathname).toBe('/lingqi');
    expect(recordLink({ id: 'a', mode: 'draw' }).pathname).toBe('/reveal');
    expect(recordLink({ id: 'a', mode: 'board' }).pathname).toBe('/reveal');
  });

  test('沒有等級的記錄不算有等級', () => {
    expect(recordHasLevel(base)).toBe(false);
    expect(recordHasLevel({ poemLevel: '大吉' })).toBe(true);
  });
});

describe('靈棋在占驗統計裡的邊界', () => {
  const rec = (over: Partial<DivinationRecord>): DivinationRecord => ({
    id: `r${Math.random()}`,
    poemId: 1, poemTitle: '龍騰九霄', poemContent: '一二三四', poemLevel: '大吉',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [],
    mode: 'draw', timestamp: Date.now(), isFavorited: false,
    outcome: { status: 'accurate', recordedAt: Date.now() },
    ...over,
  });

  const records = [
    rec({ mode: 'draw', poemLevel: '大吉' }),
    rec({ mode: 'lingqi', poemLevel: '', poemId: 0, lingqiKey: '1-1-1' }),
  ];

  /**
   * 靈棋不進「依吉凶等級」的應驗率——它沒有等級，硬算會多出一組以空字串
   * 為名的分項，而那一組的意思是「原典沒說」，不是一個等級。
   */
  test('依等級的應驗率不含靈棋', () => {
    const byLevel = accuracyByLevel(records);
    expect(byLevel.map(b => b.key)).toEqual(['大吉']);
    expect(byLevel[0].stats.verified).toBe(1);
  });

  /** 但依模式的應驗率要含靈棋——那正是「靈棋準不準」這個問題 */
  test('依模式的應驗率含靈棋', () => {
    expect(accuracyByMode(records).map(b => b.key).sort()).toEqual(['draw', 'lingqi']);
  });
});


/**
 * 分享卡是「送出去的成品」——錯了看不出來也收不回來，因此這幾條守的是
 * 原始碼而非行為：它們擋的兩件事在畫面上都不會報錯，只會默默印錯。
 */
describe('分享卡對靈棋的處理（靜態守門）', () => {
  const raw = readFileSync(join(__dirname, '../components/ShareCardView.tsx'), 'utf8');
  /**
   * 比對前先剝註解。第一版沒剝，「不得出現 mode === 'draw' ?」那條被我自己
   * 解釋這條規則的註解餵成紅燈——與 Session 36 反向守門被註解餵成綠燈同源，
   * 方向相反而已：**靜態守門一律只看程式碼本身**。
   */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  test('沒有等級時整枚標籤略過，而不是印一格空色塊', () => {
    expect(src).toContain('props.poemLevel ? (');
    // levelColor 對空字串會落到「中平」的預設色，無條件渲染就是一格無字色塊
    expect(src).toMatch(/ShareCardLevelColors\['中平'\]/);
  });

  test('底部模式走對照表，不是 draw/其餘 的三元式', () => {
    expect(src).toContain('CARD_MODE_ICONS');
    expect(src).toContain('CARD_MODE_LABEL_KEYS');
    expect(src).not.toMatch(/mode === 'draw' \?/);
  });

  test('對照表涵蓋靈棋', () => {
    expect(src).toMatch(/CARD_MODE_ICONS[^}]*lingqi:/);
    expect(src).toMatch(/CARD_MODE_LABEL_KEYS[^}]*lingqi: 'mode\.lingqi'/);
  });
});
