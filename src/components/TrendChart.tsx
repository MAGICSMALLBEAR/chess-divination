// 占卜趨勢圖 — SVG 柱狀圖
// 顯示近期（7 天或 30 天）的每日占卜次數與吉凶分佈
// 使用 react-native-svg 繪製，跟隨主題色

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import type { ThemeColors } from '@/constants/theme';
import { FontSize, Spacing } from '@/constants/theme';

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
const BAR_WIDTH = 32;
const CHART_PADDING = { top: 16, right: 16, bottom: 28, left: 8 };

export default function TrendChart({ data, title }: Props) {
  const { theme } = useAppTheme();
  const { width } = useLayout();
  const chartWidth = width - Spacing.md * 2 - CHART_PADDING.left - CHART_PADDING.right;

  if (data.length === 0) return null;

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const barGap = chartWidth / data.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <Text style={[styles.title, { color: theme.gold }]}>{title}</Text>
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
            const x = i * barGap + (barGap - BAR_WIDTH) / 2;
            const totalH = (d.total / maxTotal) * BAR_MAX_HEIGHT;
            const y = BAR_MAX_HEIGHT - totalH;

            return (
              <G key={i}>
                {/* 總數柱 */}
                <Rect
                  x={x} y={y}
                  width={BAR_WIDTH} height={totalH}
                  fill={theme.gold} opacity={0.3} rx={3}
                />
                {/* 吉柱（上半部） */}
                {d.good > 0 && (
                  <Rect
                    x={x + 2}
                    y={BAR_MAX_HEIGHT - (d.good / maxTotal) * BAR_MAX_HEIGHT}
                    width={BAR_WIDTH - 4}
                    height={(d.good / maxTotal) * BAR_MAX_HEIGHT}
                    fill={theme.gold} opacity={0.8} rx={2}
                  />
                )}
                {/* 日期標籤 */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
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
                    x={x + BAR_WIDTH / 2}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm,
  },
});
