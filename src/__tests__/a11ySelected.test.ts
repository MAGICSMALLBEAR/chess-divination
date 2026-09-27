// 守門：畫面上「亮起來的那一顆」，讀屏也要聽得出它被選中
//
// S74 記下：`accessibilityState={{ selected }}` 在 react-native-web 不輸出
// aria-selected——網頁讀屏分不出設定頁的天數、抽棋頁的顆數、圖鑑的篩選選了哪一個。
// 當時只在新元件改用 `aria-selected`，舊的六個檔案一直留著；另有八組選項
// （排序、性別、主題、語言、圖鑑篩選、統計期間、類別圖示）連 accessibilityState
// 都沒有，選中與否只靠邊框顏色。
//
// RN 原生端同樣認得 `aria-selected`（等同 accessibilityState.selected），所以一律
// 改寫成它，兩條規則：
//   1. `accessibilityState` 裡不准再寫 `selected`（在網頁上是啞的）
//   2. 可按元件的 style 若依條件換邊框色或底色（「選中時亮起來」），就要有
//      `aria-selected`（切換鈕則是 `aria-pressed`）——視覺上看得出選了哪個，
//      讀屏也要聽得出來

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      collect(full, acc);
    } else if (entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

/** 去掉註解：說明文字裡會提到 accessibilityState（本檔開頭就是例子） */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

const PRESSABLE = /<(TouchableOpacity|Pressable|TouchableHighlight)\b/g;

/** 從 `<Tag` 起算，取到深度 0 的 `>` 為止——屬性裡的 `{ ... > ... }` 不算結尾 */
export function openingTags(source: string): string[] {
  const tags: string[] = [];
  for (const match of source.matchAll(PRESSABLE)) {
    let depth = 0;
    let i = match.index! + match[0].length;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0 && source[i - 1] !== '=') break;
    }
    tags.push(source.slice(match.index!, i + 1));
  }
  return tags;
}

/** style 裡有「條件成立才換邊框色／底色」的寫法 */
function highlightsWhenSelected(tag: string): boolean {
  const style = tag.match(/style=\{([\s\S]*)/)?.[1] ?? '';
  return /&&\s*\{[^}]*\b(borderColor|backgroundColor)\s*:/.test(style);
}

const FILES = collect(path.join(SRC, 'app'))
  .concat(collect(path.join(SRC, 'components')))
  .map(file => ({
    name: path.relative(SRC, file).replace(/\\/g, '/'),
    src: stripComments(fs.readFileSync(file, 'utf-8')),
  }));

describe('選中狀態要讀得出來', () => {
  it('掃描有東西可掃（反空轉）', () => {
    expect(FILES.length).toBeGreaterThan(40);
    const highlighted = FILES.flatMap(f => openingTags(f.src)).filter(highlightsWhenSelected);
    expect(highlighted.length).toBeGreaterThanOrEqual(20);
  });

  it('accessibilityState 裡沒有 selected（網頁上不輸出 aria-selected）', () => {
    const offenders = FILES
      .filter(f => /accessibilityState=\{\{[^}]*\bselected\b/.test(f.src))
      .map(f => f.name);
    expect(offenders).toEqual([]);
  });

  it('依條件亮起來的可按元件都帶 aria-selected', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      for (const tag of openingTags(f.src)) {
        // 切換鈕（按一次進入某種模式）用 aria-pressed，選項用 aria-selected
        if (highlightsWhenSelected(tag) && !/\baria-(selected|pressed)=/.test(tag)) {
          offenders.push(`${f.name}: ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('標籤切割認得屬性裡的箭頭函式與比較式', () => {
    const tag = openingTags('<Pressable onPress={() => go(a > b)} aria-selected={x}><Text/></Pressable>')[0];
    expect(tag).toBe('<Pressable onPress={() => go(a > b)} aria-selected={x}>');
  });
});
