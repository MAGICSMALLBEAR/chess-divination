// 命理術語詞典 — 看懂納甲盤上印著的漢字
//
// 為什麼是獨立的一頁、而不是盤面上點一下就跳出說明：盤面元件
// （LiuYaoPanel）同時被揭曉頁與離屏的報告截圖使用，在裡面加互動會連累
// 匯出的長圖。詞典先當索引頁；要不要做「長按術語就近解釋」，等看使用者
// 有沒有在用這一頁再說。
//
// 版面刻意單欄、限寬 Layout.maxContent：這是閱讀型內容，每條都是兩段散文，
// 多欄網格會把行寬切碎，且各卡高度落差大、並排只會留下大片空洞（與圖鑑的
// 短詩卡不同）。
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import type { GlossaryGroupId } from '@/data/glossary';
import { searchGlossary } from '@/services/glossary';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { Spacing, FontSize, Layout } from '@/constants/theme';

/**
 * 分組標題的翻譯鍵。逐一寫成字面量而不是 `glossary.group${Id}` 動態組出：
 * 翻譯鍵反向覆蓋的守門測試只認字面量，動態組出的鍵會被誤判成沒人用。
 */
const GROUP_TITLE_KEYS: Record<GlossaryGroupId, string> = {
  hexagram: 'glossary.groupHexagram',
  chart: 'glossary.groupChart',
  relative: 'glossary.groupRelative',
  useGod: 'glossary.groupUseGod',
  moving: 'glossary.groupMoving',
  strength: 'glossary.groupStrength',
};

export default function GlossaryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');

  // lang 列入相依：切換語言後，比對的說明文字跟著換，結果必須重算
  const sections = useMemo(() => searchGlossary(search, lang), [search, lang]);
  const hitCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.entries.length, 0),
    [sections],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text testID="glossary-title" style={[styles.title, { color: theme.textPrimary }]}>{t('glossary.title')}</Text>
        {/* 與圖鑑頁的標題列對稱：右側留一個與返回鈕同寬的空位，標題才會置中 */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.controls}>
        <TextInput
          testID="glossary-search"
          style={[styles.searchInput, { backgroundColor: theme.bgCard, borderColor: theme.goldFaint, color: theme.textPrimary }]}
          placeholder={t('glossary.search')}
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text testID="glossary-count" style={[styles.count, { color: theme.textMuted }]}>
          {t('glossary.count', { n: hitCount })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* 只有沒在搜尋時才放導言：搜尋結果上方再頂一段說明，只會把命中的詞條擠下去 */}
          {!search.trim() && (
            <Text style={[styles.intro, { color: theme.textMuted }]}>{t('glossary.intro')}</Text>
          )}

          {sections.map(section => (
            <View key={section.group} testID={`glossary-group-${section.group}`}>
              <Text style={[styles.groupTitle, { color: theme.textGold }]}>▎{t(GROUP_TITLE_KEYS[section.group])}</Text>
              {section.entries.map(entry => (
                <View
                  key={entry.key}
                  testID={`glossary-entry-${entry.key}`}
                  style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
                >
                  <View style={styles.termRow}>
                    <Text style={[styles.term, { color: theme.textPrimary }]}>{entry.term}</Text>
                    {/* 英文首見對照：術語本身不翻譯，en 讀者靠這一行把漢字對上意思 */}
                    {lang === 'en' && (
                      <Text style={[styles.gloss, { color: theme.textMuted }]}>{entry.gloss}</Text>
                    )}
                  </View>
                  <Text style={[styles.plain, { color: theme.textSecondary }]}>{entry.plain[lang]}</Text>
                  <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
                  <Text style={[styles.inAppLabel, { color: theme.textGold }]}>{t('glossary.inApp')}</Text>
                  <Text style={[styles.inApp, { color: theme.textSecondary }]}>{entry.inApp[lang]}</Text>
                </View>
              ))}
            </View>
          ))}

          {hitCount === 0 && (
            <Text testID="glossary-empty" style={[styles.empty, { color: theme.textMuted }]}>{t('glossary.notFound')}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backText: { fontSize: FontSize.body },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  headerSpacer: { width: 48 },
  controls: {
    paddingHorizontal: Spacing.md, width: '100%',
    maxWidth: Layout.maxContent, alignSelf: 'center',
  },
  searchInput: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.body, marginBottom: Spacing.sm,
  },
  count: { fontSize: 12, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 40, alignItems: 'center' },
  column: { width: '100%', maxWidth: Layout.maxContent },
  intro: { fontSize: FontSize.caption, lineHeight: 20, marginBottom: Spacing.md },
  groupTitle: {
    fontSize: FontSize.body, fontWeight: '700',
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  termRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  term: { fontSize: FontSize.body, fontWeight: '700' },
  gloss: { fontSize: FontSize.caption },
  plain: { fontSize: FontSize.small, lineHeight: 22 },
  divider: { height: 1, marginVertical: Spacing.sm },
  inAppLabel: { fontSize: FontSize.caption, fontWeight: '700', marginBottom: 2 },
  inApp: { fontSize: FontSize.small, lineHeight: 22 },
  empty: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSize.body },
});
