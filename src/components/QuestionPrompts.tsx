import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { questionPrompts } from '@/services/questionPrompts';
import { FontSize, Spacing } from '@/constants/theme';

interface Props {
  category: string;
  categoryLabel: string;
  onSelect: (question: string) => void;
}

export default function QuestionPrompts({ category, categoryLabel, onSelect }: Props) {
  const { theme } = useAppTheme();
  const { t, lang } = useI18n();
  const prompts = questionPrompts(category, categoryLabel, lang);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{t('prompts.label')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {prompts.map(prompt => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onSelect(prompt)}
            style={[styles.chip, { backgroundColor: theme.bgCard, borderColor: theme.bgMedium }]}
            accessibilityRole="button"
            accessibilityLabel={t('prompts.a11y', { prompt })}
          >
            <Text numberOfLines={2} style={[styles.chipText, { color: theme.textSecondary }]}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: Spacing.md },
  label: { fontSize: FontSize.caption, marginBottom: 6 },
  list: { gap: Spacing.sm, paddingRight: Spacing.md },
  chip: { width: 210, borderWidth: 1, borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: 9 },
  chipText: { fontSize: FontSize.caption, lineHeight: 18 },
});
