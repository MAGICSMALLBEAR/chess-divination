// contrast.ts 測試
//
// 這個模組的存在是為了讓「這個字讀得清楚嗎」變成可計算、可守門的事，
// 所以測試的重點有二：算出來的數字對不對（拿 WCAG 的已知值校準），
// 以及 readableTextOn 是否真的保證了它宣稱的下限。

import {
  parseHex, relativeLuminance, contrastRatio, readableTextOn,
  meetsAA, meetsAALarge, INK_ON_LIGHT, PAPER_ON_DARK, PURE_INK,
} from '../services/contrast';
import { LevelColors, DEFAULT_LEVEL_COLOR } from '../constants/theme';

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
