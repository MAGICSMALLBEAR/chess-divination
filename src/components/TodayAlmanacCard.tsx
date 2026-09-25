// 今日曆法卡 — 農曆、節氣、月建與當令五行、日柱
//
// 只列曆法事實，不做擇日宜忌（理由見 services/calendar.ts）。月建與日柱是揭曉頁六爻盤判旺衰、
// 旬空、六神實際在用的兩個值——卡片說明這一點，並連到詞典的「月建」讓人查。
//
// 節氣、月建、干支、五行是資料值字面量，三語都保留漢字（S38 定下的術語政策）；
// 連接文走翻譯表。農曆日期則依語言排版：中文用「八月十五」，其他語言用數字。
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/icons';
import {
  lunarMonthName, lunarDayName, lunarYearGanZhi, type TodayAlmanac, type LunarDate,
} from '@/services/calendar';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  almanac: TodayAlmanac;
}

const shortDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;

export default function TodayAlmanacCard({ almanac }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t, lang } = useI18n();

  const lunarText = (lunar: LunarDate) => {
    const date = lang === 'zh-TW'
      ? `${lunarMonthName(lunar.month, lunar.isLeap)}${lunarDayName(lunar.day)}`
      : t(lunar.isLeap ? 'almanac.lunarLeapNumeric' : 'almanac.lunarNumeric', { month: lunar.month, day: lunar.day });
    return t('almanac.lunar', { date, year: lunarYearGanZhi(lunar.year) });
  };

  const { term } = almanac;
  const rows: { key: string; text: string }[] = [
    // 平台不支援中國曆時整列不出現：錯一天的農曆日期比沒有更糟
    ...(almanac.lunar ? [{ key: 'lunar', text: lunarText(almanac.lunar) }] : []),
    ...(term ? [{
      key: 'term',
      text: t('almanac.term', {
        term: term.current, since: shortDate(term.currentDate), next: term.next, n: term.daysToNext,
      }),
    }] : []),
    {
      key: 'month',
      text: t('almanac.month', {
        branch: almanac.monthBranch, from: almanac.monthTerm, season: almanac.season, element: almanac.seasonElement,
      }),
    },
    { key: 'day', text: t('almanac.day', { pillar: almanac.dayPillar }) },
  ];

  return (
    <View testID="today-almanac" style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <View style={styles.titleRow}>
        <Icon name="moon" size={16} color={theme.gold} />
        <Text style={[styles.title, { color: theme.textGold }]}> {t('almanac.title')}</Text>
      </View>
      {rows.map(row => (
        <Text key={row.key} testID={`almanac-${row.key}`} style={[styles.row, { color: theme.textSecondary }]}>
          {row.text}
        </Text>
      ))}
      <Text testID="almanac-note" style={[styles.note, { color: theme.textMuted }]}>{t('almanac.note')}</Text>
      <TouchableOpacity
        testID="almanac-glossary"
        accessibilityRole="link"
        style={styles.link}
        onPress={() => router.push('/glossary')}
      >
        <Text style={[styles.linkText, { color: theme.textGold }]}>{t('almanac.glossary')} →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', borderRadius: 16, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.body, fontWeight: '700' },
  row: { fontSize: FontSize.small, lineHeight: 22 },
  note: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.sm },
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: FontSize.caption, fontWeight: '600' },
});
