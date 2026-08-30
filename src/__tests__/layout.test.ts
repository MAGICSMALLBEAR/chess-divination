// 響應式版面測試
// 測的是 computeLayout 純函式——斷點與寬度計算的全部邏輯都在其中，
// useLayout hook 僅負責接上 useWindowDimensions，無需模擬 RN 模組。

import {
  computeLayout, computeBoardTray, trayWidthForColumns, BOARD_TRAY,
} from '../hooks/useLayout';
import { Layout, Spacing } from '../constants/theme';

/** 以指定視窗寬度取得版面資訊 */
function layoutAt(width: number, height = 844) {
  return computeLayout(width, height);
}

describe('斷點判定', () => {
  test('手機寬度為單欄', () => {
    const l = layoutAt(390);
    expect(l.isWide).toBe(false);
    expect(l.isDesktop).toBe(false);
    expect(l.columns).toBe(1);
  });

  test('平板斷點（768）進入雙欄', () => {
    const l = layoutAt(Layout.tablet);
    expect(l.isWide).toBe(true);
    expect(l.isDesktop).toBe(false);
    expect(l.columns).toBe(2);
  });

  test('平板斷點前一像素仍為單欄', () => {
    expect(layoutAt(Layout.tablet - 1).columns).toBe(1);
  });

  test('桌面斷點（1024）進入三欄', () => {
    const l = layoutAt(Layout.desktop);
    expect(l.isWide).toBe(true);
    expect(l.isDesktop).toBe(true);
    expect(l.columns).toBe(3);
  });

  test('桌面斷點前一像素為雙欄', () => {
    expect(layoutAt(Layout.desktop - 1).columns).toBe(2);
  });

  test('超寬螢幕維持三欄，不無限增加', () => {
    expect(layoutAt(2560).columns).toBe(3);
  });
});

describe('contentWidth 限寬', () => {
  test('窄螢幕扣除左右邊距', () => {
    const l = layoutAt(390);
    expect(l.contentWidth).toBe(390 - Spacing.xl * 2);
  });

  /** 迴歸：無上限時卡片會被撐成整個視窗寬，出現超長行寬 */
  test('寬螢幕受 maxContent 上限約束', () => {
    expect(layoutAt(1920).contentWidth).toBe(Layout.maxContent);
    expect(layoutAt(2560).contentWidth).toBe(Layout.maxContent);
  });

  test('contentWidth 永不超過 maxContent', () => {
    for (const w of [320, 390, 768, 1024, 1440, 1920]) {
      expect(layoutAt(w).contentWidth).toBeLessThanOrEqual(Layout.maxContent);
    }
  });
});

describe('網格寬度計算', () => {
  test('單欄時 gridWidth 等同 contentWidth', () => {
    const l = layoutAt(390);
    expect(l.gridWidth).toBe(l.contentWidth);
  });

  test('單欄時 cardWidth 等同 gridWidth（無欄間距）', () => {
    const l = layoutAt(390);
    expect(l.cardWidth).toBe(l.gridWidth);
  });

  /**
   * 多欄若沿用 maxContent(560)，每欄只剩約 270px，反而比單欄更難讀。
   * gridWidth 改用較寬的 maxGrid，確保每欄仍有可讀行寬。
   */
  test('多欄時 gridWidth 放寬至 maxGrid 上限', () => {
    const l = layoutAt(1920);
    expect(l.gridWidth).toBe(Layout.maxGrid);
    expect(l.gridWidth).toBeGreaterThan(Layout.maxContent);
  });

  test('雙欄時每張卡片仍有足夠閱讀寬度', () => {
    const l = layoutAt(Layout.tablet);
    expect(l.columns).toBe(2);
    // 不應退化成兩個過窄的欄位
    expect(l.cardWidth).toBeGreaterThan(300);
  });

  test('三欄時每張卡片仍有足夠閱讀寬度', () => {
    const l = layoutAt(1920);
    expect(l.columns).toBe(3);
    expect(l.cardWidth).toBeGreaterThan(300);
  });

  test('卡片寬度加上欄間距應等於容器寬度', () => {
    for (const w of [390, 768, 1024, 1440, 1920]) {
      const l = layoutAt(w);
      const total = l.cardWidth * l.columns + Spacing.sm * (l.columns - 1);
      expect(total).toBeCloseTo(l.gridWidth, 5);
    }
  });

  test('cardWidth 恆為正數', () => {
    for (const w of [320, 390, 768, 1024, 1920, 2560]) {
      expect(layoutAt(w).cardWidth).toBeGreaterThan(0);
    }
  });
});

