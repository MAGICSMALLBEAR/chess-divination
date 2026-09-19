// 守門：文案裡寫死的數字，要對得上真相來源
//
// S51 的教訓寫的是「數量寫死在文案裡的地方要有真相來源」，當時只把它套在
// 引導頁的模式段落數上（段落數 = `DivinationMode` 的成員數）。其餘寫死的
// 數字沒人管：64 首籤詩、125 卦目、32 顆棋子、14 天占驗提醒，四個數字散在
// 三種語言的十來條字串裡，全靠人記得同步。
//
// 這種缺陷不會壞畫面也不會紅測試——資料多了一首籤詩，文案照樣寫 64，
// 它只是**開始說謊**。而且是最難發現的那種：讀起來完全通順。
//
// 觸發本檔的是一條當時就已經在說謊的文案：首頁「快速抽一籤」的副標寫
// 「直接抽取 2 顆棋子獲得指引」，但那顆按鈕只是進到抽棋頁（面向與棋數都
// 還要自己選），而且顆數是使用者設定的——設 3 顆的人，抽棋頁把 3 標成
// 「建議」，首頁卻告訴他會抽 2 顆。

import { translations, type Lang } from '../services/i18n';
import { ACHIEVEMENTS, ACHIEVEMENT_THRESHOLDS } from '../services/achievements';
import { achievementTranslations } from '../data/translations/achievements';
import { ALL_POEMS, POEM_LEVELS } from '../data/poems';
import { ALL_PIECES } from '../data/pieces';
import { LINGQI_ORACLES } from '../data/lingqiOracles';
import { VERIFY_REMINDER_DAYS, VERIFY_REMINDER_CHOICES } from '../services/verification';

const LANGS: Lang[] = ['zh-TW', 'en', 'ja'];

/**
 * 每一條規則是「量詞的寫法 → 該等於哪個真相來源」。
 *
 * 為什麼逐語言列出量詞而不用一條通吃的 `(\d+)卦`：日文的
 * 「易経64卦」講的是《易經》有 64 卦（外部事實，跟我們有幾首籤詩無關），
 * 而「125卦」講的是我們收了幾個靈棋卦目。同一個字，兩種意思，
 * 混用一條正則會把外部事實也拖進來一起紅。
 */
const RULES: { what: string; truth: number; patterns: Partial<Record<Lang, RegExp[]>> }[] = [
  {
    what: '籤詩首數',
    truth: ALL_POEMS.length,
    patterns: {
      'zh-TW': [/(\d+)\s*首/g],
      en: [/(\d+)\s+(?:Original\s+)?[Pp]oems/g],
      ja: [/(\d+)首/g],
    },
  },
  {
    what: '靈棋卦目數',
    truth: LINGQI_ORACLES.length,
    patterns: {
      'zh-TW': [/(\d+)\s*卦目/g],
      en: [/(\d+)\s+oracles/g],
      // ja 的「125卦を見る」沒有「卦目」二字，只能連著助詞比對，
      // 否則會誤中「易経64卦」
      ja: [/(\d+)卦を/g],
    },
  },
  {
    // 只認「棋子池有幾顆」的講法（從 N 顆棋子中／from N pieces／N の駒から），
    // 不認「這次抽幾顆」——後者是使用者選的，寫成 1／2／3 都是對的。
    // 一條寬的 `(\d+)\s*顆棋子` 會把「抽 3 顆棋子」也判成錯，而會亂叫的
    // 守門遲早被關掉。
    what: '棋子池顆數',
    truth: ALL_PIECES.length,
    patterns: {
      'zh-TW': [/從\s*(\d+)\s*顆棋子/g],
      en: [/from (\d+) pieces/gi],
      ja: [/(\d+)の駒から/g],
    },
  },
];

