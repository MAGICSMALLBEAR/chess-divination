// 兩個占卜模式狀態機 Hook 的測試。
// AsyncStorage 以記憶體 Map 模擬；expo-router 只需記錄導航參數。

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// 音效與觸覺在測試環境沒有裝置可用，且與狀態機邏輯無關
jest.mock('@/services/sound', () => ({ playPlacePieceSound: jest.fn() }));
jest.mock('@/services/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('@/services/notifications', () => ({ scheduleVerificationReminder: jest.fn() }));
// 儲存失敗時要「講一聲」而不是靜靜卡住，所以 notify 必須看得見
const mockNotify = jest.fn();
jest.mock('@/services/dialog', () => ({ notify: (...args: unknown[]) => mockNotify(...args) }));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDrawDivination } from '../hooks/useDrawDivination';
import { useBoardDivination } from '../hooks/useBoardDivination';
import { ALL_PIECES } from '../data/pieces';
import { getHistory } from '../services/storage';
import { playPlacePieceSound } from '../services/sound';

/**
 * 極簡 renderHook。專案未安裝 @testing-library/react-native，
 * 以 react-test-renderer driver 一個只呼叫 hook 的空元件即可。
 */
function renderHook<T>(useHook: () => T) {
  const ref: { current: T } = { current: undefined as unknown as T };
  function Probe() {
    ref.current = useHook();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Probe />); });
  return { result: ref, unmount: () => act(() => { renderer.unmount(); }) };
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('useDrawDivination', () => {
  test('初始狀態停在選擇數量，尚無抽取結果', () => {
    const { result } = renderHook(() => useDrawDivination());

    expect(result.current.step).toBe('select-count');
    expect(result.current.drawnPieces).toEqual([]);
    expect(result.current.selectedPoem).toBeNull();
    expect(result.current.hexagram).toBeNull();
    expect(result.current.questionCategory).toBe('general');
  });

  test.each([1, 2, 3] as const)('startDrawing(%i) 抽出對應數量的棋子', count => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(count); });

    expect(result.current.step).toBe('drawing');
    expect(result.current.drawnPieces).toHaveLength(count);
    expect(result.current.pieceCount).toBe(count);
  });

  test('抽棋後籤詩與卦象一致（poem.id 對應 hexagram.poemId）', () => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(2); });

    expect(result.current.hexagram).not.toBeNull();
    expect(result.current.selectedPoem).not.toBeNull();
    expect(result.current.selectedPoem!.id).toBe(result.current.hexagram!.poemId);
    expect(result.current.selectedPoem!.hexagramName).toBe(result.current.hexagram!.name);
  });

  test('抽棋後產生非空摘要', () => {
    const { result } = renderHook(() => useDrawDivination());
    act(() => { result.current.startDrawing(2); });
    expect(result.current.drawSummary.length).toBeGreaterThan(0);
  });

  test('帶入的問事類別與內容會被保留', () => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(2, 'career', '該換工作嗎'); });

    expect(result.current.questionCategory).toBe('career');
    expect(result.current.questionText).toBe('該換工作嗎');
  });

  /** 使用者清空輸入框後再抽，空字串必須覆蓋掉前一次的內容 */
  test('空字串的問事內容會覆蓋前次輸入', () => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(2, 'love', '會復合嗎'); });
    act(() => { result.current.startDrawing(2, 'love', ''); });

    expect(result.current.questionText).toBe('');
  });

  test('未帶類別時沿用既有類別，不被重設為 general', () => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(2, 'wealth', '財運如何'); });
    act(() => { result.current.startDrawing(1); });

    expect(result.current.questionCategory).toBe('wealth');
  });

  describe('goToResult', () => {
    test('尚未抽棋時不儲存也不導航', async () => {
      const { result } = renderHook(() => useDrawDivination());

      await act(async () => { await result.current.goToResult(); });

      expect(mockPush).not.toHaveBeenCalled();
      await expect(getHistory()).resolves.toEqual([]);
    });

    test('抽棋後寫入歷史並帶著記錄 ID 導向結果頁', async () => {
      const { result } = renderHook(() => useDrawDivination());

      act(() => { result.current.startDrawing(2, 'career', '前景如何'); });
      await act(async () => { await result.current.goToResult(); });

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].mode).toBe('draw');
      expect(history[0].questionCategory).toBe('career');
      expect(history[0].questionText).toBe('前景如何');

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/reveal',
        params: { recordId: history[0].id, mode: 'draw' },
      });
      // 迴歸：導航後立刻重設——修復前返回會卡在「正在為您解讀…」
      expect(result.current.step).toBe('select-count');
      expect(result.current.drawnPieces).toEqual([]);
    });

    /**
     * 迴歸：`await addHistory(record)` 原本沒有 catch。AsyncStorage 寫入
     * 失敗（空間滿、儲存損毀）時是 unhandled rejection，而畫面上的表現是
     * 永遠停在「正在為您解讀…」——使用者只能殺掉 App。
     */
    test('儲存失敗時不會卡在解讀中，且會告知使用者', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('QuotaExceeded'));

      const { result } = renderHook(() => useDrawDivination());
      act(() => { result.current.startDrawing(2); });
      await act(async () => { await result.current.goToResult(); });

      // 沒有卡在中途的狀態，退回選擇畫面讓使用者能再試一次
      expect(result.current.step).toBe('select-count');
      expect(mockNotify).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test('儲存失敗後仍可再次抽棋，不會被 in-flight 旗標鎖住', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('QuotaExceeded'));

      const { result } = renderHook(() => useDrawDivination());
      act(() => { result.current.startDrawing(2); });
      await act(async () => { await result.current.goToResult(); });

      // 第二次不再失敗，應該正常存進去
      act(() => { result.current.startDrawing(2); });
      await act(async () => { await result.current.goToResult(); });

      await expect(getHistory()).resolves.toHaveLength(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    /** 六爻資料若沒存下來，reveal 頁會退回只顯示本卦 */
    test('歷史記錄含六爻所需的卦象資料', async () => {
      const { result } = renderHook(() => useDrawDivination());

      act(() => { result.current.startDrawing(3); });
      await act(async () => { await result.current.goToResult(); });

      const [record] = await getHistory();
      expect(record.hexagramName).toBeTruthy();
      expect(typeof record.hexagramIndex).toBe('number');
      expect(typeof record.movingLine).toBe('number');
      expect(typeof record.hourBranch).toBe('number');
    });
  });

  test('reset 清空結果並回到選擇數量', () => {
    const { result } = renderHook(() => useDrawDivination());

    act(() => { result.current.startDrawing(2); });
    act(() => { result.current.reset(); });

    expect(result.current.step).toBe('select-count');
    expect(result.current.drawnPieces).toEqual([]);
    expect(result.current.selectedPoem).toBeNull();
    expect(result.current.hexagram).toBeNull();
    expect(result.current.drawSummary).toBe('');
  });
});

