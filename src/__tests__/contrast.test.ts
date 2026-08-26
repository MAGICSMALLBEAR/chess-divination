// contrast.ts 測試
//
// 這個模組的存在是為了讓「這個字讀得清楚嗎」變成可計算、可守門的事，
// 所以測試的重點有二：算出來的數字對不對（拿 WCAG 的已知值校準），
// 以及 readableTextOn 是否真的保證了它宣稱的下限。

import fs from 'fs';
import path from 'path';
import {
  parseHex, relativeLuminance, contrastRatio, readableTextOn,
  meetsAA, meetsAALarge, INK_ON_LIGHT, PAPER_ON_DARK, PURE_INK,
} from '../services/contrast';
import {
  LevelColors, DEFAULT_LEVEL_COLOR, DarkTheme, LightTheme,
} from '../constants/theme';

describe('parseHex', () => {
  test('解析六位色碼', () => {
    expect(parseHex('#C9A96E')).toEqual([0xC9, 0xA9, 0x6E]);
  });

  test('大小寫皆可，井字號可省略', () => {
    expect(parseHex('c9a96e')).toEqual([0xC9, 0xA9, 0x6E]);
    expect(parseHex('#c9A96e')).toEqual([0xC9, 0xA9, 0x6E]);
  });

  test('三位簡寫展開為六位', () => {
    expect(parseHex('#abc')).toEqual([0xAA, 0xBB, 0xCC]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
  });

  test('不合法的輸入回傳 null 而非拋錯', () => {
    // 色值可能來自舊備份或使用者資料，不該讓整個畫面崩掉
    expect(parseHex('')).toBeNull();
    expect(parseHex('紅色')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('rgb(1,2,3)')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  test('純黑為 0、純白為 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  /**
   * 三原色的亮度差異是這個公式的重點：不是 (r+g+b)/3。
   * 綠最亮、藍最暗，順序錯了代表加權係數搞混了。
   */
  test('綠遠亮於紅、紅遠亮於藍', () => {
    const g = relativeLuminance('#00FF00');
    const r = relativeLuminance('#FF0000');
    const b = relativeLuminance('#0000FF');
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(b);
    // WCAG 的係數：綠 0.7152、紅 0.2126、藍 0.0722
    expect(g).toBeCloseTo(0.7152, 4);
    expect(r).toBeCloseTo(0.2126, 4);
    expect(b).toBeCloseTo(0.0722, 4);
  });

  test('gamma 線性化有做：50% 灰的亮度遠低於 0.5', () => {
    // 沒做線性化的話 #808080 會算出約 0.5，實際約 0.216
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
  });
});

describe('contrastRatio', () => {
  test('黑白對比為 21:1，同色為 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 4);
    expect(contrastRatio('#C9A96E', '#C9A96E')).toBeCloseTo(1, 6);
  });

  test('與參數順序無關', () => {
    expect(contrastRatio('#123456', '#FEDCBA'))
      .toBeCloseTo(contrastRatio('#FEDCBA', '#123456'), 10);
  });

  /**
   * 這一條是整個模組的起因：吉凶標籤一律白字，而中平的米黃底
   * 對白字只有約 1.9:1——標籤才 11px，等於印了看不見的字。
   */
  test('中平的米黃底配白字遠低於 AA', () => {
    const ratio = contrastRatio(LevelColors['中平'], '#FFFFFF');
    expect(ratio).toBeLessThan(2.2);
    expect(meetsAA('#FFFFFF', LevelColors['中平'])).toBe(false);
  });
});

describe('readableTextOn', () => {
  test('深底給淺字、淺底給深字', () => {
    expect(readableTextOn('#000000')).toBe(PAPER_ON_DARK);
    expect(readableTextOn('#FFFFFF')).toBe(INK_ON_LIGHT);
  });

  /**
   * 這是 readableTextOn 對外的承諾。若哪天有人把它改成回傳中間色，
   * 或改動了 INK_ON_LIGHT／PAPER_ON_DARK 的值，這裡會擋下來。
   *
   * 掃過整個 sRGB 空間的取樣點，而不是只測幾個手挑的顏色——
   * 「對任何底色都成立」正是這個函式唯一有意義的性質。
   */
  test('對整個色彩空間的取樣點皆達 AA 4.5:1', () => {
    const failures: string[] = [];
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 17) {
        for (let b = 0; b < 256; b += 17) {
          const bg = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
          if (!meetsAA(readableTextOn(bg), bg)) failures.push(bg);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /**
   * 保底那一支真的會被走到——否則上面那條全空間掃描可能只是因為
   * 柔化的墨色剛好夠用，PURE_INK 的分支從未執行卻無人察覺。
   *
   * 「下下」的灰褐亮度約 0.201，正落在 ink 與 paper 都不足 4.5:1 的
   * 缺口裡（ink 需 ≥0.222，paper 需 ≤0.183），是這個分支的實際觸發點。
   */
  test('中間調底色退到純黑，而非勉強用柔化的墨色', () => {
    const bg = LevelColors['下下'];
    expect(meetsAA(INK_ON_LIGHT, bg)).toBe(false);
    expect(meetsAA(PAPER_ON_DARK, bg)).toBe(false);

    expect(readableTextOn(bg)).toBe(PURE_INK);
    expect(meetsAA(readableTextOn(bg), bg)).toBe(true);
  });

  test('一般的深底／淺底仍拿到柔化的墨或紙色，不濫用純黑', () => {
    // 讓步只發生在非讓不可的地方
    expect(readableTextOn('#F5F0E6')).toBe(INK_ON_LIGHT);
    expect(readableTextOn('#1F1B16')).toBe(PAPER_ON_DARK);
  });

  test('五個吉凶等級底色配上推得的前景皆達 AA', () => {
    const offenders = [...Object.entries(LevelColors), ['預設', DEFAULT_LEVEL_COLOR]]
      .filter(([, bg]) => !meetsAA(readableTextOn(bg), bg))
      .map(([level]) => level);
    expect(offenders).toEqual([]);
  });

  /** 五個等級底色本身也該彼此分得出來，否則清單掃過去等級沒有意義 */
  test('五個等級底色兩兩皆有可辨識的亮度差', () => {
    const entries = Object.entries(LevelColors);
    const tooSimilar: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i][1] === entries[j][1]) tooSimilar.push(`${entries[i][0]}／${entries[j][0]}`);
      }
    }
    expect(tooSimilar).toEqual([]);
  });
});

describe('門檻判斷', () => {
  test('meetsAA 以 4.5:1 為界', () => {
    expect(meetsAA('#767676', '#FFFFFF')).toBe(true);   // 約 4.54
    expect(meetsAA('#777777', '#FFFFFF')).toBe(false);  // 約 4.48
  });

  test('meetsAALarge 以 3:1 為界，且比 meetsAA 寬鬆', () => {
    expect(meetsAALarge('#949494', '#FFFFFF')).toBe(true);
    expect(meetsAA('#949494', '#FFFFFF')).toBe(false);
  });
});

/**
 * 主題色盤的對比度守門。
 *
 * A7 的實情比「淺色主題有兩個色不夠」更廣：淺色主題的 textMuted 對 bgInk
 * 只有 2.88:1、gold 3.20:1，而它們正用在 10–12px 的說明文字與區塊標題上；
 * 深色主題的 textMuted 對 bgDark 也只有 4.42:1。這類缺陷不會有人回報
 * ——畫面「看得到」，只是讀起來吃力——所以只能靠計算守住。
 *
 * 判準取 WCAG AA 內文 4.5:1 而非大字的 3:1：專案的說明文字是 10–13px，
 * 遠低於大字門檻（18pt / 14pt 粗體）。
 */
describe('主題色盤達到 WCAG AA', () => {
  /** 會有文字坐在上面的背景。bgMedium 是作用中的分頁籤底色，最暗 */
  const TEXT_SURFACES = ['bgInk', 'bgDark', 'bgMedium', 'bgCard'] as const;

  /** 會被當成文字色使用的欄位（含 LiuYaoPanel 以 colorFor 取用的三個語意色） */
  const TEXT_COLORS = [
    'textPrimary', 'textSecondary', 'textMuted', 'textGold', 'textRed',
    'success', 'warning', 'danger',
  ] as const;

  for (const [name, theme] of [['墨色', DarkTheme], ['宣紙', LightTheme]] as const) {
    describe(name, () => {
      test.each(TEXT_COLORS)('%s 在每個文字底色上都達 4.5:1', color => {
        const failures = TEXT_SURFACES
          .map(surface => ({ surface, ratio: contrastRatio(theme[color], theme[surface]) }))
          .filter(x => x.ratio < 4.5)
          .map(x => `${x.surface} ${x.ratio.toFixed(2)}:1`);
        expect(failures).toEqual([]);
      });

      /**
       * textInverse 只出現在金色按鈕上（quickDraw／interpretBtn／nextBtn…）。
       * 淺色主題的金是中間調，配宣紙色只有 3.04:1——CTA 的文字反而最難讀。
       */
      test('金色按鈕上的反白文字達 4.5:1', () => {
        expect(contrastRatio(theme.textInverse, theme.gold)).toBeGreaterThanOrEqual(4.5);
      });

      /** gold 退居底色與邊框後只需 3:1（UI 元件邊界的 AA 標準） */
      test('金色作為邊框對頁面底色達 3:1', () => {
        expect(contrastRatio(theme.gold, theme.bgInk)).toBeGreaterThanOrEqual(3);
      });

      /**
       * 三級文字層級必須維持可分辨。只要求「達標」的話，把 muted 一路加深
       * 到與 secondary 同色也會過——那是修好了對比、弄丟了層級。
       */
      test('primary / secondary / muted 的層級沒有塌掉', () => {
        const [p, s, m] = ['textPrimary', 'textSecondary', 'textMuted']
          .map(k => contrastRatio(theme[k as keyof typeof theme] as string, theme.bgInk));
        expect(p).toBeGreaterThan(s);
        expect(s).toBeGreaterThan(m);
        // 相鄰兩級至少差 1.3 倍，否則畫面上分不出主次
        expect(p / s).toBeGreaterThan(1.3);
        expect(s / m).toBeGreaterThan(1.3);
      });
    });
  }
});

/**
 * gold 同時被當文字與底色用，是 A7 的根源：一個色不可能同時滿足
 * 「在淺底上當小字要夠深」與「當按鈕底色要夠亮」。色盤本來就分了
 * gold（裝飾／邊框）與 textGold（文字），這條守住兩者不再混用。
 */
describe('gold 不再被當成文字色', () => {
  const SRC = path.join(__dirname, '..');

  function collectFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        collectFiles(full, acc);
      } else if (entry.name.endsWith('.tsx')) {
        acc.push(full);
      }
    }
    return acc;
  }

  test('沒有任何畫面用 color: theme.gold（應改用 textGold）', () => {
    // 前置的否定環視排除 borderColor／backgroundColor／tintColor；
    // \b 讓 goldLight／goldSoft／goldFaint／goldDark 不被誤判
    const pattern = /(?<![A-Za-z])color:\s*(?:theme|t)\.gold\b/;
    const offenders = collectFiles(SRC)
      .filter(f => pattern.test(fs.readFileSync(f, 'utf-8')))
      .map(f => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
