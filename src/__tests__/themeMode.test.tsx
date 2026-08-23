// 主題切換的接線測試
//
// theming.test.ts 掃的是「色值有沒有硬編」，抓不到這一類缺陷：
// 色盤完全正確、設定也存進去了，但畫面就是不變——因為切換的那一下
// 沒有通知 ThemeProvider。這支測的是「切了會不會馬上變」。

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

// 只換掉 useColorScheme 這一個模組。
// 整包 mock 'react-native' 會讓 expo-modules-core 取不到 Platform.select；
// 用展開 requireActual 又會強制求值 RN 的惰性 getter（FlatList 等）而爆炸。
// react-native/index.js 的 useColorScheme 只是轉出這支檔案，換它最小侵入。
let mockScheme: 'dark' | 'light' = 'dark';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

import fs from 'fs';
import path from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider, useAppTheme } from '../hooks/useAppTheme';
import { DarkTheme, LightTheme } from '../constants/theme';

const SETTINGS_KEY = '@chess_divination_settings';

/** 掛一個只呼叫 hook 的空元件，取出 context 值 */
function renderTheme() {
  const ref: { current: ReturnType<typeof useAppTheme> } =
    { current: undefined as unknown as ReturnType<typeof useAppTheme> };
  function Probe() {
    ref.current = useAppTheme();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider><Probe /></ThemeProvider>,
    );
  });
  return { result: ref, unmount: () => act(() => { renderer.unmount(); }) };
}

/** 等待 Provider 掛載時的非同步設定讀取跑完 */
async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockStore.clear();
  mockScheme = 'dark';
  jest.clearAllMocks();
});

describe('ThemeProvider', () => {
  test('預設為墨色主題', async () => {
    const { result } = renderTheme();
    await settle();

    expect(result.current.mode).toBe('dark');
    expect(result.current.theme).toEqual(DarkTheme);
    expect(result.current.isDark).toBe(true);
  });

  /**
   * 迴歸：設定頁原本只呼叫 saveSettings 而沒通知 Provider，
   * 按鈕會亮起、設定也存了，畫面卻要重開 App 才變色。
   */
  test('setMode 立即改變主題，不需重新掛載', async () => {
    const { result } = renderTheme();
    await settle();

    await act(async () => { await result.current.setMode('light'); });

    expect(result.current.mode).toBe('light');
    expect(result.current.theme).toEqual(LightTheme);
    expect(result.current.isDark).toBe(false);
  });

  test('setMode 會把選擇持久化，重新掛載後仍生效', async () => {
    const first = renderTheme();
    await settle();
    await act(async () => { await first.result.current.setMode('light'); });
    first.unmount();

    const second = renderTheme();
    await settle();

    expect(second.result.current.mode).toBe('light');
    expect(second.result.current.theme).toEqual(LightTheme);
  });

  test('墨色與宣紙可來回切換', async () => {
    const { result } = renderTheme();
    await settle();

    await act(async () => { await result.current.setMode('light'); });
    expect(result.current.theme).toEqual(LightTheme);

    await act(async () => { await result.current.setMode('dark'); });
    expect(result.current.theme).toEqual(DarkTheme);
  });

  describe('跟隨系統', () => {
    test('系統為淺色時解析為宣紙', async () => {
      mockScheme = 'light';
      const { result } = renderTheme();
      await settle();

      await act(async () => { await result.current.setMode('system'); });

      expect(result.current.mode).toBe('system');
      expect(result.current.theme).toEqual(LightTheme);
      expect(result.current.isDark).toBe(false);
    });

    test('系統為深色時解析為墨色', async () => {
      mockScheme = 'dark';
      const { result } = renderTheme();
      await settle();

      await act(async () => { await result.current.setMode('system'); });

      expect(result.current.theme).toEqual(DarkTheme);
      expect(result.current.isDark).toBe(true);
    });
  });

  test('讀取儲存中既有的主題設定', async () => {
    mockStore.set(SETTINGS_KEY, JSON.stringify({ themeMode: 'light' }));

    const { result } = renderTheme();
    await settle();

    expect(result.current.mode).toBe('light');
  });
});

/**
 * 靜態守門：設定頁必須透過 ThemeProvider 切換主題。
 *
 * 這個缺陷的形狀就是「繞過 context 直接寫 settings」，行為測試看不到
 * 畫面那一層，故補一條掃描把錯誤寫法擋在原地。
 */
describe('設定頁的主題切換接線', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf-8');

  test('主題切換走 setMode，不是直接寫 settings', () => {
    expect(source).toContain('setMode(');
    // update('themeMode', …) 正是壞掉的那個寫法：存了但沒人知道
    expect(source).not.toMatch(/update\(\s*['"]themeMode['"]/);
  });

  test('選取狀態讀 context 的 mode，避免與實際主題不同步', () => {
    expect(source).not.toMatch(/settings\.themeMode\s*===/);
  });
});
