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
const SCAN_DIRS = ['app', 'components'];

/** 中日韓統一表意文字。全形標點不算——它們常出現在 t() 的前後綴 */
const CJK = /[一-鿿]/;

/**
 * 允許保留中文字面量的檔案，各有明確理由：
 * - icons/PieceIcon.tsx  棋子上的漢字（帥將仕士…）就是棋子本身，
 *                        翻譯後就不是象棋了
 * - ChessBoard.tsx       「楚河漢界」是畫在棋盤上的字，屬於棋具而非介面
 */
const ALLOWLIST = new Set([
  path.join('components', 'icons', 'PieceIcon.tsx'),
  path.join('components', 'ChessBoard.tsx'),
  // 伺服器端 API Route，沒有使用者的語言資訊可用。這些訊息也不會被
  // 顯示出來——aiInterpretation.ts 只看 HTTP 狀態碼，自行產生譯好的文案。
  path.join('app', 'api', 'interpret+api.ts'),
]);

/**
 * 允許出現中文的程式碼樣式（非顯示字串）：
 * - 以吉凶等級／五行／卦名等資料值做比較或查表，
 *   這些是儲存在記錄裡的資料值，不是給人讀的介面文字
 * - 送給模型的提示詞（本來就要是中文）
 */
const DATA_VALUE_PATTERNS = [
  /===\s*'[一-鿿]+'/,           // r.poemLevel === '大吉'
  /'[一-鿿]+'\s*(?:===|!==)/,   // '大吉' === x
  /['"]?[一-鿿]+['"]?\s*:/,     // 物件的中文 key（查表用）
  /\[['"][一-鿿]+['"]\]/,       // Colors['中平'] 這種查表
  /reading\.strength|reading\.bodyUse/, // 組給 AI 的卦象提示詞
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
    // ErrorBoundary 是唯一例外：class component 不能用 hook。
    const allowed = new Set([path.join('components', 'ErrorBoundary.tsx')]);
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(path.join(SRC, dir))) {
        const relative = path.relative(SRC, file);
        if (allowed.has(relative)) continue;

        const source = fs.readFileSync(file, 'utf8');
        // import { t } / import { t, ... } / import { ..., t } from '@/services/i18n'
        if (/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"]@?\/?[^'"]*services\/i18n['"]/.test(source)) {
          offenders.push(relative);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
