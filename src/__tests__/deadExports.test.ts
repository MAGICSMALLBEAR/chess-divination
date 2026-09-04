import fs from 'fs';
import path from 'path';

/**
 * 「沒有呼叫端的匯出」反向守門。
 *
 * 這幾個檔案是工具與資料查詢模組：沒有任何東西逼你用它們，所以孤兒都
 * 長在這裡（S51 一次清掉八個：FontWeight、getPiecesByColor、
 * getPieceTypeName、getPoemsByHexagram、useThemeColors、isHapticEnabled、
 * hapticHeavy、generatePositionSummary）。同類的前科是 S36 的字型資產、
 * S39 的 summarizeReading、S49 的 playClickSound——每次都是「寫好了、
 * 忘了接上去」，型別與測試都不會有意見。
 *
 * 掃描刻意排除 `__tests__`：測試檔提到一個識別字是在「討論」它，
 * 不是在「用」它（S36 的教訓，守門會被自己餵飽）。
 */
const SRC = path.join(__dirname, '..');
const REPO = path.join(SRC, '..');

const SCANNED_FILES = [
  'constants/theme.ts',
  'data/pieces.ts',
  'data/poems.ts',
  'hooks/useAppTheme.tsx',
  'services/haptics.ts',
  'services/position.ts',
];

/**
 * 目前只有測試引用、但暫不刪除的匯出。
 * 每一條都要寫明理由；這份清單只該變短——多一個名字時該做的是刪掉它，
 * 而不是登記上來。
 */
const TEST_ONLY_PENDING: Record<string, string> = {
  getPiecesByType: '棋子查詢的對稱組之一，pieces.test.ts 的分佈守門在用',
  pieceTrigram: '棋子→卦的對照表，卦氣測試直接查表比對',
  getPoemsByLevel: '籤詩等級查詢，等級分佈測試在用',
};

/** 收集檔案裡的具名匯出（function 與 const） */
function exportsOf(relative: string): string[] {
  const source = fs.readFileSync(path.join(SRC, relative), 'utf-8');
  return [...source.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)\s*[:=]/gm)]
    .map(m => m[1] || m[2]);
}

function sourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(SRC);
  walk(path.join(REPO, 'e2e'));
  return files;
}

/** 這個名字在 src（不含 __tests__）與 e2e 裡被提到幾次，扣掉定義本身 */
function callSites(name: string, definedIn: string): number {
  const pattern = new RegExp(String.raw`\b${name}\b`, 'g');
  let total = 0;
  for (const file of sourceFiles()) {
    const hits = (fs.readFileSync(file, 'utf-8').match(pattern) || []).length;
    total += file === path.join(SRC, definedIn) ? Math.max(0, hits - 1) : hits;
  }
  return total;
}

describe('工具模組沒有孤兒匯出', () => {
  // 守門自我檢查：掃不到匯出、或把所有名字都數成 0 時，下面的斷言會空過
  test('掃得到匯出，也數得到真正的呼叫端', () => {
    expect(exportsOf('services/haptics.ts')).toContain('hapticLight');
    expect(callSites('hapticLight', 'services/haptics.ts')).toBeGreaterThan(0);
    expect(callSites('thisNameDoesNotExistAnywhere', 'services/haptics.ts')).toBe(0);
    expect(sourceFiles().length).toBeGreaterThan(50);
  });

  test.each(SCANNED_FILES)('%s 的每個匯出都有呼叫端', (relative) => {
    const orphans = exportsOf(relative)
      .filter(name => !(name in TEST_ONLY_PENDING))
      .filter(name => callSites(name, relative) === 0);
    expect(orphans).toEqual([]);
  });

  test('待查清單裡的匯出仍然存在，刪掉時要一併把它從清單移除', () => {
    const all = SCANNED_FILES.flatMap(exportsOf);
    expect(Object.keys(TEST_ONLY_PENDING).filter(n => !all.includes(n))).toEqual([]);
  });
});