describe('useBoardDivination', () => {
  const [pieceA, pieceB, pieceC, pieceD] = ALL_PIECES;

  test('初始狀態停在選擇棋子', () => {
    const { result } = renderHook(() => useBoardDivination());

    expect(result.current.step).toBe('select-pieces');
    expect(result.current.placedPieces).toEqual([]);
    expect(result.current.selectedPiece).toBeNull();
    expect(result.current.maxPieces).toBe(3);
    expect(result.current.availablePieces.length).toBe(ALL_PIECES.length);
  });

  describe('選子與落子', () => {
    test('選子後可放置到指定格位', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      expect(result.current.selectedPiece).toBe(pieceA);

      act(() => { result.current.placePieceOnBoard(4, 5); });

      expect(result.current.placedPieces).toEqual([{ piece: pieceA, col: 4, row: 5 }]);
      // 放完即清空選取，避免使用者誤連放兩顆
      expect(result.current.selectedPiece).toBeNull();
      expect(playPlacePieceSound).toHaveBeenCalledTimes(1);
    });

    test('未選子時點擊棋盤不放置', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.placePieceOnBoard(4, 5); });

      expect(result.current.placedPieces).toEqual([]);
      expect(playPlacePieceSound).not.toHaveBeenCalled();
    });

    test('同一格已有棋子時不重複放置', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(4, 5); });
      act(() => { result.current.selectPiece(pieceB); });
      act(() => { result.current.placePieceOnBoard(4, 5); });

      expect(result.current.placedPieces).toHaveLength(1);
      expect(result.current.placedPieces[0].piece).toBe(pieceA);
    });

    /**
     * 拖曳落子沒有「先選取」這個中間步驟，被拖的那顆就是要放的那顆。
     * 少了第三個參數時這裡會在 `!selectedPiece` 就 return——畫面上的表現是
     * 拖了一顆棋過去卻毫無反應，看起來像拖曳功能根本不存在。
     */
    test('未先選取時，帶著棋子呼叫仍能落子', () => {
      const { result } = renderHook(() => useBoardDivination());

      expect(result.current.selectedPiece).toBeNull();
      act(() => { result.current.placePieceOnBoard(4, 4, pieceB); });

      expect(result.current.placedPieces).toHaveLength(1);
      expect(result.current.placedPieces[0].piece).toBe(pieceB);
      expect(result.current.placedPieces[0]).toMatchObject({ col: 4, row: 4 });
    });

    /** 已選 A 又拖 B：落下的必須是 B，不是沿用 selectedPiece 的 A */
    test('帶著棋子呼叫時不沿用已選取的另一顆', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(4, 4, pieceB); });

      expect(result.current.placedPieces).toHaveLength(1);
      expect(result.current.placedPieces[0].piece).toBe(pieceB);
      // 落子後選取一律清空，避免殘留的 A 影響下一次點擊落子
      expect(result.current.selectedPiece).toBeNull();
    });

    test('同一顆棋子不可重複選取', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(0, 0); });
      act(() => { result.current.selectPiece(pieceA); });

      expect(result.current.selectedPiece).toBeNull();
    });

    /**
     * 「允許重複棋子」解掉的是一個命理上的死角：實體棋盤沒有兩顆帥，
     * 但少了重複子，兩顆棋就永遠組不出乾為天（帥＋帥）與坤為地（將＋將）。
     * 預設仍為關閉——重複子是刻意的例外，不是常態擺法。
     */
    test('允許重複棋子預設關閉', () => {
      const { result } = renderHook(() => useBoardDivination());

      expect(result.current.allowRepeatedPieces).toBe(false);
    });

    test('開啟後同一顆棋子可重複選取與放置', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.setAllowRepeatedPieces(true); });
      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(0, 0); });
      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(1, 1); });

      expect(result.current.placedPieces).toHaveLength(2);
      expect(result.current.placedPieces.every(pp => pp.piece === pieceA)).toBe(true);
    });

    test('達到上限三顆後不可再選子', () => {
      const { result } = renderHook(() => useBoardDivination());

      [pieceA, pieceB, pieceC].forEach((p, i) => {
        act(() => { result.current.selectPiece(p); });
        act(() => { result.current.placePieceOnBoard(i, i); });
      });
      expect(result.current.placedPieces).toHaveLength(3);

      act(() => { result.current.selectPiece(pieceD); });
      expect(result.current.selectedPiece).toBeNull();
    });

    test('移除棋子後該格可再放置', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(4, 5); });
      act(() => { result.current.removePieceFromBoard(4, 5); });

      expect(result.current.placedPieces).toEqual([]);

      act(() => { result.current.selectPiece(pieceB); });
      act(() => { result.current.placePieceOnBoard(4, 5); });
      expect(result.current.placedPieces).toHaveLength(1);
    });

    test('移除不存在的格位不影響既有佈局', () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(4, 5); });
      act(() => { result.current.removePieceFromBoard(0, 0); });

      expect(result.current.placedPieces).toHaveLength(1);
    });
  });

  describe('interpret', () => {
    test('棋盤為空時不儲存也不導航', async () => {
      const { result } = renderHook(() => useBoardDivination());

      await act(async () => { await result.current.interpret('general', ''); });

      expect(mockPush).not.toHaveBeenCalled();
      await expect(getHistory()).resolves.toEqual([]);
    });

    test('解讀後寫入歷史、附上位置摘要並導向結果頁', async () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(4, 5); });
      await act(async () => { await result.current.interpret('health', '身體如何'); });

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].mode).toBe('board');
      expect(history[0].questionCategory).toBe('health');
      expect(history[0].questionText).toBe('身體如何');
      expect(history[0].positionSummary).toBeTruthy();

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/reveal',
        params: { recordId: history[0].id, mode: 'board' },
      });
      // 迴歸：導航後立刻重設，返回不會殘留舊佈局或重複存檔
      expect(result.current.step).toBe('select-pieces');
      expect(result.current.selectedPoem).toBeNull();
      expect(result.current.placedPieces).toEqual([]);
    });

    /**
     * A6 迴歸：擺位必須影響卦象。
     * 修復前，位置只用來生成一段文字，同一組棋放哪裡籤詩都一樣。
     * 以同一顆棋放在兩個相距 6 格倍數以外的位置，動爻應不同。
     */
    test('同一顆棋擺在不同位置會得到不同動爻', async () => {
      const movingLines = new Set<number>();

      for (const [col, row] of [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]] as const) {
        mockStore.clear();
        const { result } = renderHook(() => useBoardDivination());

        act(() => { result.current.selectPiece(pieceA); });
        act(() => { result.current.placePieceOnBoard(col, row); });
        await act(async () => { await result.current.interpret('general', ''); });

        const [record] = await getHistory();
        movingLines.add(record.movingLine!);
      }

      // 六個相鄰欄位涵蓋動爻的完整循環，必然出現多於一種結果
      expect(movingLines.size).toBeGreaterThan(1);
    });

    test('記錄含六爻所需的卦象資料', async () => {
      const { result } = renderHook(() => useBoardDivination());

      act(() => { result.current.selectPiece(pieceA); });
      act(() => { result.current.placePieceOnBoard(2, 3); });
      await act(async () => { await result.current.interpret('general', ''); });

      const [record] = await getHistory();
      expect(record.hexagramName).toBeTruthy();
      expect(typeof record.hexagramIndex).toBe('number');
      expect(typeof record.movingLine).toBe('number');
      expect(typeof record.hourBranch).toBe('number');
    });
  });

  test('reset 清空佈局並回到選擇棋子', () => {
    const { result } = renderHook(() => useBoardDivination());

    act(() => { result.current.selectPiece(pieceA); });
    act(() => { result.current.placePieceOnBoard(4, 5); });
    act(() => { result.current.reset(); });

    expect(result.current.step).toBe('select-pieces');
    expect(result.current.placedPieces).toEqual([]);
    expect(result.current.selectedPiece).toBeNull();
    expect(result.current.selectedPoem).toBeNull();
  });
});