/**
 * 迴歸：Expo 靜態匯出的 Web 版 hydration 後 useWindowDimensions 持續回傳 0，
 * 直接扣掉左右邊距會得到 -64px。RN Web 會忽略負寬度，讓元素退回滿版拉伸——
 * 「內容限寬 560px」在已部署的 PWA 上因此從未生效，且不會有任何錯誤訊息。
 */
describe('無效視窗尺寸的防護', () => {
  test('寬度為 0 時不產生負的 contentWidth', () => {
    const l = layoutAt(0);
    expect(l.contentWidth).toBeGreaterThan(0);
  });

  test('寬度為 0 時不產生負的 gridWidth 與 cardWidth', () => {
    const l = layoutAt(0);
    expect(l.gridWidth).toBeGreaterThan(0);
    expect(l.cardWidth).toBeGreaterThan(0);
  });

  test('寬度為 0 時退回單欄，而非誤判為寬螢幕', () => {
    const l = layoutAt(0);
    expect(l.columns).toBe(1);
    expect(l.isWide).toBe(false);
  });

  test('負寬度同樣被夾到下限', () => {
    const l = layoutAt(-100);
    expect(l.contentWidth).toBeGreaterThan(0);
    expect(l.cardWidth).toBeGreaterThan(0);
  });

  test('任何輸入寬度都不會產生負值', () => {
    for (const w of [-500, -1, 0, 1, 100, 319, 320, 390, 768, 1024, 1920]) {
      const l = layoutAt(w);
      // 以物件一次斷言，失敗訊息會直接顯示是哪個寬度出問題
      expect({ w, ok: l.contentWidth > 0 && l.gridWidth > 0 && l.cardWidth > 0 })
        .toEqual({ w, ok: true });
    }
  });
});

describe('尺寸透傳', () => {
  test('回傳當前視窗寬高', () => {
    const l = layoutAt(1024, 768);
    expect(l.width).toBe(1024);
    expect(l.height).toBe(768);
  });

  /** 迴歸：舊版在模組載入時取一次 Dimensions，旋轉後不重算 */
  test('視窗尺寸改變後版面隨之更新', () => {
    const portrait = layoutAt(390, 844);
    expect(portrait.columns).toBe(1);

    const landscape = layoutAt(844, 390);
    expect(landscape.columns).toBe(2);
    expect(landscape.width).toBe(844);
  });
});

describe('閱讀型雙欄版面（split）', () => {
  test('手機與平板維持單欄', () => {
    expect(layoutAt(390).split).toBeNull();
    expect(layoutAt(768).split).toBeNull();
    expect(layoutAt(1024).split).toBeNull();
  });

  /**
   * 斷點刻意高於 desktop(1024)。1024 若分欄，主欄扣掉側欄與間距後
   * 會壓在可讀行寬的下緣，兩欄都不好讀——寬度不夠時單欄長捲軸較佳。
   */
  test('split 斷點前一像素仍為單欄', () => {
    expect(layoutAt(Layout.split - 1).split).toBeNull();
  });

  test('達到 split 斷點後分欄', () => {
    const l = layoutAt(Layout.split);
    expect(l.split).not.toBeNull();
    expect(l.split!.railWidth).toBe(Layout.railWidth);
  });

  test('主欄不低於一般閱讀寬度', () => {
    for (const w of [Layout.split, 1280, 1440, 1920, 2560]) {
      const l = layoutAt(w);
      expect(`${w}: ${l.split!.mainWidth >= Layout.maxContent}`).toBe(`${w}: true`);
    }
  });

  test('主欄受上限約束，超寬螢幕不無限拉長行寬', () => {
    expect(layoutAt(2560).split!.mainWidth).toBe(Layout.maxSplitMain);
    expect(layoutAt(3840).split!.mainWidth).toBe(Layout.maxSplitMain);
  });

  /** 側欄裝的是尺寸大致固定的六爻盤，跟著視窗長大只會產生更多空白 */
  test('側欄寬度固定，不隨視窗變動', () => {
    const widths = [Layout.split, 1440, 1920, 3840].map(w => layoutAt(w).split!.railWidth);
    expect(new Set(widths).size).toBe(1);
  });

  test('兩欄加間距後仍放得進視窗', () => {
    for (const w of [Layout.split, 1280, 1440]) {
      const l = layoutAt(w);
      const used = l.split!.mainWidth + Spacing.xl + l.split!.railWidth;
      expect(`${w}: ${used <= w - Spacing.xl * 2}`).toBe(`${w}: true`);
    }
  });

  /**
   * split 與 columns 是兩套獨立規則：後者給同質卡片網格（圖鑑、收藏），
   * 前者給異質的閱讀版面。混用會讓籤詩被切成跟六爻盤一樣寬的窄柱。
   */
  test('split 與網格欄數互不影響', () => {
    const l = layoutAt(1024);
    expect(l.columns).toBe(3);      // 網格已是三欄
    expect(l.split).toBeNull();     // 閱讀版面仍單欄
  });
});

