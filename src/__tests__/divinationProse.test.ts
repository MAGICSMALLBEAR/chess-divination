// 命理散文翻譯：覆蓋率、術語保留、與「刻意不翻譯」邊界
//
// Session 35 曾把這件事估成「要另立術語表才做得起來」而擱置。實際清點後
// 發現當時是把三堆混在一起算：
//   《周易》爻辭原典 384 條、資料值字面量 148 條、專案自撰散文 57 條。
// 只有最後一堆是該翻的，前兩堆各有各的理由不翻。
//
// 自撰散文的數量一開始也數錯了（以為 28）——第一次只掃了單引號字串，
// 漏掉樣板字串，而「用神斷語」那份逐條理由正好全是樣板組出來的。
// 是英文版截圖看出那一整塊還是中文，才補回來的。
//
// 這份測試守的正是那條界線——翻該翻的，不動不該動的。

import { setLang, getLang, type Lang } from '../services/i18n';
import { localizeProse } from '../services/localize';
import { divinationProse } from '../data/translations/divination';
import { getMovingLineGuidance, hasVerifiedYaoText } from '../services/yaoReading';
import { useGodForCategory } from '../services/useGod';

const CJK = /[一-鿿]/;
/**
 * 譯文中允許保留漢字的命理術語。
 *
 * 這是一份**逐條登記**的清單，不是「凡是漢字都放行」。收錄標準只有一個：
 * 這個詞在六爻盤或斷語徽章上也以漢字印著，譯掉會讓兩處對不起來。
 * 新增條目前請先確認畫面上真的有同一個詞，否則就是漏翻在假裝成術語。
 */
const KEPT_TERMS = [
  // 六親與用神體系（納甲表逐列印著這些字）
  '妻財', '官鬼', '父母', '子孫', '兄弟', '世爻', '用神', '伏神', '世',
  // 體用與旺衰（體用徽章與旺衰列印著這些字）
  '體用比和', '用生體', '體剋用', '體生用', '用剋體', '體用', '體卦',
  '旺', '相', '休', '囚', '死',
  // 爻的狀態（斷語逐條理由裡的判語名）
  '空亡', '月破', '暗動', '回頭生', '回頭剋', '進神', '退神',
];

/**
 * 把允許保留的術語剔除後，看還剩下多少漢字。
 *
 * 先剔長詞再剔短詞：否則「世」會先把「世爻」拆成「爻」，
 * 「生」會把「回頭生」拆成「回頭」，殘留字看起來像漏翻其實不是。
 */
function stripKeptTerms(text: string): string {
  let out = text;
  for (const term of [...KEPT_TERMS].sort((a, b) => b.length - a.length)) {
    out = out.split(term).join('');
  }
  return out;
}

describe('命理散文翻譯', () => {
  const original: Lang = getLang();
  afterEach(() => setLang(original));

  test('每條散文都有 en 與 ja 兩種譯文', () => {
    const missing: string[] = [];
    for (const [key, locales] of Object.entries(divinationProse)) {
      if (!locales.en) missing.push(`${key}:en`);
      if (!locales.ja) missing.push(`${key}:ja`);
    }
    expect(missing).toEqual([]);
  });

  /** 反空轉：翻譯表被清空或路徑改掉時，上面那條會空過 */
  test('翻譯表涵蓋預期規模（守門測試的自我檢查）', () => {
    expect(Object.keys(divinationProse).length).toBeGreaterThanOrEqual(57);
  });

  test('zh-TW 回傳原文，不經翻譯表', () => {
    setLang('zh-TW');
    expect(localizeProse('yao.pos1.plain', '原文甲')).toBe('原文甲');
  });

  test('查無此鍵時降級回中文原文，不回空字串', () => {
    setLang('en');
    expect(localizeProse('does.not.exist', '原文乙')).toBe('原文乙');
  });

  /**
   * 英文譯文只允許出現「刻意保留」的術語漢字。
   *
   * 這條擋的是漏翻——若有人新增一條斷語卻只填了中文，或譯文裡殘留整句中文，
   * 剔掉術語後仍會有大量漢字，這裡就會紅。
   */
  test('en 譯文除保留術語外不得殘留中文', () => {
    const offenders: string[] = [];
    for (const [key, locales] of Object.entries(divinationProse)) {
      const rest = stripKeptTerms(locales.en ?? '');
      if (CJK.test(rest)) offenders.push(`${key}: ${rest}`);
    }
    expect(offenders).toEqual([]);
  });

  test('術語確實被保留而非意譯（抽樣：用神取法）', () => {
    setLang('en');
    const wealth = useGodForCategory('wealth');
    expect(wealth).not.toBeNull();
    // 盤面印的是「妻財」，斷語就必須也是「妻財」，否則兩者對不起來
    expect(wealth!.description).toContain('妻財');
    expect(wealth!.description).toContain('Wife-Wealth');   // 首見加註
    expect(wealth!.description).not.toMatch(/[一-鿿]{12,}/);  // 不是整句中文
  });

  test('資料值欄位不受語言影響（只有 description 會變）', () => {
    setLang('zh-TW');
    const zh = useGodForCategory('career')!;
    setLang('ja');
    const ja = useGodForCategory('career')!;

    // subject／favorable／taboo 會與盤面比對，翻了就對不上
    expect(ja.subject).toBe(zh.subject);
    expect(ja.favorable).toBe(zh.favorable);
    expect(ja.taboo).toBe(zh.taboo);
    // 但句子確實換了語言
    expect(ja.description).not.toBe(zh.description);
  });

  /** 迴歸：localized() 若就地改寫常數表，第一次呼叫就會把它汙染成當時的語言 */
  test('切回中文後仍拿得到中文原文（常數表未被汙染）', () => {
    setLang('en');
    const en = useGodForCategory('wealth')!.description;
    setLang('zh-TW');
    const zh = useGodForCategory('wealth')!.description;
    expect(zh).not.toBe(en);
    expect(zh).toContain('財運問事');
  });

  test('動爻指引隨語言切換（含體用補述）', () => {
    setLang('zh-TW');
    const zh = getMovingLineGuidance(1, 1, '吉');
    setLang('en');
    const en = getMovingLineGuidance(1, 1, '吉');

    expect(en.plainLanguage).not.toBe(zh.plainLanguage);
    expect(en.action).not.toBe(zh.action);
    expect(en.plainLanguage).toContain('first line');
    expect(en.plainLanguage).toContain('體用');   // 補述保留術語
  });

  /**
   * 《周易》爻辭一律不翻。
   *
   * 翻譯經文是另一種工作（Wilhelm、Legge、Lynn 各成一本書），不該由這個 App
   * 自己動手，更不該讓機器翻。這條確保日後沒有人「順手把它也翻了」。
   */
  test('爻辭原典在任何語言下都維持原文', () => {
    for (const lang of ['zh-TW', 'en', 'ja'] as Lang[]) {
      setLang(lang);
      const g = getMovingLineGuidance(1, 1, '吉');
      expect(`${lang}: ${g.classicalText}`).toBe(`${lang}: 初九：潛龍勿用。`);
    }
  });

  test('爻辭覆蓋率不因翻譯改動而流失', () => {
    // 64 卦 × 6 爻全部已校對；翻譯層不該碰到這份資料
    let missing = 0;
    for (let poemId = 1; poemId <= 64; poemId++) {
      for (let line = 1; line <= 6; line++) {
        if (!hasVerifiedYaoText(poemId, line)) missing++;
      }
    }
    expect(missing).toBe(0);
  });
});
