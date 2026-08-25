// 色彩對比計算（WCAG 2.1）
//
// 為什麼需要這個：專案有兩套語意色盤（LevelColors 吉凶等級、主題色），
// 而前景色一直是人工挑的固定值——例如吉凶標籤一律用白字。金色底
// （大吉 #C9A96E）與米黃底（中平 #C9B99A）的亮度差了一截，同一個白字
// 在前者勉強可讀、在後者只有約 1.9:1，遠低於 AA 的 4.5:1。
//
// 有了可計算的對比度，前景色就能由底色推得，而不是每加一個底色就
// 重挑一次白或黑（然後漏掉）。守門測試也才有辦法檢查。

import { OnSurface } from '@/constants/theme';

/** #RGB / #RRGGBB → [r, g, b]，各 0–255。不合法的輸入回傳 null */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let body = m[1];
  // #abc 是 #aabbcc 的簡寫，展開後再切
  if (body.length === 3) body = body.split('').map(c => c + c).join('');
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
}

/**
 * 相對亮度（WCAG 2.1 定義）。
 *
 * 不是單純的 (r+g+b)/3——人眼對綠最敏感、對藍最不敏感，
 * 且 sRGB 的通道值是經過 gamma 編碼的，必須先線性化才能加權。
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 兩色的對比度，1（相同）到 21（純黑對純白）。
 *
 * 參考值：AA 內文 4.5:1、AA 大字（18pt 以上或 14pt 粗體）3:1、AAA 內文 7:1。
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 深色前景（用於淺底）與淺色前景（用於深底）。色值定義在色盤那一側 */
const { ink: INK_ON_LIGHT, paper: PAPER_ON_DARK, inkPure: PURE_INK } = OnSurface;
export { INK_ON_LIGHT, PAPER_ON_DARK, PURE_INK };

/**
 * 挑一個在指定底色上讀得清楚的前景色，保證至少 4.5:1（AA 內文）。
 *
 * 只在深與淺兩者間二選一，不產生中間色：結果可預測，也不會讓畫面
 * 冒出一堆半調子的顏色。
 *
 * 為什麼需要 PURE_INK 這層保底：專案的墨色是柔化過的 #1A1A1A 而非純黑，
 * 亮度約 0.010 而不是 0。這使得亮度落在約 0.183–0.222 的中間調底色
 * 對白字與對墨字**兩邊都不到 4.5:1**——「下下」的灰褐（亮度約 0.201）
 * 正好卡在這個缺口裡。純黑（亮度 0）才補得上：對黑達標的下界是 0.175，
 * 對白達標的上界是 0.183，兩者相接，中間沒有洞。
 *
 * 也就是說常見的深底／淺底仍拿到柔化的墨或紙色，只有真正卡在中間的
 * 底色才會退到純黑——美術上的讓步只發生在非讓不可的地方。
 */
export function readableTextOn(background: string): string {
  const best = contrastRatio(background, PAPER_ON_DARK) >= contrastRatio(background, INK_ON_LIGHT)
    ? PAPER_ON_DARK
    : INK_ON_LIGHT;
  if (meetsAA(best, background)) return best;

  return contrastRatio(background, PAPER_ON_DARK) >= contrastRatio(background, PURE_INK)
    ? PAPER_ON_DARK
    : PURE_INK;
}

/** 是否達到 WCAG AA 的內文標準（4.5:1） */
export function meetsAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 4.5;
}

/** 是否達到 WCAG AA 的大字標準（3:1），也適用於圖形與 UI 元件邊界 */
export function meetsAALarge(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 3;
}
