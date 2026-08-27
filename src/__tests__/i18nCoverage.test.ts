// 守門測試：UI 檔案不得出現硬編中文字串
//
// 迴歸背景：語言切換器把三種語言都列給使用者，但介面文字原本
// 大量寫死在 JSX 裡。切到 en/ja 後，翻譯過的只有籤詩與少數標題，
// 其餘按鈕、提示、Alert 全是中文——語言切換形同半殘。
//
// 此測試掃描 src/app 與 src/components，任何非註解、非允許清單內的
// 中文字元都會失敗，逼新程式碼走 t() 而非直接寫字。

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
// hooks 也在掃描範圍：useDrawDivination 等 hook 會組出顯示給使用者看的
// 文案，硬編中文同樣要攔。資料服務層（services/data）的中文是命理資料
// 值，本來就不屬於介面文字，維持不掃。
const SCAN_DIRS = ['app', 'components', 'hooks'];

/** 中日韓統一表意文字。全形標點不算——它們常出現在 t() 的前後綴 */
const CJK = /[一-鿿]/;

/**
 * 允許保留中文字面量的檔案，各有明確理由：
 * - icons/PieceIcon.tsx  棋子上的漢字（帥將仕士…）就是棋子本身，
 *                        翻譯後就不是象棋了
 * - ChessBoard.tsx       「楚河漢界」是畫在棋盤上的字，屬於棋具而非介面
 * - hooks/useI18n.ts     它本身就是 t 的供應者（useI18n 的實作），
 *                        必須直接 import 翻譯服務
 */
const ALLOWLIST = new Set([
  path.join('components', 'icons', 'PieceIcon.tsx'),
  path.join('components', 'ChessBoard.tsx'),
  path.join('hooks', 'useI18n.ts'),
  // 伺服器端 API Route，沒有使用者的語言資訊可用。這些訊息也不會被
  // 顯示出來——aiInterpretation.ts 只看 HTTP 狀態碼，自行產生譯好的文案。
  path.join('app', 'api', 'interpret+api.ts'),
]);

/**
 * 允許出現中文的程式碼樣式（非顯示字串）：
 * - 以吉凶等級／五行／卦名等資料值做比較或查表，
 *   這些是儲存在記錄裡的資料值，不是給人讀的介面文字
 * - 送給模型的提示詞（本來就要是中文）
 * - console 診斷訊息：開發者主控台才看得到，不是介面文字，
 *   與程式碼註解共用中文語言
 */
