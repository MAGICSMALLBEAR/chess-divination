// 首載效能預算：量 dist/ 的 Brotli 壓縮後大小，超過預算就以非零結束。
//
// 為什麼量 Brotli 而不是原始位元組：Vercel 對 JS 一律送 br，使用者下載的是壓縮後的大小
// （2026-10-01 實測線上首頁：原始 2,955 KB、br 726 KB）。量原始大小會讓「加了一段很好壓的
// 譯文」和「加了一個不好壓的套件」看起來一樣重。
//
// 這裡用 Brotli 最高品質（11）量，數字比線上實際傳輸小：同一份產物本機量 586 KB、
// Vercel 即時壓縮送出 725 KB（10/1 兩邊都量過）。兩者不能互比，預算只跟自己的歷史比。
//
// 預算取 10/1 的本機值再留約 5% 餘裕：目的不是逼瘦，是讓「不小心把大東西拉進首載」
// 第一次發生時就看得到。預算要調就改這裡的數字，並在 WORKLOG 寫下為什麼。
//
// 用法：npm run build:web && npm run budget
/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const KB = 1024;

const BUDGET = {
  /** 首頁 HTML 直接引用的 JS 加總（首載） */
  initialJs: 615 * KB,
  /** 任一個延遲載入的 chunk（路由與英日譯文） */
  lazyChunk: 60 * KB,
};

const brSize = file => zlib.brotliCompressSync(fs.readFileSync(file), {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
}).length;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('找不到 dist/index.html——先跑 npm run build:web');
  process.exit(2);
}

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const initial = [...html.matchAll(/src="\/(_expo\/static\/js\/web\/[^"]+\.js)"/g)].map(m => m[1]);
if (initial.length < 3) {
  // 反空轉：抓不到 script 標籤時不能靜靜回報「0 KB，通過」
  console.error(`index.html 只找到 ${initial.length} 個 script，匯出格式可能變了，預算檢查無效`);
  process.exit(2);
}

const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
const all = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const initialNames = new Set(initial.map(p => path.basename(p)));

let failed = false;
const fmt = n => `${(n / KB).toFixed(1)} KB`;

const initialTotal = initial.reduce((sum, p) => sum + brSize(path.join(DIST, p)), 0);
const initialOk = initialTotal <= BUDGET.initialJs;
failed ||= !initialOk;
console.log(`${initialOk ? 'OK  ' : 'OVER'} 首載 JS（${initial.length} 檔）${fmt(initialTotal)} / 預算 ${fmt(BUDGET.initialJs)}`);

for (const name of all.filter(f => !initialNames.has(f)).sort()) {
  const size = brSize(path.join(jsDir, name));
  const ok = size <= BUDGET.lazyChunk;
  failed ||= !ok;
  if (!ok || process.argv.includes('--verbose')) {
    console.log(`${ok ? 'OK  ' : 'OVER'} ${name} ${fmt(size)} / 預算 ${fmt(BUDGET.lazyChunk)}`);
  }
}

process.exit(failed ? 1 : 0);
