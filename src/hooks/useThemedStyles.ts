// 主題化樣式 Hook
//
// 用法：把 StyleSheet.create 包成一個接收 theme 的工廠函式，置於模組層級，
// 元件內以 useThemedStyles(makeStyles) 取用。
//
//   const makeStyles = (t: ThemeColors) => StyleSheet.create({
//     card: { backgroundColor: t.bgCard, borderColor: t.bgMedium },
//   });
//
//   export default function Foo() {
//     const styles = useThemedStyles(makeStyles);
//   }
//
// 工廠函式必須是模組層級的常數（而非在元件內宣告），否則每次 render
// 都會產生新的 factory 參考，useMemo 形同失效。

import { useMemo } from 'react';
import type { ThemeColors } from '@/constants/theme';
import { useAppTheme } from './useAppTheme';

export function useThemedStyles<T>(factory: (theme: ThemeColors) => T): T {
  const { theme } = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
