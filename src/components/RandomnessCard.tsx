// 抽棋的隨機性 — 實際抽到的各卦比例，與棋盤組成的預期並列；樣本夠了才做卡方檢定
//
// 誠實邊界與 CalibrationCard 同一套：樣本不足只說還差幾顆，不給結論；
// 檢定顯著時也不說「抽取有問題」——公平的亂數在 5% 顯著水準下本來就每 20 次約有 1 次會這樣。
// 規則與數字都在 services/drawTally.ts，這裡只負責說出來。
//
// 用文字列而非長條圖：八列兩個百分比，一張圖在小樣本時只會讓起伏看起來像趨勢（同 CalibrationCard）。
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  piecesPerTrigram, formatP, MIN_EXPECTED_PER_CELL, SIGNIFICANCE_PCT, type RandomnessReport,
} from '@/services/drawTally';
import { trigramLabel } from '@/services/learning';
import { TRIGRAM_NAMES } from '@/services/hexagram';
import { ALL_PIECES } from '@/data/pieces';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { FontSize, Spacing, Layout } from '@/constants/theme';

interface Props {
  report: RandomnessReport;
}

const pct = (share: number) => Math.round(share * 100);

export default function RandomnessCard({ report }: Props) {
  const { theme } = useAppTheme();
  const { t } = useI18n();

  // 「乾、坤各只有 1 顆，艮、兌各有 7 顆」——由棋盤組成算出來，不寫死在文案裡
  const perTrigram = piecesPerTrigram();
  const fewest = Math.min(...perTrigram);
  const most = Math.max(...perTrigram);
  const namesWith = (n: number) => TRIGRAM_NAMES.filter((_, i) => perTrigram[i] === n).join(t('learn.listSeparator'));

  return (
    <View
      testID="randomness"
      style={[styles.container, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
    >
      <Text style={[styles.title, { color: theme.textGold }]}>{t('randomness.title')}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {t('randomness.intro', {
          total: ALL_PIECES.length,
          rare: namesWith(fewest), rareCount: fewest,
          common: namesWith(most), commonCount: most,
        })}
      </Text>

      {report.total === 0 ? (
        <Text testID="randomness-empty" style={[styles.body, { color: theme.textMuted }]}>{t('randomness.empty')}</Text>
      ) : (
        <>
          <View testID="randomness-table" style={styles.table}>
            <View style={styles.headRow}>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]} />
              <Text style={[styles.cellHead, { color: theme.textMuted }]}>{t('randomness.observed')}</Text>
              <Text style={[styles.cellHead, { color: theme.textMuted }]}>{t('randomness.expected')}</Text>
            </View>
            {report.rows.map(r => (
              <View key={r.trigram} testID={`randomness-row-${r.trigram}`} style={[styles.row, { borderTopColor: theme.bgMedium }]}>
                <Text style={[styles.cellLabel, { color: theme.textSecondary }]}>{trigramLabel(r.trigram)}</Text>
                <Text style={[styles.cell, { color: theme.textPrimary }]}>
                  {t('randomness.observedCell', { pct: pct(r.observedShare), n: r.observed })}
                </Text>
                <Text style={[styles.cell, { color: theme.textMuted }]}>
                  {t('randomness.expectedCell', { pct: pct(r.expectedShare) })}
                </Text>
              </View>
            ))}
          </View>

          <Text testID="randomness-verdict" style={[styles.body, { color: theme.textSecondary }]}>
            {!report.enoughSamples
              ? t('randomness.locked', { n: report.total, min: report.minDraws, cell: MIN_EXPECTED_PER_CELL })
              : report.deviates
                ? t('randomness.deviates', { n: report.total, p: formatP(report.pValue!), alpha: SIGNIFICANCE_PCT })
                : t('randomness.consistent', { n: report.total, p: formatP(report.pValue!) })}
          </Text>
        </>
      )}

      <Text testID="randomness-note" style={[styles.note, { color: theme.textMuted }]}>{t('randomness.note')}</Text>
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
  headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cellLabel: { flex: 1, fontSize: FontSize.small },
  cellHead: { width: 96, fontSize: FontSize.caption, textAlign: 'right' },
  cell: { width: 96, fontSize: FontSize.small, textAlign: 'right' },
  note: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.xs },
});