/**
 * 同一個病、長在畫面層的那一半：**useState 的 setter 沒有呼叫端**。
 *
 * S52 的來源：收藏頁的資料夾分頁宣告了 `selectedFolderId`，也算好了
 * `selectedFolder` 與 `folderRecords`，但 `setSelectedFolderId` 從來沒有
 * 被呼叫過——於是資料夾點不開，卡片只列得下三筆，第四筆之後沒有任何
 * 地方到得了。`removeFromFolder()` 同時是個沒有呼叫端的匯出，兩件事
 * 其實是同一個功能只做了一半。
 *
 * 型別檢查對這種情況永遠沒有意見：setter 是被解構出來的區域變數，
 * 用不用它都合法（`noUnusedLocals` 也管不到解構的元素）。
 */
describe('畫面沒有從未被呼叫的 setState', () => {
  /** 掃 src 全部（不含 __tests__），回傳 [檔案, 值, setter] */
  function stateDeclarations(): [string, string, string][] {
    const out: [string, string, string][] = [];
    for (const file of sourceFiles()) {
      if (!file.startsWith(SRC)) continue;
      const source = fs.readFileSync(file, 'utf-8');
      for (const m of source.matchAll(/const \[(\w+), (set\w+)\][^=]*=\s*(?:React\.)?useState/g)) {
        out.push([path.relative(SRC, file), m[1], m[2]]);
      }
    }
    return out;
  }

  /** 這個名字在該檔案裡被提到幾次（宣告本身不算） */
  function usesIn(relative: string, name: string): number {
    const source = fs.readFileSync(path.join(SRC, relative), 'utf-8');
    return Math.max(0, (source.match(new RegExp(String.raw`\b${name}\b`, 'g')) || []).length - 1);
  }

  test('掃得到 useState 宣告（守門自我檢查）', () => {
    const decls = stateDeclarations();
    expect(decls.length).toBeGreaterThan(20);
    // 隨便挑一個真的有在用的：掃描壞掉時這一條會先紅
    expect(usesIn(path.join('app', '(tabs)', 'collection.tsx'), 'setSelectedFolderId')).toBeGreaterThan(0);
  });

  test('每個 setter 都至少被呼叫一次', () => {
    const orphans = stateDeclarations()
      .filter(([file, , setter]) => usesIn(file, setter) === 0)
      .map(([file, value, setter]) => `${file}  ${value}/${setter}`);
    expect(orphans).toEqual([]);
  });
});

/**
 * 同一家族的第三個：**算出來卻沒人用的區域變數**。
 *
 * S54 掃出三個：`stats.tsx` 的 `pct`（吉凶分佈算好了百分比只印次數——
 * 是想印而沒印完，S55 接上去了）、`ChessBoard.tsx` 的 `isAvailable` 與
 * `hasPiece`（純粹的死碼，S55 刪掉）。三個都不會壞畫面、不會紅測試，
 * 而第一個其實是「功能沒做完」留下的半截線索。
 *
 * 只看 `const x =` 形式，不看解構——解構出一半不用是常見且無害的寫法
 * （`const { a } = obj` 取一個欄位）。實測全專案只中那三個，沒有雜訊。
 */
describe('沒有算出來卻沒人用的區域變數', () => {
  /** 回傳 [檔案, 變數名]。縮排兩格以上＝函式或元件內部 */
  function locals(): [string, string][] {
    const out: [string, string][] = [];
    for (const file of sourceFiles()) {
      if (!file.startsWith(SRC)) continue;
      const source = fs.readFileSync(file, 'utf-8');
      for (const m of source.matchAll(/^\s{2,}const (\w+)\s*[:=][^=]/gm)) {
        out.push([path.relative(SRC, file), m[1]]);
      }
    }
    return out;
  }

  function mentions(relative: string, name: string): number {
    const source = fs.readFileSync(path.join(SRC, relative), 'utf-8');
    return (source.match(new RegExp(String.raw`\b${name}\b`, 'g')) || []).length;
  }

  test('掃得到區域變數，也數得到用它的地方（守門自我檢查）', () => {
    const found = locals();
    expect(found.length).toBeGreaterThan(50);
    // 挑一個確定有在用的：宣告 1 次 + 至少一處使用
    expect(mentions(path.join('components', 'ChessBoard.tsx'), 'getPieceAt')).toBeGreaterThan(1);
  });

  test('每個區域變數都至少被用過一次', () => {
    const orphans = locals()
      .filter(([file, name]) => mentions(file, name) <= 1)
      .map(([file, name]) => `${file}  ${name}`);
    expect(orphans).toEqual([]);
  });
});
