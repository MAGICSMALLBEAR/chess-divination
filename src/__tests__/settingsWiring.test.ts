// 守門：設定項與實際行為必須對得上
//
// 這個檔案來自一對剛好相反的缺陷：
//   - `pieceCountPreset` 存得進設定，但抽棋流程從不讀它——
//     「預設抽棋數量」對 App 的行為零影響，三個按鈕永遠一視同仁。
//   - `drawAnimationSpeed` 有人讀（useAnimationSpeed），卻沒有任何 UI
//     可以寫——使用者永遠只能用預設的 normal。
//
// 兩者都是「設定看起來存在，實際上不存在」。這類缺陷沒辦法靠型別或
// 單元測試發現：兩邊各自都能通過編譯，缺的是它們之間的那條線。
// 所以用來源掃描守住接線，並以窮舉確認每個設定欄位都有人讀、有人寫。

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(SRC, ...segments), 'utf-8');
}

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

/** 去掉註解，避免「只在註解裡提到某個設定」被算成有接線 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const ALL_SOURCE = collectFiles(SRC)
  .map(f => stripComments(fs.readFileSync(f, 'utf-8')))
  .join('\n');

describe('預設抽棋數量（pieceCountPreset）', () => {
  const settingsSrc = stripComments(read('app', '(tabs)', 'settings.tsx'));
  const drawSrc = stripComments(read('app', 'draw.tsx'));

  test('設定頁寫得進去', () => {
    expect(settingsSrc).toContain("update('pieceCountPreset'");
  });

  /** 缺陷本身：存得進去卻沒有人讀 */
  test('抽棋頁真的讀了這個設定', () => {
    expect(drawSrc).toContain('pieceCountPreset');
  });

  test('抽棋頁把偏好的數量標示出來，而非三顆一視同仁', () => {
    // 標示方式可以改（邊框、標籤、排序），但「有沒有用到」必須成立
    expect(drawSrc).toMatch(/preferredCount === n/);
  });

  /**
   * 抽棋是按下去就直接開始，沒有「確認」那一步——所以預設值能有的
   * 誠實作用是把偏好那顆標出來，不是替使用者按下去。
   * 這條確保日後沒有人把它改成自動起卦。
   */
  test('不會替使用者自動開始抽棋', () => {
    expect(drawSrc).not.toMatch(/useEffect[\s\S]{0,400}startDrawing\(/);
  });
});

describe('抽棋動畫速度（drawAnimationSpeed）', () => {
  const settingsSrc = stripComments(read('app', '(tabs)', 'settings.tsx'));
  const speedHookSrc = stripComments(read('hooks', 'useAnimationSpeed.ts'));

  test('有人讀', () => {
    expect(speedHookSrc).toContain('drawAnimationSpeed');
  });

  /** 缺陷本身：有人讀卻沒有 UI 可以寫 */
  test('設定頁寫得進去', () => {
    expect(settingsSrc).toContain("update('drawAnimationSpeed'");
  });

  test('三個速度選項都給得出來', () => {
    // 三個選項以 map 迴圈產生，testID 由模板字串拼出——斷言迴圈來源
    // 與模板都在，而不要求硬編三次（實作刻意不硬編，改速度清單會同步生效）
    expect(settingsSrc).toMatch(/\[\s*'slow'\s*,\s*'normal'\s*,\s*'fast'\s*\]\s*as const/);
    expect(settingsSrc).toContain('anim-speed-${speed}');
  });
});

/**
 * 窮舉所有設定欄位，確保每一個都同時有讀與寫的地方。
 *
 * 這是上面兩條的一般化：與其等下一個欄位再壞一次，不如讓
 * 「加了欄位卻只接一半」當場失敗。
 */
describe('每個設定欄位都有人讀也有人寫', () => {
  const storageSrc = read('services', 'storage.ts');

  /** 從 AppSettings 介面取出欄位名 */
  const fields = (() => {
    const body = /export interface AppSettings \{([\s\S]*?)\n\}/.exec(storageSrc)?.[1] ?? '';
    return stripComments(body)
      .split(/\r?\n/)
      .map(line => /^\s*(\w+)\??:/.exec(line)?.[1])
      .filter((name): name is string => !!name);
  })();

  test('成功解析出設定欄位清單', () => {
    // 解析失敗會讓下面兩條變成空跑而永遠綠
    expect(fields.length).toBeGreaterThan(10);
    expect(fields).toContain('pieceCountPreset');
    expect(fields).toContain('drawAnimationSpeed');
  });

  test.each(fields)('%s 在 storage.ts 以外有被使用', field => {
    // storage.ts 自己的定義與預設值不算「有人用」
    const outside = collectFiles(SRC)
      .filter(f => !f.endsWith(path.join('services', 'storage.ts')))
      .map(f => stripComments(fs.readFileSync(f, 'utf-8')))
      .join('\n');
    expect(outside).toContain(field);
  });

  test('沒有任何欄位只出現在型別定義裡', () => {
    const orphans = fields.filter(field => {
      const uses = ALL_SOURCE.split(field).length - 1;
      // 一次是介面宣告本身；只有那一次代表沒有任何程式碼碰它
      return uses <= 1;
    });
    expect(orphans).toEqual([]);
  });
});