const DATA_VALUE_PATTERNS = [
  /===\s*'[一-鿿]+'/,           // r.poemLevel === '大吉'
  /'[一-鿿]+'\s*(?:===|!==)/,   // '大吉' === x
  /['"]?[一-鿿]+['"]?\s*:/,     // 物件的中文 key（查表用）
  /\[['"][一-鿿]+['"]\]/,       // Colors['中平'] 這種查表
  /reading\.strength|reading\.bodyUse/, // 組給 AI 的卦象提示詞
  /console\.(?:warn|log|error|info|debug)\(/, // 開發者診斷訊息
];

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      collectFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * 去掉註解後回傳每行的程式碼部分，讓中文註解不被誤判。
 * 需一併處理 JSX 註解 `{/* … *\/}`——它在同一行內開閉，
 * 只看「有沒有跨行」會整段漏掉。
 */
function stripComments(source: string): string[] {
  const out: string[] = [];
  let inBlock = false;

  for (const raw of source.split(/\r?\n/)) {
    let line = raw;

    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) { out.push(''); continue; }
      inBlock = false;
      line = line.slice(end + 2);
    }

    // JSDoc 的 * 續行
    if (/^\s*\*/.test(raw)) { out.push(''); continue; }

    // 先清掉所有同一行內開閉的區塊註解，再判斷是否有未閉合的
    let prev: string;
    do {
      prev = line;
      line = line.replace(/\/\*[\s\S]*?\*\//, '');
    } while (line !== prev);

    const blockStart = line.indexOf('/*');
    if (blockStart !== -1) {
      inBlock = true;
      line = line.slice(0, blockStart);
    }

    out.push(line.replace(/\/\/.*$/, ''));
  }

  return out;
}

describe('i18n 覆蓋率', () => {
  /** 掃到的 UI 檔數下限。比它少代表掃描本身壞了（路徑改動），測試會空轉 */
  const scannedFiles = () => SCAN_DIRS.flatMap(d => collectFiles(path.join(SRC, d)));

  test('掃描範圍實際涵蓋 UI 檔案（守門測試的自我檢查）', () => {
    expect(scannedFiles().length).toBeGreaterThan(40);
  });

  test('UI 檔案不得出現硬編中文字串', () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(path.join(SRC, dir))) {
        const relative = path.relative(SRC, file);
        if (ALLOWLIST.has(relative)) continue;

        stripComments(fs.readFileSync(file, 'utf8')).forEach((line, i) => {
          if (!CJK.test(line)) return;
          if (DATA_VALUE_PATTERNS.some(p => p.test(line))) return;
          offenders.push(`${relative}:${i + 1}  ${line.trim()}`);
        });
      }
    }

    expect(offenders).toEqual([]);
  });

  test('UI 檔案應透過 useI18n 取得 t，而非直接 import', () => {
    // 直接 import 的 t 不會訂閱語言變更，切語言後該畫面不會重繪。
    // 例外：ErrorBoundary 是 class component 不能用 hook；
    // useI18n.ts 本身是 t 的供應者。
    const allowed = new Set([
      path.join('components', 'ErrorBoundary.tsx'),
      path.join('hooks', 'useI18n.ts'),
    ]);
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(path.join(SRC, dir))) {
        const relative = path.relative(SRC, file);
        if (allowed.has(relative)) continue;

        const source = fs.readFileSync(file, 'utf8');
        // 三種都攔：import { t }（含混搭、含 t as 別名）、
        // import * as i18n、import i18n from …——全部都不訂閱語言變更
        const hasNamedT = /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"]@?\/?[^'"]*services\/i18n['"]/.test(source);
        const hasAliasedT = /import\s*\{[^}]*\bt\s+as\s+\w+[^}]*\}\s*from\s*['"]@?\/?[^'"]*services\/i18n['"]/.test(source);
        const hasNamespace = /import\s+\*\s+as\s+\w+\s+from\s*['"]@?\/?[^'"]*services\/i18n['"]/.test(source);
        if (hasNamedT || hasAliasedT || hasNamespace) {
          offenders.push(relative);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * 反向守門：翻譯表裡不得有沒人用的鍵。
 *
 * 迴歸背景：介面改版時常見的是「換一個更好的鍵」——`collection.empty`
 * 被 `collection.noHistory` 取代、`library.keyword` 被 `library.search`
 * 取代——舊鍵沒人刪，三種語言的字串就一直躺在表裡跟著 bundle 出貨。
 * 更麻煩的是它會誤導：日後有人看到 `settings.syncPartial` 會以為畫面
 * 真的有「部分同步」這個狀態，其實那個狀態根本不存在。
 *
 * 動態組出來的鍵（t(`outcome.${status}`)）掃不到字面量，所以列前綴白名單，
 * 每一條都要指出是誰組的——白名單長出來就代表動態鍵變多了，該檢討。
 */
describe('翻譯鍵反向覆蓋', () => {
  /** 以樣板字串動態組出的鍵，掃描找不到字面量，逐條記錄組它的地方 */
  const DYNAMIC_PREFIXES: [string, string][] = [
    ['outcome.', 'OutcomeMarker.tsx / collection.tsx 的 t(`outcome.${status}`)'],
    ['stats.season', 'stats.tsx 的 t(`stats.season${season}`)'],
  ];

  const i18nSource = () =>
    fs.readFileSync(path.join(SRC, 'services', 'i18n.ts'), 'utf8');

  /**
   * 掃 src 全部（含 data/services，籤詩與陣型的 labelKey 寫在那裡），
   * 排除 i18n.ts 自己與 __tests__。
   *
   * 排除 __tests__ 不是為了跑得快：測試檔裡出現的鍵名是在「討論」這個鍵，
   * 不是在用它。第一版沒排除，本測試的註解裡剛好舉了一個死鍵當例子，
   * 注入驗證就這樣被自己餵飽而假綠——同理註解也要先剝掉。
   */
  function usageText(): string {
    const chunks: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        if (full === path.join(SRC, 'services', 'i18n.ts')) continue;
        chunks.push(stripComments(fs.readFileSync(full, 'utf8')).join('\n'));
      }
    };
    walk(SRC);
    return chunks.join('\n');
  }

  const keys = () =>
    [...new Set([...i18nSource().matchAll(/^\s*'([\w.]+)':\s*\{/gm)].map(m => m[1]))];

  test('翻譯表與掃描範圍都不是空的（守門測試的自我檢查）', () => {
    expect(keys().length).toBeGreaterThan(300);
    expect(usageText().length).toBeGreaterThan(100_000);
  });

  test('每個翻譯鍵都有人用', () => {
    const text = usageText();
    const dead = keys().filter(key => {
      if (DYNAMIC_PREFIXES.some(([prefix]) => key.startsWith(prefix))) return false;
      return !text.includes(`'${key}'`) && !text.includes(`"${key}"`) && !text.includes(`\`${key}\``);
    });
    expect(dead).toEqual([]);
  });
});
