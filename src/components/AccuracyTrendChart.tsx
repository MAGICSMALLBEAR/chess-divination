// 應驗率趨勢圖 — 單一折線：走到第 N 筆已回填時，最近一個視窗的加權應驗率
//
// 與 TrendChart 是兩種資料形狀：那一張是每日占卜次數的吉凶堆疊長條，
// 這一張是一條累積的百分比折線，沒有可共用的版面，所以另做元件。
//
// 誠實邊界寫在畫面上，不只寫在服務層的註解裡：視窗只有幾筆，一筆之差
// 就是十幾個百分點，起伏大半是雜訊。圖下方一定附上這句提醒，
// 摘要也只陳述「最早／最近」兩個數字，不下「變準了」「變差了」的結論。
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import type { AccuracyTrend } from '@/services/verification';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useMeasuredWidth } from '@/hooks/useGrid';
import { useI18n } from '@/hooks/useI18n';
import { FontSize, Spacing, Layout } from '@/constants/theme';

interface Props {
  trend: AccuracyTrend;
}

const PLOT_HEIGHT = 120;
const PAD = { top: 10, bottom: 10, right: 10 };
/** 左側留給 0／50／100 的刻度字 */
const AXIS_WIDTH = 36;
const SVG_HEIGHT = PLOT_HEIGHT + PAD.top + PAD.bottom;
const BORDER = 1;
/** 折線兩端內縮，讓第一個與最後一個圓點不被 SVG 邊界切掉一半 */
const INSET = 5;

export default function AccuracyTrendChart({ trend }: Props) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  // 量測自身容器而非視窗：Web 靜態匯出下取不到視窗尺寸（見 useGrid.ts 檔頭）
  const { onLayout, width } = useMeasuredWidth();

  const { points } = trend;
  const unlocked = points.length > 0;
  // 扣掉左右邊框各 1：少扣的話內容比容器內側寬 2px，容器被撐寬、再量測、再撐寬——
  // 寬度會無限增長（截圖前 e2e 的「元素不穩定」才揭露；測試斷言全綠）
  const plotWidth = Math.max(width - Spacing.md * 2 - BORDER * 2 - AXIS_WIDTH - PAD.right, 0);

  const first = points[0];
  const last = points[points.length - 1];
  const yOf = (rate: number) => PAD.top + (1 - rate / 100) * PLOT_HEIGHT;
  const xOf = (i: number) =>
    INSET + (points.length <= 1 ? 0 : (i / (points.length - 1)) * Math.max(plotWidth - INSET * 2, 0));

  return (
    <View
      testID="accuracy-trend"
      style={[styles.container, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
      onLayout={onLayout}
    >
      <Text style={[styles.title, { color: theme.textGold }]}>{t('stats.accTrend')}</Text>

      {!unlocked && (
        // 不畫一條只有雜訊的線：資料還不夠時，告訴使用者差多少，而不是給一張看似有資訊的圖
        <Text testID="accuracy-trend-locked" style={[styles.locked, { color: theme.textSecondary }]}>
          {t('stats.accTrendLocked', { v: trend.verified, n: trend.remaining })}
        </Text>
      )}

      {unlocked && first && last && (
        <>
          <View style={styles.plotRow}>
            <View style={{ width: AXIS_WIDTH, height: SVG_HEIGHT }}>
              {[100, 50, 0].map(v => (
                <Text
                  key={v}
                  style={[styles.axisLabel, { color: theme.textMuted, top: yOf(v) - 7 }]}
                >
                  {v}%
                </Text>
              ))}
            </View>
            {/* 量測完成前不畫圖，避免以 0 寬度閃現 */}
            {plotWidth > 0 && (
              <Svg
                width={plotWidth + PAD.right}
                height={SVG_HEIGHT}
                accessible
                accessibilityLabel={t('stats.accTrendA11y', { from: first.rate, to: last.rate })}
              >
                {[100, 50, 0].map(v => (
                  <Line
                    key={v}
                    x1={0} y1={yOf(v)} x2={plotWidth} y2={yOf(v)}
                    stroke={theme.bgMedium} strokeWidth={v === 50 ? 0.6 : 0.8}
                  />
                ))}
                <Polyline
                  points={points.map((p, i) => `${xOf(i)},${yOf(p.rate)}`).join(' ')}
                  fill="none" stroke={theme.gold} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round"
                />
                {points.map((p, i) => (
                  <Circle
                    key={p.n}
                    cx={xOf(i)} cy={yOf(p.rate)}
                    // 最後一點放大：那是「目前的你」，也是摘要第二個數字的位置
                    r={i === points.length - 1 ? 4.5 : 2.5}
                    fill={theme.gold}
                  />
                ))}
              </Svg>
            )}
          </View>

          <View style={[styles.axisRow, { marginLeft: AXIS_WIDTH }]}>
            <Text style={[styles.axisNote, { color: theme.textMuted }]}>{t('stats.accTrendAxis', { n: first.n })}</Text>
            <Text style={[styles.axisNote, { color: theme.textMuted }]}>{t('stats.accTrendAxis', { n: last.n })}</Text>
          </View>

          <Text testID="accuracy-trend-summary" style={[styles.summary, { color: theme.textSecondary }]}>
            {t('stats.accTrendSummary', { w: trend.window, from: first.rate, to: last.rate })}
          </Text>
          <Text testID="accuracy-trend-note" style={[styles.note, { color: theme.textMuted }]}>
            {t('stats.accTrendNote', { w: trend.window })}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, borderWidth: BORDER,
    padding: Spacing.md, marginBottom: Spacing.md,
    // 寬度必須釘死：圖寬取自容器的量測值，容器若隨內容伸縮就成了回饋迴圈。
    // 與 TrendChart 同一組寫法
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  title: { fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm },
  locked: { fontSize: FontSize.small, lineHeight: 22 },
  plotRow: { flexDirection: 'row' },
  axisLabel: { position: 'absolute', left: 0, fontSize: FontSize.overline, width: AXIS_WIDTH - 6, textAlign: 'right' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: PAD.right, marginTop: 2 },
  axisNote: { fontSize: FontSize.overline },
  summary: { fontSize: FontSize.small, fontWeight: '600', marginTop: Spacing.sm },
  note: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.xs },
});
