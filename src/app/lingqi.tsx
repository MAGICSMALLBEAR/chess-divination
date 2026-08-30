import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import { castLingqi, lingqiNotation, type LingqiCast } from '@/services/lingqi';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { FontSize, Spacing } from '@/constants/theme';

export default function LingqiScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [result, setResult] = useState<LingqiCast | null>(null);

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
    <Stack.Screen options={{ headerShown: false }} />
    <InkBackground />
    <ScrollView contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => router.back()}><Text style={[styles.back, { color: theme.textSecondary }]}>← {t('common.back')}</Text></TouchableOpacity>
      <Text style={[styles.title, { color: theme.textGold }]}>{t('lingqi.title')}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('lingqi.subtitle')}</Text>
      <View style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
        <Text style={[styles.rule, { color: theme.textPrimary }]}>{t('lingqi.rule')}</Text>
        {result ? <View style={styles.result}>
          {/* 卦目標記（如「二上一中」）是原典名稱，維持漢字不譯，見 lingqi.ts */}
          <Text style={[styles.resultName, { color: theme.textGold }]}>{lingqiNotation(result)}</Text>
          <Text style={[styles.resultText, { color: theme.textSecondary }]}>{t('lingqi.countLine', { u: result.upper, m: result.middle, l: result.lower })}</Text>
          <Text style={[styles.source, { color: theme.textMuted }]}>{t('lingqi.source')}</Text>
        </View> : null}
        <TouchableOpacity style={[styles.cast, { backgroundColor: theme.gold }]} onPress={() => setResult(castLingqi())}>
          <Text style={[styles.castText, { color: theme.textInverse }]}>{t(result ? 'lingqi.recast' : 'lingqi.cast')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { padding: Spacing.lg, gap: Spacing.md },
  back: { fontSize: FontSize.body, marginBottom: Spacing.md }, title: { fontSize: FontSize.hero, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: FontSize.body, lineHeight: 24, textAlign: 'center', marginBottom: Spacing.md },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg }, rule: { fontSize: FontSize.small, lineHeight: 22 },
  result: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm }, resultName: { fontSize: 32, fontWeight: '800' },
  resultText: { fontSize: FontSize.body }, source: { fontSize: FontSize.caption, lineHeight: 19, textAlign: 'center', marginTop: Spacing.sm },
  cast: { marginTop: Spacing.md, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }, castText: { fontSize: FontSize.body, fontWeight: '700' },
});
