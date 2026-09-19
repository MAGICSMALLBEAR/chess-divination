// 術語詞典的守門測試
//
// 詞典的價值在第二段——「本 App 怎麼取、怎麼用」。那一段寫的是程式行為，
// 程式一改、詞典沒跟著改，使用者會拿一份過期的說明去讀一張新規則算出來的盤，
// 且不會有任何畫面壞掉、任何測試變紅。所以這裡的斷言不是「有沒有寫」，
// 而是把詞典裡能枚舉的事實一條條對回它們的真相來源。
//
// 刻意不做的：詞典裡不寫加減幾分（那些常數在 wenwang.ts），所以也沒有分數要對。
// 「沒有寫數字」本身有一條守門，理由見該條。

import fs from 'fs';
import path from 'path';
import { GLOSSARY, GLOSSARY_GROUPS, type GlossaryEntry } from '@/data/glossary';
import { glossaryMatchesSearch, searchGlossary } from '@/services/glossary';
import { categoryLabel, type Lang } from '@/services/i18n';
import { useGodForCategory, type DivinerGender } from '@/services/useGod';
import { transformedLineRelation } from '@/services/najja';
import { advanceOrRetreat, TRIADS } from '@/services/conditions';
import { strengthState } from '@/services/liuyao';
import { seasonOf, SEASON_ELEMENT } from '@/services/date';
import { EARTHLY_BRANCHES, SIX_SPIRITS, branchesClash } from '@/services/sexagenary';

const LANGS: Lang[] = ['zh-TW', 'en', 'ja'];
const SRC = path.join(__dirname, '..');

function entry(key: string): GlossaryEntry {
  const found = GLOSSARY.find(e => e.key === key);
  if (!found) throw new Error(`詞典裡沒有 key=${key}`);
  return found;
}

describe('詞典資料完整性', () => {
  it('條目數量有下限（守門本身不能空轉）', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30);
  });

  it('key 不重複、term 不重複', () => {
    const keys = GLOSSARY.map(e => e.key);
    const terms = GLOSSARY.map(e => e.term);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('三種語言的兩段說明與英文對照都不是空的', () => {
    for (const e of GLOSSARY) {
      expect(e.term.trim()).not.toBe('');
      expect(e.gloss.trim()).not.toBe('');
      for (const lang of LANGS) {
        expect(e.plain[lang].trim()).not.toBe('');
        expect(e.inApp[lang].trim()).not.toBe('');
      }
    }
  });

  it('en／ja 不是照抄中文（漏翻時貼原文是最容易發生的偷懶）', () => {
    for (const e of GLOSSARY) {
      for (const lang of ['en', 'ja'] as const) {
        expect(e.plain[lang]).not.toBe(e.plain['zh-TW']);
        expect(e.inApp[lang]).not.toBe(e.inApp['zh-TW']);
      }
      // en 的說明必須真的是英文句子，不只是幾個漢字術語
      expect(e.plain.en).toMatch(/[A-Za-z]{4,}/);
      expect(e.inApp.en).toMatch(/[A-Za-z]{4,}/);
    }
  });

  it('每個分組都有條目，每個條目都屬於已登記的分組', () => {
    for (const group of GLOSSARY_GROUPS) {
      expect(GLOSSARY.some(e => e.group === group)).toBe(true);
    }
    for (const e of GLOSSARY) {
      expect(GLOSSARY_GROUPS).toContain(e.group);
    }
  });

  it('說明裡不寫加減幾分——那是 wenwang.ts 的常數，詞典裡再抄一份就是第二個真相來源', () => {
    for (const e of GLOSSARY) {
      expect(e.plain['zh-TW'] + e.inApp['zh-TW']).not.toMatch(/\d\s*分/);
      expect(e.plain.en + e.inApp.en).not.toMatch(/\d+\s*points?/i);
    }
  });
});

