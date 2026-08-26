// InkSplashOverlay 的 reducedMotion 接線測試
//
// 迴歸 A8：開牌轉場的 1.7 秒全螢幕墨滴原本不理會「減少動態效果」——
// PieceDraw3D 與 PieceEntryFlyIn 都有接 useReducedMotion，這裡是漏接
// 而非政策。跳過視覺裝飾的同時仍要通知父層完成，否則狀態機停在
// 轉場中，籤詩頁內容永遠等不到「轉場結束」。

let mockReduced = false;
jest.mock('../hooks/useReducedMotion', () => ({
  __esModule: true,
  useReducedMotion: () => mockReduced,
}));
// Reanimated 的原生 worklets 模組在 jest 下無法載入，官方 mock 又會回頭
// import 原生 initializers 而同樣爆炸。這裡測的是「計時與 reducedMotion
// 接線」而非動畫引擎本身，故只 mock 本元件用到的四個 API。
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props: object) => React.createElement(View, props),
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: () => ({}),
    cancelAnimation: () => {},
  };
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import InkSplashOverlay from '../components/InkSplashOverlay';

// 完成通知的等待：最晚斑點 delay 450 + 擴散 750 + 停留 150 + 淡出 350
const FULL_TRANSITION = 450 + 750 + 150 + 350;

describe('InkSplashOverlay', () => {
  beforeEach(() => {
    mockReduced = false;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('減少動態效果時不渲染墨滴，並立刻通知完成', () => {
    mockReduced = true;
    const onComplete = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<InkSplashOverlay visible onComplete={onComplete} />);
    });

    expect(tree.toJSON()).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('未減少動態效果時渲染遮罩，整段轉場走完才通知完成', () => {
    const onComplete = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<InkSplashOverlay visible onComplete={onComplete} />);
    });

    expect(tree.toJSON()).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(FULL_TRANSITION - 1);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('轉場中途卸下遮罩（visible=false）不觸發完成回呼', () => {
    const onComplete = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<InkSplashOverlay visible onComplete={onComplete} />);
    });

    act(() => {
      tree.update(<InkSplashOverlay visible={false} onComplete={onComplete} />);
    });
    expect(tree.toJSON()).toBeNull();

    act(() => {
      jest.advanceTimersByTime(FULL_TRANSITION + 100);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
