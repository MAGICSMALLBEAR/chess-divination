// ErrorBoundary 的逃生出口測試
//
// 迴歸 A21：這個邊界包住整個 Stack（含導覽），畫面一旦是「必然重現」
// 的錯誤，「重試」只會再炸一次——使用者沒有任何路徑回到設定頁去還原
// 備份或匯出資料。資料還在，只是拿不到。

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { t } from '../services/i18n';

/** 依 shouldThrow 決定要不要在渲染時炸掉 */
function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('渲染爆炸');
  return <Text>正常內容</Text>;
}

/** 取出畫面上所有可按的元件 */
function buttons(tree: TestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(TouchableOpacity);
}

function textOf(tree: TestRenderer.ReactTestRenderer): string {
  return tree.root.findAllByType(Text)
    .map(n => n.props.children)
    .filter((c): c is string => typeof c === 'string')
    .join('|');
}

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    mockReplace.mockClear();
    // React 會把被邊界接住的錯誤再 log 一次，測試輸出會被洗版
    console.error = jest.fn();
  });
  afterEach(() => { console.error = originalError; });

  test('沒有錯誤時原樣顯示子元件', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ErrorBoundary><Boom shouldThrow={false} /></ErrorBoundary>,
      );
    });
    expect(textOf(tree)).toContain('正常內容');
  });

  test('子元件拋錯時顯示錯誤畫面與錯誤訊息', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ErrorBoundary><Boom shouldThrow /></ErrorBoundary>,
      );
    });
    const shown = textOf(tree);
    expect(shown).toContain(t('error.title'));
    expect(shown).toContain('渲染爆炸');
  });

  /** 缺陷本身：只有「重試」一個出口，必然重現的錯誤等於沒有出口 */
  test('錯誤畫面同時提供重試與前往設定兩個出口', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ErrorBoundary><Boom shouldThrow /></ErrorBoundary>,
      );
    });
    expect(buttons(tree)).toHaveLength(2);
    expect(textOf(tree)).toContain(t('error.goSettings'));
  });

  test('按下前往設定會導向設定頁並清掉錯誤狀態', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ErrorBoundary><Boom shouldThrow={false} /></ErrorBoundary>,
      );
    });
    // 先讓它壞掉
    act(() => { tree.update(<ErrorBoundary><Boom shouldThrow /></ErrorBoundary>); });
    expect(textOf(tree)).toContain(t('error.title'));

    // 再按「前往設定」，此時子元件已換回正常的那個
    act(() => { tree.update(<ErrorBoundary><Boom shouldThrow={false} /></ErrorBoundary>); });
    act(() => { buttons(tree)[1].props.onPress(); });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/settings');
    expect(textOf(tree)).toContain('正常內容');
  });

  test('導頁失敗也不會讓錯誤畫面自己再炸一次', () => {
    mockReplace.mockImplementationOnce(() => { throw new Error('導覽尚未就緒'); });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ErrorBoundary><Boom shouldThrow /></ErrorBoundary>,
      );
    });
    expect(() => act(() => { buttons(tree)[1].props.onPress(); })).not.toThrow();
  });
});