describe('詞典收的都是盤面上真的印出來的詞', () => {
  /** 去掉註解後的原始碼——註解裡討論一個詞，不等於使用者看得到那個詞 */
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  }

  function collect(dir: string, acc: string[] = []): string[] {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== '__tests__') collect(full, acc);
      } else if (/\.tsx?$/.test(item.name)) {
        acc.push(full);
      }
    }
    return acc;
  }

  // 詞典自己（資料、搜尋、頁面）不算證據，否則每個詞都會「找得到」
  const SELF = new Set([
    path.join(SRC, 'data', 'glossary.ts'),
    path.join(SRC, 'services', 'glossary.ts'),
    path.join(SRC, 'app', 'glossary.tsx'),
  ]);
  const files = collect(SRC).filter(f => !SELF.has(f));
  const corpus = files.map(f => stripComments(fs.readFileSync(f, 'utf-8'))).join('\n');

  it('掃到的檔案數有下限（掃不到東西就會全部誤判為通過或全部失敗）', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(corpus.length).toBeGreaterThan(100_000);
  });

  it('每個詞（「／」逐段；或條目自己登記的 printedAs）都出現在詞典以外的原始碼字串裡', () => {
    const missing: string[] = [];
    for (const e of GLOSSARY) {
      for (const part of e.printedAs ?? e.term.split('／')) {
        if (!corpus.includes(part)) missing.push(`${e.key}: ${part}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('printedAs 只給名稱與盤面印字對不上的條目用，不是免檢通行證', () => {
    // 登記了 printedAs 的條目，term 逐段本來就找得到的話，登記就是多餘的
    // （多餘的登記日後會過期，卻不會有人發現）
    const redundant = GLOSSARY
      .filter(e => e.printedAs && e.term.split('／').every(part => corpus.includes(part)))
      .map(e => e.key);
    expect(redundant).toEqual([]);
  });
});

describe('詞典對回真相來源', () => {
  it('六親五個都有自己的條目', () => {
    for (const relative of ['兄弟', '子孫', '妻財', '官鬼', '父母']) {
      expect(GLOSSARY.some(e => e.term === relative && e.group === 'relative')).toBe(true);
    }
  });

  it('六神條目列出的六位就是 SIX_SPIRITS', () => {
    const text = entry('sixSpirits').plain['zh-TW'];
    for (const spirit of SIX_SPIRITS) expect(text).toContain(spirit);
  });

  it('旺相休囚死：條目的範例（春天木當令）與 strengthState 一致，五態都提到', () => {
    const text = entry('strength').plain['zh-TW'];
    for (const state of ['旺', '相', '休', '囚', '死']) expect(text).toContain(state);
    const example: [string, string][] = [['木', '旺'], ['火', '相'], ['水', '休'], ['金', '囚'], ['土', '死']];
    for (const [element, state] of example) {
      expect(strengthState(element, '木')).toBe(state);
      expect(text).toContain(`${element}${state}`);
    }
  });

  it('當令：條目寫的「哪幾個月建屬哪個五行」與 seasonOf／SEASON_ELEMENT 一致', () => {
    const text = entry('ruling').plain['zh-TW'];
    const found = [...text.matchAll(/([子丑寅卯辰巳午未申酉戌亥]+)月[^；。]*?([金木水火土])當令/g)];
    const covered = new Set<string>();
    for (const [, branches, element] of found) {
      for (const branch of branches) {
        const number = EARTHLY_BRANCHES.indexOf(branch) + 1;
        expect(SEASON_ELEMENT[seasonOf(number)]).toBe(element);
        covered.add(branch);
      }
    }
    // 十二個月建一個都不能漏
    expect(covered.size).toBe(12);
  });

  it('相沖：條目列的六對就是 branchesClash 為真的全部組合', () => {
    const text = entry('clash').plain['zh-TW'];
    const listed = [...text.matchAll(/([子丑寅卯辰巳午未申酉戌亥])([子丑寅卯辰巳午未申酉戌亥])(?=[、。])/g)]
      .map(m => [m[1], m[2]] as const);
    // 兩支順序不拘，正規化成排序後的字串再比
    const norm = (a: string, b: string) => [a, b].sort().join('');
    const actual = new Set<string>();
    for (const a of EARTHLY_BRANCHES) {
      for (const b of EARTHLY_BRANCHES) {
        if (branchesClash(a, b)) actual.add(norm(a, b));
      }
    }
    expect(actual.size).toBe(6);
    expect(listed).toHaveLength(6);
    expect(new Set(listed.map(([a, b]) => norm(a, b)))).toEqual(actual);
  });

  it('動爻化變：五種生剋方向的名稱，與 transformedLineRelation 能產出的全部結果一致', () => {
    const elements = ['金', '木', '水', '火', '土'];
    const produced = new Set<string>();
    for (const a of elements) for (const b of elements) produced.add(transformedLineRelation(a, b));
    expect(produced.size).toBe(5);
    const text = entry('transform').plain['zh-TW'];
    for (const name of produced) expect(text).toContain(name);
  });

  it('進神／退神：條目列的進行方向，就是 advanceOrRetreat 判為進神的全部組合', () => {
    const text = entry('advanceRetreat').plain['zh-TW'];
    // 取「順著…」到「為進神」之間那段，切成一條條「甲→乙→丙」的鏈
    const chainText = text.match(/順著(.+?)的方向/)?.[1] ?? '';
    const listed = new Set<string>();
    for (const chain of chainText.split('、')) {
      const steps = chain.split('→');
      for (let i = 0; i + 1 < steps.length; i++) listed.add(steps[i] + steps[i + 1]);
    }
    const actual = new Set<string>();
    for (const a of EARTHLY_BRANCHES) {
      for (const b of EARTHLY_BRANCHES) {
        if (advanceOrRetreat(a, b) === '進神') actual.add(a + b);
      }
    }
    expect(actual.size).toBe(8);
    expect([...listed].sort()).toEqual([...actual].sort());
  });

  it('三合局：四組名稱與五行，與 TRIADS 一致', () => {
    const text = entry('triad').plain['zh-TW'];
    for (const triad of TRIADS) expect(text).toContain(`${triad.name}合${triad.element}`);
  });

  /**
   * 六親條目的「在本 App」段落列出它在哪些問事類別擔任什麼角色。
   * 這是最容易過期的一段——useGod.ts 增一個類別、換一個喜忌，詞典不會有任何反應。
   * 這裡從 useGodForCategory 反推「每個六親在哪些類別出現過」，
   * 正反兩向都比：該提的類別要提到，不相干的類別不能被提到。
   */
  describe('六親條目的問事類別對回 useGod', () => {
    const DOMAINS = ['wealth', 'career', 'study', 'health', 'travel', 'lawsuit', 'lostItem', 'marriage'] as const;
    // 標籤取第一段：官司的顯示名是「官司／訴訟」，條目裡寫的是「官司」
    const labelOf = (domain: string) => categoryLabel(domain).split('／')[0];

    const roles = new Map<string, Set<string>>();
    const note = (relative: string | undefined, domain: string) => {
      if (!relative || relative === '世爻') return;
      if (!roles.has(relative)) roles.set(relative, new Set());
      roles.get(relative)!.add(domain);
    };
    for (const domain of DOMAINS) {
      const genders: (DivinerGender | undefined)[] = domain === 'marriage' ? ['male', 'female'] : [undefined];
      for (const gender of genders) {
        const candidate = useGodForCategory(domain, { gender });
        expect(candidate).not.toBeNull();
        note(candidate!.subject, domain);
        note(candidate!.favorable, domain);
        note(candidate!.taboo, domain);
      }
    }

    it('反推出來的角色表有東西（守門本身不能空轉）', () => {
      expect(roles.size).toBe(5);
    });

    for (const relative of ['兄弟', '子孫', '妻財', '官鬼', '父母']) {
      it(`${relative}：提到的類別，正好是它在 useGod 裡出現過的類別`, () => {
        const text = GLOSSARY.find(e => e.term === relative)!.inApp['zh-TW'];
        const involved = roles.get(relative) ?? new Set<string>();
        for (const domain of DOMAINS) {
          const label = labelOf(domain);
          if (involved.has(domain)) {
            expect({ relative, label, mentioned: text.includes(label) }).toEqual({ relative, label, mentioned: true });
          } else {
            expect({ relative, label, mentioned: text.includes(label) }).toEqual({ relative, label, mentioned: false });
          }
        }
      });
    }
  });
});

describe('searchGlossary', () => {
  it('空字串：全部條目，依 GLOSSARY_GROUPS 的順序分組', () => {
    const sections = searchGlossary('', 'zh-TW');
    expect(sections.map(s => s.group)).toEqual([...GLOSSARY_GROUPS]);
    expect(sections.reduce((n, s) => n + s.entries.length, 0)).toBe(GLOSSARY.length);
  });

  it('查漢字術語命中該條，且沒有命中的分組不出現', () => {
    const sections = searchGlossary('月破', 'zh-TW');
    const keys = sections.flatMap(s => s.entries.map(e => e.key));
    expect(keys).toContain('monthBroken');
    expect(sections.every(s => s.entries.length > 0)).toBe(true);
    expect(sections.length).toBeLessThan(GLOSSARY_GROUPS.length);
  });

  it('en 介面下用英文對照與英文說明都搜得到', () => {
    const byGloss = searchGlossary('use-god', 'en').flatMap(s => s.entries.map(e => e.key));
    expect(byGloss).toContain('useGod');
    const byBody = searchGlossary('generation', 'en').flatMap(s => s.entries.map(e => e.key));
    expect(byBody).toContain('palace');
  });

  it('en 介面下輸入漢字術語仍然搜得到（使用者是從盤面上抄下那個字來查的）', () => {
    const keys = searchGlossary('世爻', 'en').flatMap(s => s.entries.map(e => e.key));
    expect(keys).toContain('worldResponding');
  });

  it('切到 en 後，中文說明裡才有的句子仍可命中（原文與譯文兩邊都比）', () => {
    // 這句只在 zh-TW 的說明裡：en／ja 的 plain 與 inApp 都沒有這串漢字
    const e = entry('sixSpirits');
    expect(glossaryMatchesSearch(e, '不計入用神斷語的分數', 'en')).toBe(true);
  });

  it('大小寫不敏感，前後空白不影響', () => {
    const keys = searchGlossary('  USE-GOD  ', 'en').flatMap(s => s.entries.map(e => e.key));
    expect(keys).toContain('useGod');
  });

  it('查無結果回傳空陣列', () => {
    expect(searchGlossary('這個詞不存在zzzz', 'zh-TW')).toEqual([]);
  });
});

describe('入口接線', () => {
  const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf-8');

  it('設定頁工具區、揭曉頁盤面下方都通往 /glossary', () => {
    expect(read('app', '(tabs)', 'settings.tsx')).toContain("router.push('/glossary')");
    expect(read('app', 'reveal.tsx')).toContain("router.push('/glossary')");
  });

  it('根 Stack 有註冊 glossary 這一頁', () => {
    expect(read('app', '_layout.tsx')).toMatch(/name="glossary"/);
  });

  it('入口不放在 LiuYaoPanel 裡——它同時被離屏的報告截圖使用，連結會連累匯出的長圖', () => {
    expect(read('components', 'LiuYaoPanel.tsx')).not.toContain('glossary');
  });
});
