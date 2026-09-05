// 守門：沒有那個欄位的記錄，不該照著「有那個欄位」的路走
//
// 這個家族已經出現四次，每次都在不同的畫面：
//   S44  空的吉凶等級標籤（靈棋沒有等級，原典未載）
//   S45  空的模式標籤
//   S54  收藏卡的空棋子格（靈棋擲卦不落子，`drawnPieceChars` 是空陣列，
//        照畫就是一個沒有字的圓角色塊）
//   S58  首頁「最近占卜」的空棋子欄與空等級欄——那一欄還寫死 `width: 60`，
//        於是每一列靈棋記錄的卦名前面都空著一格
//
// 四次的成因完全相同：**新模式沒有的欄位，用的是舊模式那條渲染路徑**。
// 型別攔不住（空字串與空陣列都是合法值），單元測試也測不到（服務層存的
// 資料是對的），只有把靈棋記錄放進那個畫面才看得見。
//
// 所以守的不是某一頁，而是「凡是把這兩個欄位畫出來的地方，都要先問它有沒有」。

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

/** 去掉註解：這一段的關鍵字在說明文字裡也會出現（本檔開頭就是例子） */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const FILES = collect(path.join(SRC, 'app'))
  .concat(collect(path.join(SRC, 'components')))
  .map(file => ({
    name: path.relative(SRC, file).replace(/\\/g, '/'),
    src: stripComments(fs.readFileSync(file, 'utf-8')),
  }));

/**
 * 每條規則：怎樣算「把它畫出來」，以及哪些寫法算「有先問過」。
 *
 * 只認渲染，不認計算——`stats.tsx` 拿 `poemLevel` 去分組、`collection.tsx`
 * 拿它排序，那些不會在畫面上留下空欄位，要求它們加判斷只會逼人寫沒有意義
 * 的程式碼。
 */
const RULES = [
  {
    field: 'drawnPieceChars',
    renders: /drawnPieceChars\.join\(/,
    guards: [
      /drawnPieceChars\.length > 0/,      // 收藏卡、首頁、PoemCard
      /filter\(Boolean\)/,                 // 資料夾卡的預覽字串
      /\.join\([^)]*\)\s*\|\|\s*undefined/, // reveal 傳給 AI 提示詞時退成 undefined
    ],
    why: '靈棋擲卦不落子，drawnPieceChars 是空陣列',
  },
  {
    field: 'poemLevel',
    // 只抓 JSX 裡直接印出來的那種：{record.poemLevel} / {props.poemLevel}
    renders: /\{\s*\w+\.poemLevel\s*\}/,
    guards: [
      /recordHasLevel\(/,   // 收藏卡、首頁
      /poemLevel\s*\?/,     // ShareCardView（靈棋分享卡傳的正是空字串）
    ],
    why: '靈棋沒有吉凶等級（原典未載，故也不計入吉凶統計）',
  },
] as const;

describe('空欄位不照著有那個欄位的路走', () => {
  for (const rule of RULES) {
    const sites = FILES.filter(f => rule.renders.test(f.src));

    describe(`${rule.field}（${rule.why}）`, () => {
      /**
       * 反空轉：正則失效、或這些畫面被改寫成別的取值方式時要紅。
       * 少了這條，掃不到任何檔案的守門會靜靜地全過。
       */
      test('掃得到把它畫出來的畫面', () => {
        expect(sites.length).toBeGreaterThan(0);
      });

      test.each(sites.map(s => [s.name, s.src] as const))(
        '%s 先問過有沒有值才畫',
        (_name, src) => {
          expect(rule.guards.some(g => g.test(src))).toBe(true);
        },
      );
    });
  }

  /**
   * 首頁曾經是唯一漏掉的那一頁（S58）。這條把它單獨釘住——上面的規則是
   * 檔案層級的，只要首頁還畫著棋子欄就會通過棋子那條；等級那條若被拿掉，
   * 沒有這一條就得靠 e2e 才發現。
   */
  test('首頁「最近占卜」兩個欄位都問過', () => {
    const home = FILES.find(f => f.name === 'app/(tabs)/index.tsx');
    expect(home).toBeDefined();
    expect(home!.src).toMatch(/drawnPieceChars\.length > 0 && \(/);
    expect(home!.src).toMatch(/recordHasLevel\(r\) && \(/);
  });
});
