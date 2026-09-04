// 象棋占卜主題系統
// 水墨棋風色系：墨色、朱砂、金箔、宣紙

export interface ThemeColors {
  // 背景層級
  bgInk: string;        // 最深墨色背景
  bgDark: string;       // 深色背景
  bgMedium: string;     // 中色背景（棋盤木色）
  bgRice: string;       // 宣紙白背景
  bgCard: string;       // 卡片背景
  /**
   * Modal 背後的遮罩。半透明黑，兩個主題各給一個濃度——淺色主題壓 0.6
   * 會讓整頁看起來像關燈，0.45 已足夠把焦點交給對話框。
   *
   * 之所以進主題而不是各元件自己寫死：這是唯一一個「畫面上看得到、
   * 卻沒有 token」的顏色，兩個用到它的元件因此各自躺在 theming 守門的
   * 白名單裡。有了 token，那份白名單就能短兩條。
   */
  scrim: string;        // Modal 遮罩

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

  // 棋盤色（棋盤在明暗主題下都是木色，僅深淺不同）
  boardBg: string;      // 棋盤木色底
  boardLine: string;    // 格線與格點
  boardText: string;    // 楚河漢界文字

  // 半透明強調色（用於選取態、可放置提示等）
  goldSoft: string;     // 金色淡底
  goldFaint: string;    // 金色極淡邊框
}

// 暗色主題（預設：墨色夜色）
export const DarkTheme: ThemeColors = {
  bgInk: '#0D0A08',
  bgDark: '#1A1210',
  bgMedium: '#2A1F18',
  bgRice: '#F5EDE0',
  bgCard: '#231A14',
  scrim: 'rgba(0,0,0,0.6)',

  ink: '#1A1210',
  cinnabar: '#C0392B',
  cinnabarLight: '#E5746A',
  gold: '#C9A96E',
  goldLight: '#E0CDA0',
  goldDark: '#A08040',

  textPrimary: '#F5EDE0',
  textSecondary: '#C9B99A',
  // 舊值 #8A7A60 對 bgDark 僅 4.42:1、對 bgMedium 3.85:1，未達 AA；
  // 提亮到剛好越過 4.5 為止，仍與 textSecondary 有明顯層級差
  textMuted: '#95866E',
  textGold: '#C9A96E',
  textRed: '#E5746A',
  textInverse: '#1A1210',

  success: '#6B9B6B',
  warning: '#C9A040',
  // 深底上的 #C0392B 只有 3.39:1。改用既有的朱砂亮色（textRed 同值），
  // 不另外發明一個紅——同一套朱砂在深色主題本來就該用亮的那一階
  danger: '#E5746A',

  pieceRed: '#C0392B',
  pieceBlack: '#2A1F18',
  pieceBorder: '#C9A96E',
  pieceBg: '#F5EDE0',

  boardBg: '#B8873C',
  boardLine: '#5A3E0E',
  boardText: '#2A1F18',

  goldSoft: 'rgba(201, 169, 110, 0.15)',
  goldFaint: 'rgba(201, 169, 110, 0.5)',
};

// 亮色主題（宣紙白日）
export const LightTheme: ThemeColors = {
  bgInk: '#F5EDE0',
  bgDark: '#EDE0D0',
  bgMedium: '#D4C4A8',
  bgRice: '#FFFDF7',
  bgCard: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.45)',

  ink: '#1A1210',
  cinnabar: '#C0392B',
  cinnabarLight: '#D4655B',
  gold: '#A08040',
  goldLight: '#C9A96E',
  goldDark: '#8A6830',

  // 淺色主題的文字色一律以「最暗的文字底色」bgMedium（作用中的分頁籤）
  // 為準達到 AA 4.5:1。舊值多半只顧到 bgInk：textMuted 2.88:1、
  // gold 3.20:1，而這兩色正用在 10–12px 的說明文字與區塊標題上。
  textPrimary: '#1A1210',
  // 一併加深，讓 primary > secondary > muted 的層級在加深 muted 後不塌掉
  textSecondary: '#4A3B2A',
  textMuted: '#5A5045',
  textGold: '#654C20',
  textRed: '#962C22',
  // 反白文字只出現在金色按鈕上（quickDraw／interpretBtn／nextBtn 等）。
  // 淺色主題的金是中間調，配宣紙色只有 3.04:1；按鈕文字改用墨色才讀得清楚
  textInverse: '#1A1A1A',

  success: '#3B5A3B',
  warning: '#63501E',
  danger: '#962C22',

  pieceRed: '#C0392B',
  pieceBlack: '#1A1210',
  pieceBorder: '#A08040',
  pieceBg: '#F5EDE0',

  boardBg: '#E3C48A',
  boardLine: '#8B6914',
  boardText: '#1A1210',

  goldSoft: 'rgba(160, 128, 64, 0.15)',
  goldFaint: 'rgba(160, 128, 64, 0.5)',
};

export type ThemeMode = 'dark' | 'light' | 'system';

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? DarkTheme : LightTheme;
}

/**
 * 分享圖卡專用色盤。
 *
 * 圖卡是匯出成圖片對外分享的成品，不是應用程式介面，
 * 因此刻意固定為深墨金箔的品牌樣式，不隨使用者的明暗主題改變——
 * 否則同一張分享卡在不同使用者手上會長得不一樣。
 */
