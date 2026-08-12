// 六爻卦例展示：本卦 → 互卦 → 變卦 + 體用生剋

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HexagramLines from './HexagramLines';
import { trigramLabel, type LiuYaoReading, type HexagramInfo } from '@/services/liuyao';
import { hourBranchName } from '@/services/date';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  reading: LiuYaoReading;
  hourBranch?: number;
}

const LEVEL_TONE: Record<string, 'good' | 'neutral' | 'bad'> = {
  大吉: 'good', 吉: 'good', 平: 'neutral', 小凶: 'bad', 凶: 'bad',
};

/** 旺相為得時、休為持平、囚死為失時 */
const STRENGTH_TONE: Record<string, 'good' | 'neutral' | 'bad'> = {
  旺: 'good', 相: 'good', 休: 'neutral', 囚: 'bad', 死: 'bad',
};

export default function LiuYaoPanel({ reading, hourBranch }: Props) {
  const { theme } = useAppTheme();
  const {
    primary, nuclear, changed, movingLine, movingLineName,
    bodyUse, strength, finalLevel,
  } = reading;

  function colorFor(tone: 'good' | 'neutral' | 'bad') {
    return tone === 'good' ? theme.success : tone === 'bad' ? theme.danger : theme.warning;
  }

  // 徽章顯示調整後的斷語——那才是使用者該據以行動的結論
  const toneColor = colorFor(LEVEL_TONE[finalLevel] || 'neutral');
  const strengthColor = colorFor(STRENGTH_TONE[strength.state] || 'neutral');
  const adjusted = finalLevel !== bodyUse.level;

  const columns: { info: HexagramInfo; caption: string; hint: string; moving?: number }[] = [
    { info: primary, caption: '本卦', hint: '目前處境', moving: movingLine },
    { info: nuclear, caption: '互卦', hint: '隱藏因素' },
    { info: changed, caption: '變卦', hint: '發展結果' },
  ];

  return (
    <View style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.gold }]}>▎卦例推演</Text>
        {hourBranch ? (
          <Text style={[styles.hour, { color: theme.textMuted }]}>
            {hourBranchName(hourBranch)}起卦
          </Text>
        ) : null}
      </View>

      {/* 三卦並列 */}
      <View style={styles.columns}>
        {columns.map(({ info, caption, hint, moving }) => (
          <View key={caption} style={styles.column}>
            <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text>
            <HexagramLines lines={info.lines} movingLine={moving} width={52} />
            <Text style={[styles.hexName, { color: theme.textPrimary }]}>{info.name}</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
          </View>
        ))}
      </View>

      {/* 動爻 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <Text style={[styles.movingText, { color: theme.textSecondary }]}>
        動爻在
        <Text style={{ color: theme.gold, fontWeight: '700' }}> {movingLineName} </Text>
        （第 {movingLine} 爻）——變化的關鍵所在。
      </Text>

      {/* 體用 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <View style={styles.bodyUseRow}>
        <Text style={[styles.bodyUseLabel, { color: theme.textMuted }]}>
          體{trigramLabel(bodyUse.body)}（我） · 用{trigramLabel(bodyUse.use)}（事）
        </Text>
        <View style={[styles.badge, { borderColor: toneColor }]}>
          <Text style={[styles.badgeText, { color: toneColor }]}>
            {bodyUse.relation} · {finalLevel}
          </Text>
        </View>
      </View>
      <Text style={[styles.bodyUseText, { color: theme.textSecondary }]}>{bodyUse.text}</Text>

      {/* 月建旺衰：體卦五行在起卦當月是否得時 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <View style={styles.bodyUseRow}>
        <Text style={[styles.bodyUseLabel, { color: theme.textMuted }]}>
          {strength.monthBranchName}（{strength.season}）令{strength.seasonElement}當權
          {' · '}體屬{strength.bodyElement}
        </Text>
        <View style={[styles.badge, { borderColor: strengthColor }]}>
          <Text style={[styles.badgeText, { color: strengthColor }]}>{strength.state}</Text>
        </View>
      </View>
      <Text style={[styles.bodyUseText, { color: theme.textSecondary }]}>{strength.text}</Text>
      {adjusted && (
        <Text style={[styles.adjustNote, { color: theme.textMuted }]}>
          綜合時令，斷語由「{bodyUse.level}」調整為「
          <Text style={{ color: toneColor, fontWeight: '700' }}>{finalLevel}</Text>」。
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.body, fontWeight: '600' },
  hour: { fontSize: FontSize.caption },
  columns: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  column: { flex: 1, alignItems: 'center' },
  caption: { fontSize: FontSize.caption, marginBottom: Spacing.sm },
  hexName: {
    fontSize: FontSize.small, fontWeight: '600',
    marginTop: Spacing.sm, textAlign: 'center',
  },
  hint: { fontSize: FontSize.overline, marginTop: 2, textAlign: 'center' },
  divider: { height: 1, marginVertical: Spacing.md },
  movingText: { fontSize: FontSize.small, lineHeight: 22 },
  bodyUseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  bodyUseLabel: { fontSize: FontSize.caption, flexShrink: 1 },
  badge: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: FontSize.caption, fontWeight: '700' },
  bodyUseText: { fontSize: FontSize.small, lineHeight: 22 },
  adjustNote: { fontSize: FontSize.caption, lineHeight: 20, marginTop: Spacing.sm },
});
