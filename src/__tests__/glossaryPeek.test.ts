// 結果頁長按術語速查（P4）：盤面每一塊登記的詞條 key 都要真的存在於詞典。
//
// glossaryEntriesFor 會靜靜丟掉不認得的 key（寫錯一個 key 不該讓速查表打不開），
// 所以寫錯要靠這裡抓：掃 LiuYaoPanel 原始碼裡所有以單引號寫出的詞條 key。
import * as fs from 'fs';
import * as path from 'path';
import { GLOSSARY } from '../data/glossary';
import { glossaryEntriesFor, glossaryKeyForRelative } from '../services/glossary';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const KEYS = new Set(GLOSSARY.map(e => e.key));

/** `terms={[...]}` 與 rowTerms 的回傳陣列裡出現的字串字面量 */
function termKeysIn(source: string): string[] {
  const keys: string[] = [];
  for (const m of source.matchAll(/terms=\{\[([^\]]*)\]\}/g)) {
    for (const k of m[1].matchAll(/'([^']+)'/g)) keys.push(k[1]);
  }
  const rowFn = source.match(/function rowTerms[\s\S]*?\n  \}/);
  if (rowFn) for (const k of rowFn[0].matchAll(/'([A-Za-z]+)'/g)) keys.push(k[1]);
  return keys;
}

describe('長按術語速查', () => {
  const panel = read('components/LiuYaoPanel.tsx');
  const keys = termKeysIn(panel);

  test('掃得到東西（反空轉）：盤面至少登記了十塊', () => {
    expect((panel.match(/<GlossaryTerm\b/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(keys.length).toBeGreaterThanOrEqual(20);
  });

  test('盤面登記的每個 key 都是詞典裡的詞條', () => {
    expect(keys.filter(k => !KEYS.has(k))).toEqual([]);
  });

  test('五個六親都對得到詞條（納甲盤每一爻依它列出六親）', () => {
    for (const relative of ['父母', '兄弟', '子孫', '妻財', '官鬼']) {
      expect(glossaryKeyForRelative(relative)).toBeDefined();
    }
    expect(glossaryKeyForRelative('世爻')).toBeUndefined();
  });


  test('glossaryEntriesFor 依給定順序、去重、丟掉不認得的', () => {
    expect(glossaryEntriesFor(['void', 'primary', 'void', 'no-such-key']).map(e => e.key))
      .toEqual(['void', 'primary']);
  });

  test('報告長圖不掛 Provider：長按速查只屬於互動的結果頁', () => {
    expect(read('components/ReportCardView.tsx')).not.toMatch(/GlossaryPeekProvider/);
    expect(read('app/reveal.tsx')).toMatch(/<GlossaryPeekProvider>/);
  });
});