describe('文案裡的數字對得上真相來源', () => {
  /** 掃到的每一處：哪個鍵、哪個語言、寫了幾 */
  function scan(rule: typeof RULES[number]) {
    const hits: { key: string; lang: Lang; got: number }[] = [];
    for (const [key, entry] of Object.entries(translations)) {
      for (const lang of LANGS) {
        for (const pattern of rule.patterns[lang] ?? []) {
          for (const m of (entry[lang] ?? '').matchAll(pattern)) {
            hits.push({ key, lang, got: Number(m[1]) });
          }
        }
      }
    }
    return hits;
  }

  test.each(RULES.map(r => [r.what, r] as const))('%s', (_what, rule) => {
    const hits = scan(rule);
    // 反空轉：正則失效或文案被改寫成別的講法時要紅，而不是零個命中全過
    expect(hits.length).toBeGreaterThan(0);
    // 列成清單而非逐條斷言：紅的時候要一眼看出「哪幾條文案、哪個語言、
    // 寫了幾」，逐條 expect 只會停在第一個
    const wrong = hits
      .filter(h => h.got !== rule.truth)
      .map(h => `${h.key}（${h.lang}）寫 ${h.got}，真相來源是 ${rule.truth}`);
    expect(wrong).toEqual([]);
  });

  /** 三種語言都要掃得到，否則「只有中文被守住」而 en/ja 靜靜過期 */
  test.each(RULES.map(r => [r.what, r] as const))('%s：三種語言都掃得到', (_what, rule) => {
    const langs = new Set(scan(rule).map(h => h.lang));
    expect([...langs].sort()).toEqual(['en', 'ja', 'zh-TW']);
  });
});

/**
 * 占驗提醒的天數。
 *
 * 這條規則原本是 RULES 裡的一列：文案寫「已過 14 天」，要等於 `VERIFY_REMINDER_DAYS`。
 * S74 把天數開放給使用者選（7／14／30 或關閉），**那句文案就不可能再寫死任何數字**——
 * 寫 14 的人選 7 天時，通知會說「已過 14 天」，而那是謊話。所以守門的判準換了：
 * 不是「數字對不對得上真相來源」，而是「這幾句話不准帶字面天數，一律用 {days}」。
 *
 * 天數搬進 `{days}` 參數的當下，舊規則的正則變成零命中、反空轉檢查紅了——這是
 * 它該有的反應：字面量搬走了，守門必須換一種守法，而不是被靜靜刪掉或放寬到過。
 */
describe('天數可調的文案不寫死數字', () => {
  /** 會出現在使用者面前、且天數由設定決定的文案鍵 */
  const DAYS_KEYS = ['notify.verifyBody', 'stats.pending'];

  test.each(DAYS_KEYS)('%s：三語都帶 {days}，且沒有字面天數或「兩週」這類換個說法的寫死', key => {
    const entry = translations[key];
    expect(entry).toBeDefined();
    for (const lang of LANGS) {
      const text = entry[lang] ?? '';
      expect({ key, lang, hasPlaceholder: text.includes('{days}') })
        .toEqual({ key, lang, hasPlaceholder: true });
      // 字面天數：數字緊接著天／日／days，或講成兩週／two weeks／2週間
      expect({ key, lang, hardcoded: /\d+\s*(?:天|日|days?)/.test(text.replace(/\{days\}/g, '')) })
        .toEqual({ key, lang, hardcoded: false });
      expect({ key, lang, weeks: /兩週|two weeks|2週間|二週/i.test(text) })
        .toEqual({ key, lang, weeks: false });
    }
  });

  test('反空轉：{n}、{days} 之外的數字寫法確實抓得到（正則不是永遠為假）', () => {
    const hard = (s: string) => /\d+\s*(?:天|日|days?)/.test(s.replace(/\{days\}/g, ''));
    expect(hard('已過 14 天')).toBe(true);
    expect(hard('from 7 days ago')).toBe(true);
    expect(hard('14日経ちました')).toBe(true);
    expect(hard('已過 {days} 天')).toBe(false);
  });

  test('預設天數是可選項之一（否則沒設定的人畫面上沒有亮著的那一顆）', () => {
    expect(VERIFY_REMINDER_CHOICES as readonly number[]).toContain(VERIFY_REMINDER_DAYS);
  });
});

/**
 * 成就說明裡的數字，要等於它真正的解鎖門檻。
 *
 * 這是同一個問題最密集的地方：四個門檻各被寫了三遍——中文說明在
 * `achievements.ts` 的清單裡，en 與 ja 在 `data/translations/achievements.ts`
 * ——十二份重複，而門檻在此之前只是條件式裡的字面量，沒有一份是真相來源。
 *
 * 這種漂移的後果特別難查：說明寫「累積 10 次占卜」，門檻卻被改成 12，
 * 使用者做到第 10 次沒解開，只會覺得成就系統壞了——**而且他是對的**，
 * 只是壞的不是解鎖邏輯，是那句話。
 */
