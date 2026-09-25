// 直覺校準 — 占卜前記下的直覺，事後準不準；以及在同一批記錄上與卦的方向並列
//
// 誠實邊界與 AccuracyTrendChart 同一套：樣本不足時只說還差幾筆，不給一張看似有資訊的表；
// 卦與直覺只並列兩個命中數，不下「誰比較準」的結論，而且兩個數字的分母是同一批記錄。
// 規則與取捨都在 services/calibration.ts，這裡只負責說出來。
//
// 刻意不量測自身寬度（純文字與列，沒有圖）：S75 的圖寬回饋迴圈就是從「量自己再決定自己」來的。
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CalibrationReport } from '@/services/calibration';
import { MIN_INSIGHT_SAMPLES } from '@/services/verification';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { FontSize, Spacing, Layout } from '@/constants/theme';

interface Props {
  report: CalibrationReport;
}

export default function CalibrationCard({ report }: Props) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { headToHead: h2h } = report;

  return (
    <View
      testID="calibration"
      style={[styles.container, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
    >
      <Text style={[styles.title, { color: theme.textGold }]}>{t('calibration.title')}</Text>

      {!report.enoughSamples ? (
        <View testID="calibration-locked">
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t('calibration.locked', { n: report.samples, min: MIN_INSIGHT_SAMPLES })}
          </Text>
          {report.awaiting > 0 && (
            <Text testID="calibration-awaiting" style={[styles.note, { color: theme.textMuted }]}>
              {t('calibration.awaiting', { n: report.awaiting })}
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text testID="calibration-brier" style={[styles.body, { color: theme.textSecondary }]}>
            {t('calibration.brier', {
              n: report.samples,
              score: report.brier!.toFixed(2),
              base: report.baselineBrier!.toFixed(2),
            })}
          </Text>

          {/* 逐檔：你說幾成的那些事，實際如願了幾成。沒有樣本的檔不列 */}
          <View testID="calibration-table" style={styles.table}>
            {report.buckets.filter(b => b.count > 0).map(b => (
              <View key={b.pct} testID={`calibration-row-${b.pct}`} style={[styles.row, { borderTopColor: theme.bgMedium }]}>
                <Text style={[styles.cellLabel, { color: theme.textSecondary }]}>
                  {t('calibration.rowSaid', { pct: b.pct })}
                </Text>
                <Text style={[styles.cellCount, { color: theme.textMuted }]}>
                  {t('calibration.rowCount', { n: b.count })}
                </Text>
                <Text style={[styles.cellRate, { color: theme.textPrimary }]}>
                  {t('calibration.rowActual', { rate: b.realizedRate! })}
                </Text>
              </View>
            ))}
          </View>

          <Text testID="calibration-h2h" style={[styles.body, { color: theme.textSecondary }]}>
            {h2h.enoughSamples
              ? t('calibration.h2h', { n: h2h.count, r: h2h.readingHits, i: h2h.intuitionHits })
              : t('calibration.h2hLocked', { n: h2h.count, min: MIN_INSIGHT_SAMPLES })}
          </Text>
        </>
      )}

      <Text testID="calibration-note" style={[styles.note, { color: theme.textMuted }]}>{t('calibration.note')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.md,
    width: '100%', maxWidth: Layout.maxGrid, alignSelf: 'center',
  },
  title: { fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm },
  body: { fontSize: FontSize.small, lineHeight: 22, marginBottom: Spacing.xs },
  table: { marginVertical: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cellLabel: { flex: 1, fontSize: FontSize.small },
  cellCount: { width: 64, fontSize: FontSize.caption, textAlign: 'right' },
  cellRate: { flex: 1, fontSize: FontSize.small, textAlign: 'right' },
  note: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.xs },
});
