// 結果頁的「問題」區塊：回顯當初問的事與問事類別，並可事後修正（路線圖 #34、#35）。
//
// 揭曉頁與靈棋頁共用。原本兩頁各自只印問題文字、沒有類別，也沒有任何修改入口——
// 打錯字、選錯類別都只能留著；選錯類別的代價不只是標籤，用神是依類別取的。
//
// 沒寫問題的記錄也顯示這個區塊（只有類別與「修改」），才補得上問題。

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useQuestionCategories } from '@/hooks/useQuestionCategories';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { categoryLabel } from '@/services/i18n';
import { notify } from '@/services/dialog';
import { toLocalDateString } from '@/services/date';
import { QUESTION_TEXT_MAX, updateRecordQuestion, type DivinationRecord } from '@/services/storage';

interface Props {
  record: Pick<DivinationRecord, 'id' | 'questionText' | 'questionCategory' | 'categoryChangedAt'>;
  /** 存好之後由頁面重讀記錄（解讀、用神、準確度提示都跟著類別變） */
  onSaved: () => void | Promise<void>;
}

export default function RecordQuestionBox({ record, onSaved }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const categories = useQuestionCategories();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  const current = record.questionCategory || 'general';

  function startEdit() {
    setText(record.questionText ?? '');
    setCategory(current);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await updateRecordQuestion(record.id, { questionText: text, questionCategory: category });
      setEditing(false);
      await onSaved();
    } catch (e) {
      console.warn('問題修改儲存失敗:', e);
      notify(t('error.saveFailed'), t('question.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <View testID="record-question" style={styles.box}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{t('reveal.question')}</Text>
          <TouchableOpacity
            testID="record-question-edit"
            accessibilityRole="button"
            accessibilityLabel={t('question.editA11y')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={startEdit}
          >
            <Text style={styles.editLink}>{t('question.edit')}</Text>
          </TouchableOpacity>
        </View>
        {record.questionText
          ? <Text style={styles.text}>{record.questionText}</Text>
          : <Text style={styles.empty}>{t('question.none')}</Text>}
        <Text testID="record-question-category" style={styles.meta}>
          {t('question.category', { name: categoryLabel(current) })}
        </Text>
        {record.categoryChangedAt !== undefined && Number.isFinite(record.categoryChangedAt) && (
          <Text testID="record-question-changed" style={styles.meta}>
            {t('question.categoryChanged', { date: toLocalDateString(new Date(record.categoryChangedAt)) })}
          </Text>
        )}
      </View>
    );
  }

  const changed = category !== current;
  return (
    <View testID="record-question" style={styles.box}>
      <Text style={styles.label}>{t('reveal.question')}</Text>
      <TextInput
        testID="record-question-input"
        style={[styles.input, { backgroundColor: theme.bgInk, borderColor: theme.bgMedium, color: theme.textPrimary }]}
        value={text}
        onChangeText={setText}
        placeholder={t('common.questionPlaceholder')}
        placeholderTextColor={theme.textMuted}
        multiline
        maxLength={QUESTION_TEXT_MAX}
        textAlignVertical="top"
      />
      <Text style={[styles.label, { marginTop: Spacing.sm }]}>{t('question.categoryLabel')}</Text>
      <View style={styles.chips}>
        {categories.map(c => (
          <TouchableOpacity
            key={c.key}
            testID={`record-question-cat-${c.key}`}
            accessibilityRole="button"
            aria-selected={category === c.key}
            style={[styles.chip, category === c.key && { borderColor: theme.gold, backgroundColor: theme.bgInk }]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.chipText, category === c.key && { color: theme.textGold }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 改類別的後果要在按下儲存之前講：用神會換，這一卦的斷語跟著變 */}
      {changed && (
        <Text testID="record-question-cat-warning" style={styles.warning}>{t('question.categoryWarning')}</Text>
      )}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="record-question-cancel"
          accessibilityRole="button"
          style={styles.cancelBtn}
          onPress={() => setEditing(false)}
          disabled={saving}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="record-question-save"
          accessibilityRole="button"
          style={[styles.saveBtn, { backgroundColor: theme.gold }, saving && { opacity: 0.5 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={[styles.saveText, { color: theme.bgInk }]}>{t('question.save')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: t.bgDark, borderRadius: 12,
    borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: FontSize.caption, color: t.textGold, marginBottom: 4, fontWeight: '600' },
  editLink: { fontSize: FontSize.caption, color: t.textGold, fontWeight: '600' },
  text: { fontSize: FontSize.body, color: t.textSecondary, lineHeight: 24, fontStyle: 'italic' },
  empty: { fontSize: FontSize.small, color: t.textMuted },
  meta: { fontSize: FontSize.caption, color: t.textMuted, marginTop: 6 },
  input: {
    borderWidth: 1, borderRadius: 8, padding: Spacing.sm,
    minHeight: 72, fontSize: FontSize.body,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1, borderColor: t.bgMedium, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, justifyContent: 'center',
  },
  chipText: { fontSize: FontSize.small, color: t.textSecondary },
  warning: { fontSize: FontSize.caption, color: t.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: 10, justifyContent: 'center' },
  cancelText: { fontSize: FontSize.small, color: t.textMuted },
  saveBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  saveText: { fontSize: FontSize.small, fontWeight: '700' },
});