export const ShareCardPalette = {
  paper: '#F5EDE0',
  paperDeep: '#EDE5D5',
  white: '#FFFFFF',
  gold: '#8B6914',
  goldLight: '#C9A96E',
  ink: '#1A1210',
  inkMuted: '#8A7A60',
  border: '#D4C4A8',
  red: '#C0392B',
  onLevel: '#FFFFFF',
} as const;

/**
 * 紙面色盤。
 *
 * 籤詩卷軸這類模擬實體紙張的元素，在明暗主題下都應維持紙色與墨字——
 * 若讓紙面跟著暗色主題變黑，「宣紙捲軸」的意象就不成立了。
 * 深色主題下呈現為暗底上的一卷淺色紙，正是預期的視覺效果。
 */
export const PaperSurface = {
  paper: '#F5EDE0',
  ink: '#1A1210',
  inkMuted: '#5A4A38',
  border: '#D4C4A8',
  gold: '#8B6914',
  wood: '#8B6914',
  woodDark: '#6B4F10',
  woodDeep: '#5A3E0E',
  red: '#C0392B',
  onLevel: '#FFFFFF',
} as const;

/** 分享卡上的吉凶等級底色 */
export const ShareCardLevelColors: Record<string, string> = {
  '大吉': '#C9A96E',
  '上吉': '#E5746A',
  '中吉': '#6B9B6B',
  '中平': '#8A8060',
  '下下': '#666666',
};

/**
 * 吉凶等級色。
 * 屬於語意化的資料色盤（同一等級在何處都該是同一個顏色），
 * 目前不隨明暗主題改變。
 */
export const LevelColors: Record<string, string> = {
  '大吉': '#C9A96E', // 金色
  '上吉': '#E5746A', // 朱砂
  '中吉': '#8AB87A', // 翠綠
  '中平': '#C9B99A', // 米黃
  '下下': '#8A7A60', // 灰褐
};

export const DEFAULT_LEVEL_COLOR = '#C9B99A';

/**
 * 疊在色塊上的前景色二選一（見 services/contrast.ts 的 readableTextOn）。
 *
 * 深色不用純黑——水墨定位下純黑太硬。色值放在這裡而非 contrast.ts：
 * 這個檔案是專案唯一的色盤定義處，守門測試也是照這條線畫的。
 */
export const OnSurface = {
  ink: '#1A1A1A',
  paper: '#FFFFFF',
  /**
   * 純黑，只在柔化的墨色達不到 AA 時作為保底。
   * 中間調的底色（如「下下」的灰褐）對 ink 與 paper 兩者都不足 4.5:1，
   * 唯有純黑補得上這個缺口——見 services/contrast.ts。
   */
  inkPure: '#000000',
} as const;

/** 資料夾標籤的分類色盤 */
export const FolderColors = [
  '#C9A96E', '#E5746A', '#6B9B6B', '#6B9BC6', '#C69BC6', '#C6A06B',
] as const;

/** 立體元素的高光。純白半透明，與主題無關（打光不會因為換佈景而變色） */
export const Highlight = {
  strong: 'rgba(255, 255, 255, 0.15)',
  soft: 'rgba(255, 255, 255, 0.1)',
} as const;

/**
 * 錯誤邊界的後備色盤。
 * ErrorBoundary 是 class component 且可能在 ThemeProvider 崩潰時才被觸發，
 * 無法依賴主題 context，故使用固定色。
 */
export const FallbackPalette = {
  bg: '#0D0A08',
  card: '#1A1210',
  border: '#3A2F25',
  gold: '#C9A96E',
  text: '#F5EDE0',
  textMuted: '#8A7A60',
} as const;

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

export const Duration = {
  fast: 200,
  normal: 400,
  slow: 700,
  reveal: 900,
} as const;

// ====== 版面 ======

export const Layout = {
  /**
   * 內容最大寬度。
   * 沒有上限時，卡片在平板與桌面瀏覽器會被撐成整個視窗寬，
   * 出現超長行寬而難以閱讀（本 App 已部署為 Web PWA）。
   */
  maxContent: 560,
  /**
   * 卡片網格的最大寬度。
   * 比 maxContent 寬——多欄佈局若沿用 560px，每欄只剩約 270px，
   * 反而比單欄更難讀。放寬後每欄約落在 440–520px 的可讀區間。
   */
  maxGrid: 1080,
  /** 進入寬螢幕版面的斷點 */
  tablet: 768,
  desktop: 1024,
  /**
   * 閱讀型畫面進入「主欄＋側欄」的斷點。
   *
   * 比 desktop 高是刻意的：雙欄要成立，主欄得先保住可讀行寬
   * （不能低於 maxContent 太多），側欄才有意義。1024px 扣掉側欄與間距後
   * 主欄只剩約 620px 但左右邊距會被壓到極限，1160 起才有餘裕。
   * 低於此值一律維持單欄——寬度不夠時單欄長捲軸仍優於兩條窄柱。
   */
  split: 1160,
  /** 側欄寬度。放得下六爻盤與卦名，又不至於搶走主欄的行寬 */
  railWidth: 340,
  /** 雙欄時主欄的寬度上限，避免超寬螢幕上行寬失控 */
  maxSplitMain: 680,
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
