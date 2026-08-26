// 占驗回填 — 讓使用者事後標記這次占卜是否應驗
//
// 放在籤詩頁的最下方而非最上方：剛揭曉時結果尚未發生，
// 此處出現「準不準」的按鈕只會讓人困惑。真正會用到的是日後回訪時。

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { Icon } from './icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { OUTCOME_STATUSES, daysSince } from '@/services/verification';
import type { DivinationOutcome, OutcomeStatus } from '@/services/storage';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  outcome?: DivinationOutcome;
  /** 占卜當時的時間，用來顯示「占卜後 n 天回填」 */
  timestamp: number;
  onSave: (status: OutcomeStatus, note?: string) => void | Promise<void>;
  onClear: () => void | Promise<void>;
}

/** 三態各自的色調：應驗為吉、部分為平、未應驗為凶 */
function toneOf(theme: ThemeColors, status: OutcomeStatus): string {
  if (status === 'accurate') return theme.success;
  if (status === 'partial') return theme.warning;
  return theme.danger;
}

export default function OutcomeMarker({ outcome, timestamp, onSave, onClear }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();

  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<OutcomeStatus | null>(outcome?.status ?? null);
  const [note, setNote] = useState(outcome?.note ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!picked || saving) return;
    setSaving(true);
    try {
      await onSave(picked, note);
      setEditing(false);
    } finally {
      // 存檔失敗時也要解除鎖定，否則按鈕永遠停在「儲存中」而使用者無從重試
      setSaving(false);
    }
  }

  async function handleClear() {
    if (saving) return;
    setSaving(true);
    try {
      await onClear();
      setPicked(null);
      setNote('');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setPicked(outcome?.status ?? null);
    setNote(outcome?.note ?? '');
    setEditing(true);
  }

  // ── 已回填且不在編輯中：顯示結果摘要 ──
  if (outcome && !editing) {
    const tone = toneOf(theme, outcome.status);
    const delay = daysSince(timestamp, outcome.verifiedAt);

    return (
      <View style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.textGold }]}>▎{t('outcome.title')}</Text>
          <TouchableOpacity onPress={startEditing} accessibilityLabel={t('outcome.editLabel')}>
            <Text style={[styles.editLink, { color: theme.textMuted }]}>{t('outcome.edit')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultRow}>
          <View style={[styles.badge, { borderColor: tone }]}>
            <Text style={[styles.badgeText, { color: tone }]}>
              {t(`outcome.${outcome.status}`)}
            </Text>
          </View>
          <Text style={[styles.delay, { color: theme.textMuted }]}>
            {t('outcome.delay', { n: delay })}
          </Text>
        </View>

        {outcome.note ? (
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>{outcome.note}</Text>
        ) : null}
      </View>
    );
  }

  // ── 未回填，或正在編輯：顯示選項 ──
  return (
    <View style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textGold }]}>▎{t('outcome.title')}</Text>
        {editing && outcome ? (
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Text style={[styles.editLink, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.prompt, { color: theme.textSecondary }]}>
        {t('outcome.prompt')}
      </Text>

      <View style={styles.options}>
        {OUTCOME_STATUSES.map(status => {
          const active = picked === status;
          const tone = toneOf(theme, status);
          return (
            <TouchableOpacity
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.option,
                { borderColor: active ? tone : theme.bgMedium },
                active && { backgroundColor: tone + '20' },
              ]}
              onPress={() => setPicked(status)}
            >
              <Text style={[styles.optionText, { color: active ? tone : theme.textMuted }]}>
                {t(`outcome.${status}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.input, {
          backgroundColor: theme.bgCard,
          borderColor: theme.goldFaint,
          color: theme.textPrimary,
        }]}
        placeholder={t('outcome.notePlaceholder')}
        placeholderTextColor={theme.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={200}
      />

      <View style={styles.actions}>
        {outcome ? (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: theme.bgMedium }]}
            onPress={handleClear}
            disabled={saving}
          >
            <Icon name="trash" size={14} color={theme.textMuted} />
            <Text style={[styles.clearText, { color: theme.textMuted }]}> {t('common.clear')}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { borderColor: picked ? theme.gold : theme.bgMedium },
            !picked && styles.saveDisabled,
          ]}
          onPress={handleSave}
          disabled={!picked || saving}
          accessibilityState={{ disabled: !picked || saving }}
        >
          <Icon name="check" size={14} color={picked ? theme.gold : theme.textMuted} />
          <Text style={[styles.saveText, { color: picked ? theme.gold : theme.textMuted }]}>
            {' '}{t(saving ? 'common.saving' : 'outcome.saveBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  box: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.body, fontWeight: '600' },
  editLink: { fontSize: FontSize.caption },
  prompt: { fontSize: FontSize.small, lineHeight: 20, marginBottom: Spacing.md },
  options: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  option: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  optionText: { fontSize: FontSize.small, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.small, minHeight: 64,
    textAlignVertical: 'top', marginBottom: Spacing.sm,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  saveBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 10,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { fontSize: FontSize.small, fontWeight: '600' },
  clearBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: Spacing.md,
  },
  clearText: { fontSize: FontSize.small },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: FontSize.small, fontWeight: '700' },
  delay: { fontSize: FontSize.caption },
  noteText: { fontSize: FontSize.small, lineHeight: 22 },
});
