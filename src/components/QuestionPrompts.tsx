import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { questionPrompts } from '@/services/questionPrompts';
import { questionCategoryDomain } from '@/services/questionCategories';
import { useQuestionCategories } from '@/hooks/useQuestionCategories';
import { Icon } from '@/components/icons';
import { FontSize, Spacing } from '@/constants/theme';

interface Props {
  category: string;
  onCategoryChange: (category: string) => void;
  onSelect: (question: string) => void;
}

const DOMAIN_GROUPS = [
  ['general'],
  ['marriage', 'relationship', 'reconciliation'],
  ['career', 'jobSearch', 'promotion', 'workplace', 'business'],
  ['wealth', 'cashflow'],
  ['study', 'exam'],
  ['health', 'wellbeing'],
  ['travel', 'relocation'],
];

const PROMPTS_PER_PAGE = 4;

export default function QuestionPrompts({ category, onCategoryChange, onSelect }: Props) {
  const { theme } = useAppTheme();
  const { t, lang } = useI18n();
  const categories = useQuestionCategories();
  const [page, setPage] = useState(0);
  const selectedDomain = questionCategoryDomain(category);
  const categoryByKey = useMemo(() => new Map(categories.map(item => [item.key, item])), [categories]);
  const domains = useMemo(() => {
    const builtIn = DOMAIN_GROUPS.map(keys => keys.map(key => categoryByKey.get(key)).filter(Boolean));
    const custom = categories.filter(item => item.isCustom);
    return custom.length > 0 ? [...builtIn, custom] : builtIn;
  }, [categories, categoryByKey]);
  const activeGroup = domains.find(group => group.some(item => item?.key === category))
    ?? domains.find(group => group.some(item => item?.key === selectedDomain))
    ?? domains[0];
  const categoryLabel = categoryByKey.get(category)?.label ?? category;
  const allPrompts = questionPrompts(category, categoryLabel, lang);
  const promptPageCount = Math.max(1, Math.ceil(allPrompts.length / PROMPTS_PER_PAGE));
  const prompts = allPrompts.slice((page % promptPageCount) * PROMPTS_PER_PAGE, (page % promptPageCount + 1) * PROMPTS_PER_PAGE);

  useEffect(() => setPage(0), [category, lang]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{t('prompts.domain')}</Text>
      <View style={styles.domainGrid}>
        {domains.map(group => {
          const primary = group[0];
          if (!primary) return null;
          const isActive = group.some(item => item?.key === category || questionCategoryDomain(item?.key) === selectedDomain);
          return (
            <TouchableOpacity
              key={primary.key}
              onPress={() => onCategoryChange(primary.key)}
              style={[styles.domain, { backgroundColor: theme.bgCard, borderColor: theme.bgMedium }, isActive && { backgroundColor: theme.bgMedium, borderColor: theme.gold }]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Icon name={primary.icon} size={20} color={isActive ? theme.gold : theme.textMuted} />
              <Text style={[styles.domainText, { color: isActive ? theme.textGold : theme.textSecondary }]}>{primary.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeGroup && activeGroup.length > 1 && (
        <>
          <View style={styles.scenarioHeading}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('prompts.scenario')}</Text>
            <Text style={[styles.scenarioHint, { color: theme.textMuted }]}>{t('prompts.scenarioHint')}</Text>
          </View>
          <View style={styles.scenarioList}>
            {activeGroup.map(item => item && (
              <TouchableOpacity
                key={item.key}
                onPress={() => onCategoryChange(item.key)}
                style={[styles.scenario, { backgroundColor: theme.bgMedium }, category === item.key && { backgroundColor: theme.gold }]}
                accessibilityRole="button"
                accessibilityState={{ selected: category === item.key }}
              >
                <Text style={{ color: category === item.key ? theme.textInverse : theme.textSecondary }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.promptHeading}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('prompts.label')}</Text>
        {allPrompts.length > PROMPTS_PER_PAGE && (
          <TouchableOpacity onPress={() => setPage(current => current + 1)} accessibilityRole="button">
            <Text style={[styles.shuffle, { color: theme.textGold }]}>{t('prompts.shuffle')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.list}>
        {prompts.map(prompt => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onSelect(prompt)}
            style={[styles.prompt, { backgroundColor: theme.bgCard, borderColor: theme.bgMedium }]}
            accessibilityRole="button"
            accessibilityLabel={t('prompts.a11y', { prompt })}
          >
            <Text style={[styles.promptText, { color: theme.textSecondary }]}>{prompt}</Text>
            <Text style={[styles.plus, { color: theme.textGold }]}>＋</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.editHint, { color: theme.textMuted }]}>{t('prompts.editHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: Spacing.md },
  label: { fontSize: FontSize.caption, marginBottom: 6 },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  domain: { width: '31%', minHeight: 66, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  domainText: { fontSize: FontSize.caption, textAlign: 'center' },
  scenarioHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.md },
  scenarioHint: { fontSize: FontSize.caption },
  scenarioList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scenario: { borderRadius: 99, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  promptHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.md },
  shuffle: { fontSize: FontSize.caption },
  list: { gap: Spacing.sm },
  prompt: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  promptText: { flex: 1, fontSize: FontSize.caption, lineHeight: 19 },
  plus: { fontSize: 20, lineHeight: 20 },
  editHint: { fontSize: FontSize.caption, marginTop: Spacing.sm, textAlign: 'center' },
});
