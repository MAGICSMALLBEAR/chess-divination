import fs from 'fs';
import path from 'path';
import { DarkTheme, LightTheme, type ThemeColors } from '../constants/theme';

const SRC = path.join(__dirname, '..');

/**
 * 允許保留色值字面量的檔案，各有明確理由：
 * - constants/theme.ts   色盤本身的定義處
 * - +html.tsx            Web 外殼的 body 底色，在 React 樹之外，已用 prefers-color-scheme 處理
 * - ErrorBoundary.tsx    class component，且可能在 ThemeProvider 崩潰時才被觸發
 * - ShareCardView.tsx    匯出成圖片的成品，刻意固定品牌樣式（色值集中於 ShareCardPalette）
 * - PieceDraw3D.tsx     3D 棋子背面（卦象面）使用固定深色底，為實體工藝色
 * - InkSplashOverlay.tsx 墨滴遮罩使用固定墨色 #1a0f0a，為視覺效果的實體色
 * - PieceEntryFlyIn.tsx  棋子實體物件使用朱砂紅／墨黑等固定工藝色，不受主題影響
 * - CustomCategoriesSection.tsx  Modal 遮罩使用固定半透明黑色，不受主題影響
 * - icons/Icon.tsx、TrigramGlyph.tsx  色值僅為 color prop 的預設值，
 *                        呼叫端一律傳入主題色覆蓋
 *
 * PieceIcon.tsx 已移出清單：它沒有 color 覆蓋管道（color prop 是紅／黑的
 * 選擇器，不是色值），原本寫死的三個色還混用了兩個主題的值——邊框取暗色
 * 主題的金、黑子取宣紙主題的墨，兩個主題下都不完全正確。現已改讀 theme。
 */
const ALLOWLIST = new Set([
  path.join('constants', 'theme.ts'),
  path.join('app', '+html.tsx'),
  path.join('components', 'ErrorBoundary.tsx'),
  path.join('components', 'ShareCardView.tsx'),
  path.join('components', 'PieceDraw3D.tsx'),
  path.join('components', 'InkSplashOverlay.tsx'),
  path.join('components', 'PieceEntryFlyIn.tsx'),
  path.join('components', 'CustomCategoriesSection.tsx'),
  path.join('components', 'icons', 'Icon.tsx'),
  path.join('components', 'icons', 'TrigramGlyph.tsx'),
]);

/** 陰影與純透明不屬於主題色，允許直接寫死 */
const ALLOWED_LITERALS = /^(#000000|#000|transparent)$/i;

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

describe('主題一致性', () => {
  /**
   * 迴歸：全 App 原本散落 300 多個硬編色碼，切到亮色主題後會出現
   * 淺色背景配淺色文字的不可讀畫面。此測試防止硬編色碼回流。
   */
  test('UI 檔案不得出現硬編色碼', () => {
    const offenders: string[] = [];

    for (const file of collectFiles(SRC)) {
      const relative = path.relative(SRC, file);
      if (ALLOWLIST.has(relative)) continue;

      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // 只看實際的色值字面量，略過註解
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

        // hex／rgb／rgba／hsl／hsla 全部攔。hsl 是後來補的——
        // 舊版只攔 hex 與 rgb，hsl() 硬編色碼會整筆溜過守門。
        const matches = line.match(
          /#[0-9A-Fa-f]{3,8}\b|rgba?\(\s*\d+|hsla?\(/g,
        );
        if (!matches) return;

        const bad = matches.filter(m => !ALLOWED_LITERALS.test(m));
        if (bad.length > 0) {
          offenders.push(`${relative}:${i + 1}  ${bad.join(', ')}  →  ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  /** 掃描實際涵蓋 UI 檔。低於下限代表掃描路徑壞了，此測試會空轉 */
  test('掃描範圍實際涵蓋 UI 檔案（守門測試的自我檢查）', () => {
    expect(collectFiles(SRC).length).toBeGreaterThan(40);
  });

  test('兩個主題必須定義相同的色彩鍵', () => {
    const darkKeys = Object.keys(DarkTheme).sort();
    const lightKeys = Object.keys(LightTheme).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  test('每個主題色都必須是有效的色值', () => {
    const valid = /^(#[0-9A-Fa-f]{6}|rgba?\(.+\))$/;
    ([DarkTheme, LightTheme] as ThemeColors[]).forEach(theme => {
      Object.entries(theme).forEach(([key, value]) => {
        expect(`${key}=${value}`).toMatch(
          new RegExp(`^${key}=(${valid.source.slice(1, -1)})$`),
        );
      });
    });
  });

  /**
   * 亮色主題若沿用暗色的文字色，就會出現淺底淺字。
   * 兩個主題的前景色必須確實不同。
   */
  test('明暗主題的前景與背景必須有所區別', () => {
    const mustDiffer: (keyof ThemeColors)[] = [
      'bgInk', 'bgDark', 'bgCard', 'textPrimary', 'textSecondary', 'textMuted',
    ];
    mustDiffer.forEach(key => {
      expect(LightTheme[key]).not.toBe(DarkTheme[key]);
    });
  });
});
