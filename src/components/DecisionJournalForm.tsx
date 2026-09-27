// 決策日誌 — 占卜前先寫下自己的判斷（期待、依據、下一步），事後回填時對照
//
// 借自投資與決策科學的「決策日誌」：事後只看結果，會把運氣好說成判斷好。在結果還沒發生時
// 先記下當時怎麼想，回填時才分得出「想錯了」與「想對了但運氣不好」。
// 與預測校準（IntuitionPicker）的分工：校準記一個機率、可以統計；日誌記文字、只給自己對照，不統計。
//
// 刻意不要求填寫，也不送進 AI 解讀（理由見 storage.ts 的 DivinationRecord.decisionJournal）。
// 兩個元件：表單（三個占卜頁的問題步驟）與唯讀檢視（揭曉頁與靈棋頁的回填區上方）。
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  DECISION_JOURNAL_FIELDS, DECISION_JOURNAL_MAX, normalizeDecisionJournal, type DecisionJournal,
} from '@/services/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { Spacing, FontSize } from '@/constants/theme';

type Field = (typeof DECISION_JOURNAL_FIELDS)[number];

/** 欄位的譯文鍵。寫成字面量對照表，理由同詞典頁的 GROUP_TITLE_KEYS（翻譯鍵反向覆蓋認得字面量） */
const LABEL_KEYS: Record<Field, string> = {
  expectation: 'journal.expectation', evidence: 'journal.evidence', nextStep: 'journal.nextStep',
};
const PLACEHOLDER_KEYS: Record<Field, string> = {
  expectation: 'journal.expectationPlaceholder',
  evidence: 'journal.evidencePlaceholder',
  nextStep: 'journal.nextStepPlaceholder',
};

interface FormProps {
  value: DecisionJournal;
  onChange: (value: DecisionJournal) => void;
}

/** 問卜前的決策日誌表單。狀態原樣保留（含空白），整理交給存檔時的 normalizeDecisionJournal */
export default function DecisionJournalForm({ value, onChange }: FormProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  return (
    <View testID="decision-journal-form" style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <Text style={[styles.title, { color: theme.textGold }]}>{t('journal.title')}</Text>
      <Text style={[styles.desc, { color: theme.textMuted }]}>{t('journal.desc')}</Text>
      {DECISION_JOURNAL_FIELDS.map(key => (
        <View key={key} style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t(LABEL_KEYS[key])}</Text>
          <TextInput
            testID={`journal-${key}`}
            accessibilityLabel={t(LABEL_KEYS[key])}
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.goldFaint, backgroundColor: theme.bgCard }]}
            value={value[key] ?? ''}
            onChangeText={text => onChange({ ...value, [key]: text })}
            placeholder={t(PLACEHOLDER_KEYS[key])}
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={DECISION_JOURNAL_MAX}
            textAlignVertical="top"
          />
        </View>
      ))}
    </View>
  );
}

/**
 * 記錄上的決策日誌（唯讀）。放在回填區正上方：要回答「準不準」時，當時怎麼想就在眼前。
 * 沒寫日誌的記錄整個不畫——不留一個只有標題的空框。顯示端也過一次整理，不信任儲存值。
 */
export function DecisionJournalView({ journal }: { journal: unknown }) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const clean = normalizeDecisionJournal(journal);
  if (!clean) return null;
  return (
    <View testID="decision-journal-record" style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <Text style={[styles.title, { color: theme.textGold }]}>{t('journal.recordTitle')}</Text>
      {DECISION_JOURNAL_FIELDS.filter(key => clean[key]).map(key => (
        <View key={key} testID={`journal-record-${key}`} style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t(LABEL_KEYS[key])}</Text>
          <Text style={[styles.recorded, { color: theme.textPrimary }]}>{clean[key]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', borderWidth: 1, borderRadius: 12, padding: Spacing.md, marginTop: Spacing.md },
  title: { fontSize: FontSize.body, fontWeight: '700' },
  desc: { fontSize: FontSize.caption, lineHeight: 18, marginTop: 4 },
  field: { marginTop: Spacing.sm },
  label: { fontSize: FontSize.small, fontWeight: '600', marginBottom: 4 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: FontSize.small, lineHeight: 20 },
  recorded: { fontSize: FontSize.small, lineHeight: 22 },
});
