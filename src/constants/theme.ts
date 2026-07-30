// 象棋占卜主題系統
// 水墨棋風色系：墨色、朱砂、金箔、宣紙

export interface ThemeColors {
  // 背景層級
  bgInk: string;        // 最深墨色背景
  bgDark: string;       // 深色背景
  bgMedium: string;     // 中色背景（棋盤木色）
  bgRice: string;       // 宣紙白背景
  bgCard: string;       // 卡片背景

  // 主色系
  ink: string;          // 墨色（主文字/邊框）
  cinnabar: string;     // 朱砂紅（紅色棋子/重點）
  cinnabarLight: string;// 淺朱砂
  gold: string;         // 金箔色（金色棋子/重點）
  goldLight: string;    // 淡金色
  goldDark: string;     // 暗金色

  // 文字色
  textPrimary: string;  // 主要文字
  textSecondary: string;// 次要文字
  textMuted: string;    // 淡文字
  textGold: string;     // 金色文字
  textRed: string;      // 紅色文字
  textInverse: string;  // 反白文字

  // 狀態色
  success: string;
  warning: string;
  danger: string;

  // 棋子色
  pieceRed: string;     // 紅方棋子色
  pieceBlack: string;   // 黑方棋子色
  pieceBorder: string;  // 棋子邊框
  pieceBg: string;      // 棋子底色
}

// 暗色主題（預設：墨色夜色）
export const DarkTheme: ThemeColors = {
  bgInk: '#0D0A08',
  bgDark: '#1A1210',
  bgMedium: '#2A1F18',
  bgRice: '#F5EDE0',
  bgCard: '#231A14',

  ink: '#1A1210',
  cinnabar: '#C0392B',
  cinnabarLight: '#E5746A',
  gold: '#C9A96E',
  goldLight: '#E0CDA0',
  goldDark: '#A08040',

  textPrimary: '#F5EDE0',
  textSecondary: '#C9B99A',
  textMuted: '#8A7A60',
  textGold: '#C9A96E',
  textRed: '#E5746A',
  textInverse: '#1A1210',

  success: '#6B9B6B',
  warning: '#C9A040',
  danger: '#C0392B',

  pieceRed: '#C0392B',
  pieceBlack: '#2A1F18',
  pieceBorder: '#C9A96E',
  pieceBg: '#F5EDE0',
};

// 亮色主題（宣紙白日）
export const LightTheme: ThemeColors = {
  bgInk: '#F5EDE0',
  bgDark: '#EDE0D0',
  bgMedium: '#D4C4A8',
  bgRice: '#FFFDF7',
  bgCard: '#FFFFFF',

  ink: '#1A1210',
  cinnabar: '#C0392B',
  cinnabarLight: '#D4655B',
  gold: '#A08040',
  goldLight: '#C9A96E',
  goldDark: '#8A6830',

  textPrimary: '#1A1210',
  textSecondary: '#5A4A38',
  textMuted: '#9A8A78',
  textGold: '#8A6830',
  textRed: '#C0392B',
  textInverse: '#F5EDE0',

  success: '#5A8A5A',
  warning: '#A08030',
  danger: '#C0392B',

  pieceRed: '#C0392B',
  pieceBlack: '#1A1210',
  pieceBorder: '#A08040',
  pieceBg: '#F5EDE0',
};

export type ThemeMode = 'dark' | 'light' | 'system';

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? DarkTheme : LightTheme;
}

// ====== 設計 Token ======

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 36,
  cardGap: 12,
  listGap: 10,
} as const;

export const FontSize = {
  hero: 32,
  title: 28,
  subtitle: 22,
  heading: 20,
  body: 16,
  small: 14,
  poem: 20,
  caption: 12,
  overline: 10,
} as const;

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const Duration = {
  fast: 200,
  normal: 400,
  slow: 700,
  reveal: 900,
} as const;

// ====== 棋盤尺寸 ======

export const BOARD = {
  cols: 9,           // 9 條縱線
  rows: 10,          // 10 條橫線
  riverRow: 5,       // 楚河漢界在第 5 行之後
  pieceSize: 42,     // 棋子直徑
  cellSize: 48,      // 格子大小
  padding: 20,       // 棋盤邊距
} as const;
