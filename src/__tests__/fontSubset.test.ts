// 原生端字型子集的守門測試
//
// assets/fonts/NotoSerifTC-400.ttf 是 scripts/subset-font.py 從 Noto Serif TC
// （＋JP 補新字體漢字）子集出來的，收錄規則與本測試一致：
// src 全部非 ASCII 字元，但**不含 __tests__**——測試檔從不渲染，
// 裡面的正規式範圍界標（如 [一-鿿]）不需要字形。
//
// 若新增的字串用到子集沒有的字元，本測試會紅，重跑子集腳本即可：
//   python scripts/subset-font.py

import fs from 'fs';
import path from 'path';

const FONTS_DIR = path.resolve(__dirname, '../../assets/fonts');
const SRC_DIR = path.resolve(__dirname, '..');

// 這些區段的字元不允許落在排除清單——漢字、假名、全形標點本來就該有字形
const MUST_COVER: [number, number][] = [
  [0x2e80, 0x2fff], // CJK 部首
  [0x3000, 0x303f], // CJK 標點
  [0x3040, 0x30ff], // 平假名／片假名
  [0x31f0, 0x31ff], // 片假名語音擴展
  [0x3400, 0x4dbf], // CJK 擴展 A
  [0x4e00, 0x9fff], // CJK 統一表意
  [0xff00, 0xffef], // 全形
];

function collectSrcChars(): Set<string> {
  const chars = new Set<string>();
  for (const entry of fs.readdirSync(SRC_DIR, { recursive: true }) as string[]) {
    if (entry.includes(`${path.sep}__tests__${path.sep}`) || entry.includes(`__tests__${path.sep}`)) continue;
    if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;
    const text = fs.readFileSync(path.join(SRC_DIR, entry), 'utf-8');
    for (const ch of text) {
      if (ch.charCodeAt(0) > 0x7f) chars.add(ch);
    }
  }
  return chars;
}

describe('原生端字型子集守門', () => {
  test('子集字型檔存在且大小合理（非空、非完整字型）', () => {
    const ttf = path.join(FONTS_DIR, 'NotoSerifTC-400.ttf');
    expect(fs.existsSync(ttf)).toBe(true);
    const kb = fs.statSync(ttf).size / 1024;
    expect(kb).toBeGreaterThan(100);   // 空檔或漏字檔不可能這麼小
    expect(kb).toBeLessThan(5000);     // 完整字型約 9.5MB，此處應為子集
  });

  test('src 每個非 ASCII 字元都落在「子集收錄」或「排除清單」其一', () => {
    const manifest = fs.readFileSync(
      path.join(FONTS_DIR, 'NotoSerifTC-subset-chars.txt'), 'utf-8');
    const excluded = fs.readFileSync(
      path.join(FONTS_DIR, 'NotoSerifTC-excluded-chars.txt'), 'utf-8');
    const accounted = new Set([...manifest, ...excluded]);

    const missing = [...collectSrcChars()].filter(ch => !accounted.has(ch));
    expect(missing).toEqual([]);
  });

  test('排除清單只允許符號與 emoji，漢字／假名／全形標點不得缺席', () => {
    const excluded = fs.readFileSync(
      path.join(FONTS_DIR, 'NotoSerifTC-excluded-chars.txt'), 'utf-8');

    const mustCoverMissing = [...excluded].filter(ch => {
      const cp = ch.charCodeAt(0);
      return MUST_COVER.some(([lo, hi]) => cp >= lo && cp <= hi);
    });
    expect(mustCoverMissing).toEqual([]);
  });
});

/**
 * 字型檔孤兒守門。
 *
 * 迴歸背景：B5 把 Expo 範本留下的 SpaceMono 從 `useFonts` 拔掉了，
 * 卻沒有刪檔——那 92 KB 從此沒有任何程式碼引用，但仍躺在 assets/fonts，
 * 每個原生 build 都照樣把它打包進去。「停止載入」與「停止打包」是兩件事，
 * 只做前者會留下看不見的體積。
 *
 * 這裡守的是後者：assets/fonts 底下每個字型檔都必須有人 require 或
 * 在腳本／設定裡指名，否則就是孤兒。
 */
describe('字型資產孤兒守門', () => {
  const REFERENCING_ROOTS = ['src', 'scripts', 'app.json'];
  const REPO = path.resolve(__dirname, '../..');

  /** 把 REFERENCING_ROOTS 底下的文字檔全部讀成一大串，用來找檔名 */
  function referencingSources(): string[] {
    const texts: string[] = [];
    const walk = (target: string) => {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
        return;
      }
      if (!/\.(tsx?|jsx?|json|py|md)$/.test(target)) return;
      texts.push(fs.readFileSync(target, 'utf-8'));
    };
    for (const root of REFERENCING_ROOTS) walk(path.join(REPO, root));
    return texts;
  }

  const fontFiles = () =>
    fs.readdirSync(FONTS_DIR).filter(f => /\.(ttf|otf|woff2?)$/i.test(f));

  test('掃描範圍實際讀到檔案（守門測試的自我檢查）', () => {
    expect(referencingSources().length).toBeGreaterThan(40);
    expect(fontFiles().length).toBeGreaterThan(0);
  });

  test('assets/fonts 底下沒有沒人引用的字型檔', () => {
    const sources = referencingSources();
    const orphans = fontFiles().filter(f => !sources.some(s => s.includes(f)));
    expect(orphans).toEqual([]);
  });
});
