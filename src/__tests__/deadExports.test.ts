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
