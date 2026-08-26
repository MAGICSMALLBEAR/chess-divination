// 空白輸入與 web 文件層設定的守門
//
// 迴歸 A11：資料夾／類別名稱為空時 handler 只是 `return`，按鈕看起來
// 就是壞的；姓名沒有 trim 也沒有長度上限，存成整串空白後畫面一片空白，
// 而 `settings.userName || t('nameUnset')` 的後備因為字串非空永遠不出現。
//
// 迴歸 A12：`+html.tsx` 的 lang 寫死 zh-TW、theme-color 固定深色。
//
// 這兩類缺陷都在「畫面與資料之間」，型別與單元測試各自都過得了，
// 所以用來源掃描守住接線。

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(SRC, ...segments), 'utf-8');
}

/** 去掉註解，避免「只在註解裡寫過」被算成有做 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('空白名稱不再靜默無反應', () => {
  test('新增資料夾的按鈕在名稱為空時明確不可用', () => {
    const src = stripComments(read('app', '(tabs)', 'collection.tsx'));
    expect(src).toMatch(/disabled=\{!newFolderName\.trim\(\)\}/);
    // 不只是按不下去，還要看得出來按不下去
    expect(src).toMatch(/folderBtnDisabled/);
  });

  test('自訂類別的儲存鈕在名稱為空時明確不可用', () => {
    const src = stripComments(read('components', 'CustomCategoriesSection.tsx'));
    expect(src).toMatch(/disabled=\{!editLabel\.trim\(\)\}/);
    expect(src).toMatch(/modalBtnDisabled/);
  });

  test('姓名存入前先 trim，全空白等於清除', () => {
    const src = stripComments(read('app', '(tabs)', 'settings.tsx'));
    expect(src).toContain("update('userName', nameText.trim())");
  });

  test('三個名稱輸入框都有長度上限', () => {
    // 沒有上限的話，超長名稱會把卡片與列撐破
    expect(stripComments(read('app', '(tabs)', 'settings.tsx'))).toMatch(/maxLength=\{\d+\}/);
    expect(stripComments(read('app', '(tabs)', 'collection.tsx'))).toMatch(/maxLength=\{\d+\}/);
    expect(stripComments(read('components', 'CustomCategoriesSection.tsx'))).toMatch(/maxLength=\{\d+\}/);
  });
});

describe('web 文件層跟隨語言與主題', () => {
  const html = read('app', '+html.tsx');

  /**
   * 靜態 HTML 只能帶建置時的預設值，實際語言得在執行期補正。
   * 讀屏與斷字依 lang 決定，等 React 掛載才改，第一段內容已經用
   * 中文的規則念過了，所以補正的腳本必須在 head 裡。
   */
  test('啟動時會依儲存的設定補正 <html lang>', () => {
    expect(html).toContain('document.documentElement.lang');
    expect(html).toContain('@chess_divination_settings');
  });

  test('切換語言時同步更新 <html lang>', () => {
    const i18n = read('services', 'i18n.ts');
    expect(i18n).toMatch(/^\s*syncDocumentLang\(lang\);/m);
    expect(i18n).toContain('document.documentElement.lang');
  });

  test('theme-color 依系統偏好分深淺兩個標籤', () => {
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
  });

  /** 使用者在 App 內明確選了與系統相反的主題時，外框也要跟著換 */
  test('主題切換時於執行期覆寫 theme-color', () => {
    const themeHook = stripComments(read('hooks', 'useAppTheme.tsx'));
    expect(themeHook).toContain('theme-color');
    expect(themeHook).toContain('theme.bgInk');
  });
});