describe('成就說明的數字等於解鎖門檻', () => {
  const zhDesc = (id: string) => ACHIEVEMENTS.find(a => a.id === id)?.desc ?? '';

  const ids = Object.keys(ACHIEVEMENT_THRESHOLDS) as (keyof typeof ACHIEVEMENT_THRESHOLDS)[];

  /** 反空轉：門檻表被清空或改名時要紅，而不是零圈迴圈全過 */
  test('門檻表涵蓋所有說明裡寫了數字的成就', () => {
    expect(ids.length).toBeGreaterThan(0);
    // 反過來查：清單裡任何「說明帶數字」的成就都必須在門檻表裡，
    // 否則新增一個「累積 100 次」的成就時，這份守門不會跟著長大
    const withNumber = ACHIEVEMENTS
      .filter(a => /\d/.test(a.desc))
      .map(a => a.id)
      // all_levels 的 5 來自 POEM_LEVELS.length，由下面那條單獨守
      .filter(id => id !== 'all_levels');
    expect(withNumber.sort()).toEqual([...ids].sort());
  });

  test.each(ids)('%s', id => {
    const n = ACHIEVEMENT_THRESHOLDS[id];
    const wrong: string[] = [];

    if (!new RegExp(`\\b${n}\\b`).test(zhDesc(id))) {
      wrong.push(`zh-TW 說明「${zhDesc(id)}」沒有寫著門檻 ${n}`);
    }
    for (const lang of ['en', 'ja'] as const) {
      const desc = achievementTranslations[id]?.[lang]?.desc ?? '';
      expect(desc).not.toBe('');   // 漏翻譯是另一支守門的事，這裡只是不要靜靜跳過
      if (!new RegExp(`${n}`).test(desc)) {
        wrong.push(`${lang} 說明「${desc}」沒有寫著門檻 ${n}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /** `all_levels` 的 5 有現成的真相來源，直接對它 */
  test('all_levels 的等級數等於 POEM_LEVELS', () => {
    const n = POEM_LEVELS.length;
    expect(zhDesc('all_levels')).toContain(String(n));
    for (const lang of ['en', 'ja'] as const) {
      expect(achievementTranslations['all_levels']?.[lang]?.desc).toContain(String(n));
    }
  });
});

/**
 * 錯誤訊息不該把使用者指向他動不了、而且與病因無關的東西。
 *
 * `settings.syncUnset` 是 501 的說明（伺服器端沒接上資料庫），舊文案卻叫
 * 使用者去設 `EXPO_PUBLIC_CLOUD_SYNC_URL`——那是另一個旋鈕，而且是選用的
 * （web 走同源相對路徑、原生有絕對網址預設）。照著做不會好，而且使用者
 * 根本設不了環境變數。
 *
 * 這條守的是那個判準：**使用者看得到的錯誤訊息裡不出現環境變數名稱。**
 */
describe('錯誤訊息不指向使用者動不了的旋鈕', () => {
  const userFacing = Object.entries(translations)
    .filter(([key]) => !key.startsWith('dev.'));

  test('沒有任何訊息把環境變數名稱寫給使用者看', () => {
    const offenders: string[] = [];
    for (const [key, entry] of userFacing) {
      for (const lang of LANGS) {
        const text = entry[lang] ?? '';
        // 環境變數的慣用長相：連續大寫底線字，且至少兩段
        if (/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}\b/.test(text)) {
          offenders.push(`${key}（${lang}）：${text}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  /** 反空轉：正則要真的抓得到這種字，否則上面那條永遠是綠的 */
  test('這條規則抓得到環境變數的長相', () => {
    expect(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}\b/.test('請設定 EXPO_PUBLIC_CLOUD_SYNC_URL 環境變數')).toBe(true);
    expect(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}\b/.test('雲端同步尚未啟用')).toBe(false);
  });
});

/**
 * 迴歸：首頁「快速抽一籤」的副標曾寫死顆數（「直接抽取 2 顆棋子獲得指引」）。
 *
 * 這個數字不像上面那些有真相來源可對——它**根本不該存在**：預設抽棋數量
 * 是使用者自己設的（1／2／3），抽棋頁會把他設的那顆標成「建議」，
 * 首頁再寫死一個數字，兩處必然對不上。連帶地，那句話也宣稱按下去會「直接
 * 抽取」，而它其實只是進到抽棋頁。
 */
describe('首頁快速抽棋的副標', () => {
  const desc = translations['home.quickDrawDesc'];

  test('不寫死顆數——顆數是使用者設定的', () => {
    for (const lang of LANGS) {
      expect(desc[lang]).not.toMatch(/[0-9１２３一二三]\s*(顆|pieces?|つの駒|枚)/);
    }
  });

  test('不宣稱按下去就直接抽——它只是進到抽棋頁', () => {
    expect(desc['zh-TW']).not.toContain('直接抽取');
    expect(desc.en.toLowerCase()).not.toContain('instant');
  });
});
