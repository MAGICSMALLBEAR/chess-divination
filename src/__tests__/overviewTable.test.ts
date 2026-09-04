/**
 * 守門測試：WORKLOG.md 開頭那張「專案總覽」表要與實際專案對得上。
 *
 * 迴歸背景（S56）：那張表連續四個 session 沒人更新——寫著 1064 個 Jest 測試、
 * 178 條 E2E，實際已經是 1103／204；原始碼檔案寫 149，實際 98。沒有任何東西
 * 會在它過期時出聲，於是它就一路錯下去，而它是整份日誌第一眼看到的東西。
 *
 * 這是 S51「數量寫死在文案裡的地方要有真相來源」的同一件事，只是那次的
 * 對象是引導頁的文案（真相來源是 `DivinationMode` 的成員數），這次是日誌。
 *
 * **數得出來的才守**：測試數要整套跑完才知道、commit 數要問 git，兩者都不是
 * 單元測試該做的事，故在表上標「※」並排除於此。守一半好過守零——會過期的
 * 十一列裡有八列從此改錯就紅。
 */

import fs from 'fs';
import path from 'path';

import { ALL_POEMS } from '@/data/poems';
import { LINGQI_ORACLES } from '@/data/lingqiOracles';

const SRC = path.join(__dirname, '..');
const WORKLOG = path.join(SRC, '..', 'WORKLOG.md');

/** 只讀開頭那張表：日誌後面每個 session 都有自己的測試增減表，會誤中 */
function overviewTable(): string {
  const text = fs.readFileSync(WORKLOG, 'utf-8');
  const start = text.indexOf('## 專案總覽');
  const end = text.indexOf('### 技術棧', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

/** 表上某一列寫的數字。`| 頁面 | 15 個 |` → 15 */
function statedCount(label: string): number {
  const row = overviewTable()
    .split('\n')
    .find(line => line.startsWith(`| ${label} `));
  expect(row).toBeDefined();
  const match = row!.match(/\|\s*([\d,]+)\s*[^|]*\|/);
  expect(match).not.toBeNull();
  return Number(match![1].replace(/,/g, ''));
}

/** 某個目錄下的原始碼檔數（不遞迴進 __tests__） */
function countFiles(relative: string, extensions: RegExp, recursive = false): number {
  const walk = (dir: string): number => {
    let n = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        if (recursive) n += walk(path.join(dir, entry.name));
      } else if (extensions.test(entry.name)) {
        n += 1;
      }
    }
    return n;
  };
  return walk(path.join(SRC, relative));
}

describe('WORKLOG 的專案總覽表沒有過期', () => {
  /** 守門自我檢查：讀不到表或抓不到數字時，下面每一條都會空過 */
  test('讀得到那張表，也抓得出裡面的數字', () => {
    expect(overviewTable()).toContain('| 頁面 |');
    expect(statedCount('頁面')).toBeGreaterThan(0);
  });

  test('原始碼檔案數', () => {
    // 定義寫在表格那一列裡：src 底下的 .ts/.tsx，不含測試。
    // 沒有寫明定義的數字沒有辦法守——這一列原本就是這樣飄掉的。
    expect(statedCount('原始碼檔案')).toBe(countFiles('.', /\.tsx?$/, true));
  });

  test('頁面數', () => {
    expect(statedCount('頁面')).toBe(countFiles('app', /\.tsx$/, true));
  });

  test('元件數', () => {
    expect(statedCount('元件')).toBe(countFiles('components', /\.tsx$/, true));
  });

  test('Hooks 數', () => {
    expect(statedCount('Hooks')).toBe(countFiles('hooks', /\.tsx?$/));
  });

  test('服務數', () => {
    expect(statedCount('服務')).toBe(countFiles('services', /\.ts$/));
  });

  test('Jest 套件數', () => {
    const suites = fs.readdirSync(path.join(SRC, '__tests__'))
      .filter(name => /\.tsx?$/.test(name)).length;
    // 「1103 個 ※ · 53 套件」——套件數不是該列的第一個數字，另外抓
    const row = overviewTable().split('\n').find(l => l.startsWith('| Jest 測試 '))!;
    expect(Number(row.match(/·\s*(\d+)\s*套件/)![1])).toBe(suites);
  });

  test('籤詩與靈棋卦目數', () => {
    expect(overviewTable()).toContain(`${ALL_POEMS.length} 首七言絕句`);
    expect(overviewTable()).toContain(`${LINGQI_ORACLES.length} 卦目原典`);
  });
});
