// 占卜趨勢圖 — SVG 柱狀圖
// 顯示近期（7 天或 30 天）的每日占卜次數與吉凶分佈
// 使用 react-native-svg 繪製，跟隨主題色

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useMeasuredWidth } from '@/hooks/useGrid';
import type { ThemeColors } from '@/constants/theme';
import { FontSize, Spacing, Layout } from '@/constants/theme';

interface DataPoint {
  label: string;
  total: number;
  good: number;  // 大吉 + 上吉
  neutral: number;
  bad: number;
}

interface Props {
  data: DataPoint[];
  title: string;
}

const CHART_HEIGHT = 160;
const BAR_MAX_HEIGHT = 120;
/** 柱寬下限與上限。固定寬度在寬螢幕下會顯得過細，故改為依欄距推算 */
const BAR_WIDTH_MIN = 24;
const BAR_WIDTH_MAX = 72;
const CHART_PADDING = { top: 16, right: 16, bottom: 28, left: 8 };

export default function TrendChart({ data, title }: Props) {
  const { theme } = useAppTheme();
  // 量測自身容器而非視窗：Web 靜態匯出下取不到視窗尺寸（見 useGrid.ts 檔頭），
  // 沿用 useLayout 會讓圖表永遠是最小寬度。
  const { onLayout, width } = useMeasuredWidth();
  const chartWidth = Math.max(
    width - Spacing.md * 2 - CHART_PADDING.left - CHART_PADDING.right,
    0,
  );

  if (data.length === 0) return null;

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const barGap = chartWidth / data.length;
  // 柱寬取欄距的六成，並夾在上下限之間，讓窄螢幕不擠、寬螢幕不空
  const barWidth = Math.min(Math.max(barGap * 0.6, BAR_WIDTH_MIN), BAR_WIDTH_MAX);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
      onLayout={onLayout}
    >
      <Text style={[styles.title, { color: theme.textGold }]}>{title}</Text>
      {/* 量測完成前不畫圖，避免以 0 寬度閃現 */}
      {chartWidth > 0 && (
      <Svg width={chartWidth + CHART_PADDING.right} height={CHART_HEIGHT}>
        <G x={CHART_PADDING.left} y={CHART_PADDING.top}>
          {/* 基準線 */}
          <Line
            x1={0} y1={BAR_MAX_HEIGHT}
            x2={chartWidth} y2={BAR_MAX_HEIGHT}
            stroke={theme.bgMedium} strokeWidth={0.8}
          />
          {/* 柱狀 */}
          {data.map((d, i) => {
            const x = i * barGap + (barGap - barWidth) / 2;
            const totalH = (d.total / maxTotal) * BAR_MAX_HEIGHT;
            const y = BAR_MAX_HEIGHT - totalH;

            return (
              <G key={i}>
                {/* 總數柱 */}
                <Rect
                  x={x} y={y}
                  width={barWidth} height={totalH}
                  fill={theme.gold} opacity={0.3} rx={3}
                />
                {/* 吉柱（上半部） */}
                {d.good > 0 && (
                  <Rect
                    x={x + 2}
                    y={BAR_MAX_HEIGHT - (d.good / maxTotal) * BAR_MAX_HEIGHT}
                    width={barWidth - 4}
                    height={(d.good / maxTotal) * BAR_MAX_HEIGHT}
                    fill={theme.gold} opacity={0.8} rx={2}
                  />
                )}
                {/* 日期標籤 */}
                <SvgText
                  x={x + barWidth / 2}
                  y={BAR_MAX_HEIGHT + 18}
                  fontSize={10}
                  fill={theme.textMuted}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
                {/* 數字標籤 */}
                {d.total > 0 && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 4}
                    fontSize={10}
                    fill={theme.textSecondary}
                    textAnchor="middle"
                  >
                    {d.total}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  title: {
    fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm,
  },
});