/**
 * 棋盤頁的棋子池位置。
 *
 * 測的是幾何而非外觀：池子側置只有在「棋盤仍放得下、池子也放得下」時才成立，
 * 而這兩件事都是寬度算術。真正排出來對不對要靠 e2e 量幾何（見 splitReading.spec）。
 */
describe('棋盤棋子池版面', () => {
  const MAX_CELL = 56;
  /** 棋盤實際佔用寬度 = 9 條縱線 × 格距 */
  const boardW = (cell: number) => cell * 9;

  test('尚未量測到寬度時給得出可用的預設值', () => {
    const b = computeBoardTray(0, MAX_CELL);
    expect(b.trayPosition).toBe('below');
    expect(b.cellSize).toBe(32);
  });

  test('窄螢幕棋子池排在棋盤下方', () => {
    for (const w of [390, 560, 719]) {
      expect(computeBoardTray(w, MAX_CELL).trayPosition).toBe('below');
    }
  });

  test('達門檻後棋子池移到棋盤右側', () => {
    for (const w of [BOARD_TRAY.minWidth, 800, 1024]) {
      expect(computeBoardTray(w, MAX_CELL).trayPosition).toBe('side');
    }
  });

  /** 側置的意義在於少走視線，若代價是棋盤縮水就不划算 */
  test('側置不會把棋盤壓得比排在下方時更小', () => {
    for (const w of [BOARD_TRAY.minWidth, 800, 1024, 1440]) {
      const side = computeBoardTray(w, MAX_CELL);
      // 同寬度下排在下方會拿到的格距（不必扣掉池寬）
      const below = Math.min(MAX_CELL, Math.max(28, (w - 32) / 9));
      expect(`${w}: ${side.cellSize >= below}`).toBe(`${w}: true`);
    }
  });

  test('棋盤加間距加棋子池仍放得進容器', () => {
    for (const w of [BOARD_TRAY.minWidth, 760, 800, 1024, 1440]) {
      const b = computeBoardTray(w, MAX_CELL);
      const used = boardW(b.cellSize) + BOARD_TRAY.gap + b.trayWidth;
      expect(`${w}: ${used <= w}`).toBe(`${w}: true`);
    }
  });

  /** 欄寬只能是 3 或 4 欄——2 欄比棋盤還高、5 欄比棋盤還寬，都失去側置的意義 */
  test('棋子池維持三到四欄', () => {
    for (const w of [BOARD_TRAY.minWidth, 800, 1440, 2560]) {
      const { trayWidth } = computeBoardTray(w, MAX_CELL);
      expect(trayWidth).toBeGreaterThanOrEqual(trayWidthForColumns(3));
      expect(trayWidth).toBeLessThanOrEqual(trayWidthForColumns(4));
    }
  });

  /** 超寬螢幕上多出來的空間不該灌進池子——棋子散開反而要多掃一次視線 */
  test('池寬不隨視窗無限長大', () => {
    expect(computeBoardTray(3840, MAX_CELL).trayWidth)
      .toBe(computeBoardTray(1440, MAX_CELL).trayWidth);
  });

  /** 全螢幕用較大的格距上限與較窄的留白，同一套規則要能套用 */
  test('全螢幕參數下棋盤吃滿格距上限且池子側置', () => {
    const b = computeBoardTray(1440, 68, 16);
    expect(b.trayPosition).toBe('side');
    expect(b.cellSize).toBe(68);
    expect(boardW(68) + BOARD_TRAY.gap + b.trayWidth).toBeLessThanOrEqual(1440);
  });
});
