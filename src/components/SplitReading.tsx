// 閱讀型畫面的「主欄 ＋ 卦例側欄」版面
//
// 為什麼需要這個元件：揭曉頁與棋盤頁在桌面上原本是 560px 限寬置中的
// 單欄長捲軸。1440px 的螢幕左右各空 440px，而內容有九個區塊——讀到
// 「規則式解讀」時，判斷依據的六爻盤早就捲出畫面外了，想對照只能捲回頁首。
//
// 分欄要解的是後者，不是前者：空白只是症狀，真正的問題是**憑據與結論
// 被垂直距離拆散**。所以側欄放的是查證用的東西（六爻盤、卦名、問題、
// 棋盤位置），並在捲動時固定；主欄留給要一路讀下去的籤詩與解讀。
//
// 窄螢幕不分欄時，側欄內容排在主欄之前——與分欄前的原始順序一致，
// 手機版視覺上完全沒有變化。

import React, { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { SPLIT_GAP, useLayout } from '@/hooks/useLayout';
import { Spacing } from '@/constants/theme';

interface Props {
  /**
   * 跨兩欄的頁首（導覽列、頁級提示）。
   * 由這個元件負責而非各畫面自己排，是為了讓頁首與下方欄位共用同一個
   * 寬度來源——分開算遲早會在某個斷點對不齊。
   */
  head?: ReactNode;
  /** 主欄：要一路讀下去的內容（籤詩、詳解、解讀、占驗） */
  main: ReactNode;
  /** 側欄：查證用的憑據（六爻盤、卦名、問題、棋盤位置） */
  rail: ReactNode;
}

/**
 * 側欄捲動時固定在視窗上緣。
 *
 * RN 0.86 的樣式型別只認得 `'absolute' | 'relative' | 'static'`，
 * 但 react-native-web 0.21 支援 `'sticky'`——它自己的 ScrollView
 * sticky header 就是用這個值實作的。型別缺口是 RN 那邊的事，不是
 * 這個值不能用，所以在這裡轉型並寫明原因。
 *
 * 原生端不套用：那裡沒有 sticky，套上去只會被靜默忽略。與其倚賴
 * 「未知值會被忽略」這種不保證的行為，不如用 Platform 明確擋掉。
 */
const stickyRail: ViewStyle | null = Platform.OS === 'web'
  ? ({
      position: 'sticky',
      top: Spacing.lg,
      // 側欄比視窗高時（六爻盤展開後很容易），沒有這兩行就會有一段
      // 內容固定在畫面外、永遠捲不到。讓側欄自己能捲。
      overflowY: 'auto',
    } as unknown as ViewStyle)
  : null;

export function SplitReading({ head, main, rail }: Props) {
  const { contentWidth, height, split } = useLayout();

  if (!split) {
    return (
      <View style={[styles.single, { width: contentWidth }]} testID="reading-single">
        {head}
        {rail}
        {main}
      </View>
    );
  }

  return (
    <View
      style={{ width: split.mainWidth + SPLIT_GAP + split.railWidth }}
      testID="reading-split"
    >
      {head}
      <View style={styles.row}>
        <View style={{ width: split.mainWidth }}>{main}</View>
        <View
          testID="reading-rail"
          style={[
            { width: split.railWidth },
            stickyRail,
            // 扣掉上下各一個 sticky top 的距離，讓側欄底部不貼齊視窗邊緣
            stickyRail ? { maxHeight: height - Spacing.lg * 2 } : null,
          ]}
        >
          {rail}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  single: { alignItems: 'center' },
  /**
   * `alignItems: 'flex-start'` 是 sticky 能動的前提。
   * 預設的 `stretch` 會把側欄拉成與主欄等高，等高的元素在自己的容器裡
   * 沒有可移動的餘裕，sticky 就形同 relative——看起來像「沒生效」，
   * 但其實是版面沒留空間給它動。
   */
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPLIT_GAP },
});
