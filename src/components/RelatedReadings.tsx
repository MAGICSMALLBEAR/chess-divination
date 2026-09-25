// 同一件事的占卜 — 連結先前那一次，並把兩次的卦象並列
//
// 為什麼由使用者手動連結，而不是 App 判斷「這兩次問的是同一件事」：沒有可靠的自動判準
// （見 storage.ts 的 relatedTo 與 services/related.ts）。這裡唯一的自動行為是「建議」：
// 問題文字完全相同時，把那一筆點名出來，仍要使用者按下連結才成立。
//
// 並列只陳述「相同／不同」，不替使用者決定該信哪一次——傳統說法（一事不二占、以初次為主）
// 寫在說明裡，但那是通行說法，不是這個 App 算出來的結論。
//
// 自帶資料讀取（與 AccuracyHint 同一個做法）：揭曉頁與靈棋頁是兩個入口，
// 元件自己認 recordId，兩邊就不必各自接一套讀取與重新整理。
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getHistory, linkRelatedRecord, unlinkRelatedRecord, type DivinationRecord } from '@/services/storage';
import {
  relatedCandidates, suggestedPrevious, resolvePrevious, laterAsks,
  summarizeReading, compareReadings, formatShortDate,
} from '@/services/related';
import { recordTitle } from '@/services/poemList';
import { recordLink } from '@/services/recordLink';
import { notify } from '@/services/dialog';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  /** 這次占卜的記錄 id；還沒存成記錄時（尚未完成占卜）不渲染 */
  recordId?: string;
}

export default function RelatedReadings({ recordId }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useI18n();
  const [all, setAll] = useState<DivinationRecord[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reload = useCallback(async () => { setAll(await getHistory()); }, []);
  useEffect(() => { if (recordId) void reload(); }, [recordId, reload]);

  const current = recordId ? all.find(r => r.id === recordId) : undefined;
  if (!current) return null;

  const previous = resolvePrevious(current, all);
  const later = laterAsks(current, all);
  const suggestion = suggestedPrevious(current, all);
  const candidates = relatedCandidates(current, all);

  // 沒有前一次、沒有之後、也沒有任何較早的記錄可連結：沒有東西可說，整塊不出現
  if (!previous && later.length === 0 && candidates.length === 0) return null;

  async function link(previousId: string) {
    const ok = await linkRelatedRecord(current!.id, previousId);
    setPickerOpen(false);
    // 選單開著時，前一筆可能剛被刪掉。要當面說，不能讓使用者以為連上了
    if (!ok) notify(t('related.linkFailed'));
    await reload();
  }

  async function unlink() {
    await unlinkRelatedRecord(current!.id);
    await reload();
  }

  const describe = (r: DivinationRecord) => `${formatShortDate(r.timestamp, lang)} · ${recordTitle(r)}`;

  return (
    <View testID="related-readings">
      {previous && (() => {
        const cmp = compareReadings(previous, current);
        const a = summarizeReading(previous);
        const b = summarizeReading(current);
        // 兩邊都沒有的欄位不列；不可逐項比（六爻對靈棋）時只列名稱
        const rows: { label: string; prev?: string; now?: string }[] = [
          { label: t('liuyao.primary'), prev: a.name, now: b.name },
          ...(cmp.comparable ? [
            { label: t('liuyao.changed'), prev: a.changedName, now: b.changedName },
            { label: t('related.rowMoving'), prev: a.movingLineName, now: b.movingLineName },
            { label: t('related.rowLevel'), prev: a.level, now: b.level },
          ] : []),
        ].filter(row => row.prev !== undefined || row.now !== undefined);

        return (
          <View style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.title, { color: theme.textGold }]}>▎{t('related.title')}</Text>

            <TouchableOpacity
              testID="related-prev"
              accessibilityRole="link"
              onPress={() => router.push(recordLink(previous))}
            >
              <Text style={[styles.prevLink, { color: theme.textPrimary }]}>
                {t('related.previous')}：{describe(previous)} →
              </Text>
              {previous.questionText ? (
                <Text style={[styles.question, { color: theme.textMuted }]} numberOfLines={1}>
                  {previous.questionText}
                </Text>
              ) : null}
            </TouchableOpacity>

            <View testID="related-compare" style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.cellLabel, { color: theme.textMuted }]} />
                <Text style={[styles.cellHead, { color: theme.textMuted }]}>{t('related.previous')}</Text>
                <Text style={[styles.cellHead, { color: theme.textMuted }]}>{t('related.thisTime')}</Text>
              </View>
              {rows.map(row => (
                <View key={row.label} style={[styles.tableRow, { borderTopColor: theme.bgMedium }]}>
                  <Text style={[styles.cellLabel, { color: theme.textMuted }]}>{row.label}</Text>
                  <Text style={[styles.cell, { color: theme.textSecondary }]}>{row.prev ?? '—'}</Text>
                  <Text style={[styles.cell, { color: theme.textPrimary }]}>{row.now ?? '—'}</Text>
                </View>
              ))}
            </View>

            {/* 只陳述相同或不同。說不出來（缺卦例資料）的項目就不說 */}
            {cmp.comparable ? (
              <View testID="related-facts">
                <Text style={[styles.fact, { color: theme.textSecondary }]}>
                  {t(cmp.samePrimary ? 'related.samePrimary' : 'related.diffPrimary')}
                </Text>
                {cmp.sameChanged !== null && (
                  <Text style={[styles.fact, { color: theme.textSecondary }]}>
                    {t(cmp.sameChanged ? 'related.sameChanged' : 'related.diffChanged')}
                  </Text>
                )}
                {/* 本卦相同、動爻不同的兩次並不是同一張盤——只看卦名會漏掉這個差別 */}
                {cmp.sameMoving !== null && (
                  <Text style={[styles.fact, { color: theme.textSecondary }]}>
                    {t(cmp.sameMoving ? 'related.sameMoving' : 'related.diffMoving')}
                  </Text>
                )}
              </View>
            ) : (
              <Text testID="related-facts" style={[styles.fact, { color: theme.textSecondary }]}>
                {t('related.notComparable')}
              </Text>
            )}

            {previous.outcome && (
              <Text testID="related-prev-outcome" style={[styles.fact, { color: theme.textSecondary }]}>
                {t('related.prevOutcome', { status: t(`outcome.${previous.outcome.status}`) })}
              </Text>
            )}

            <Text testID="related-note" style={[styles.note, { color: theme.textMuted }]}>{t('related.note')}</Text>

            <TouchableOpacity
              testID="related-unlink"
              accessibilityRole="button"
              style={styles.linkBtn}
              onPress={unlink}
            >
              <Text style={[styles.linkBtnText, { color: theme.textMuted }]}>{t('related.unlink')}</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {!previous && suggestion && (
        <View
          testID="related-suggestion"
          style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.goldFaint }]}
        >
          <Text style={[styles.fact, { color: theme.textSecondary }]}>
            {t('related.suggest', { desc: describe(suggestion) })}
          </Text>
          <TouchableOpacity
            testID="related-suggestion-link"
            accessibilityRole="button"
            style={[styles.suggestBtn, { borderColor: theme.gold }]}
            onPress={() => link(suggestion.id)}
          >
            <Text style={[styles.suggestBtnText, { color: theme.textGold }]}>{t('related.suggestLink')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!previous && candidates.length > 0 && (
        <TouchableOpacity
          testID="related-open"
          accessibilityRole="button"
          style={styles.linkBtn}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={[styles.linkBtnText, { color: theme.textGold }]}>{t('related.linkPrompt')} →</Text>
        </TouchableOpacity>
      )}

      {later.length > 0 && (
        <View testID="related-later" style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
          <Text style={[styles.fact, { color: theme.textSecondary }]}>{t('related.later', { n: later.length })}</Text>
          {later.map(r => (
            <TouchableOpacity
              key={r.id}
              testID={`related-later-${r.id}`}
              accessibilityRole="link"
              onPress={() => router.push(recordLink(r))}
            >
              <Text style={[styles.prevLink, { color: theme.textPrimary }]}>{describe(r)} →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* onRequestClose 是 Android 實體返回鍵的唯一出口（與 ShareTargetSheet 同理） */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <TouchableOpacity
            testID="related-picker"
            activeOpacity={1}
            style={[styles.sheet, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
            onPress={() => {}}
          >
            <Text style={[styles.sheetTitle, { color: theme.textGold }]}>{t('related.pickTitle')}</Text>
            <Text style={[styles.note, { color: theme.textMuted }]}>{t('related.pickHint')}</Text>
            <ScrollView style={styles.list}>
              {candidates.map(c => (
                <TouchableOpacity
                  key={c.record.id}
                  testID={`related-candidate-${c.record.id}`}
                  accessibilityRole="button"
                  style={[styles.candidate, { borderColor: theme.bgMedium, backgroundColor: theme.bgCard }]}
                  onPress={() => link(c.record.id)}
                >
                  <Text style={[styles.prevLink, { color: theme.textPrimary }]}>{describe(c.record)}</Text>
                  <Text style={[styles.question, { color: theme.textMuted }]} numberOfLines={1}>
                    {c.record.questionText || t('related.noQuestion')}
                  </Text>
                  {(c.sameQuestion || c.sameCategory) && (
                    <Text style={[styles.badge, { color: theme.textGold }]}>
                      {c.sameQuestion ? t('related.badgeSameQuestion') : t('related.badgeSameCategory')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              testID="related-picker-cancel"
              accessibilityRole="button"
              style={styles.cancel}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={[styles.linkBtnText, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  box: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm },
  prevLink: { fontSize: FontSize.small, lineHeight: 22 },
  question: { fontSize: FontSize.caption, lineHeight: 18 },
  table: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cellLabel: { width: 64, fontSize: FontSize.caption },
  cellHead: { flex: 1, fontSize: FontSize.caption, fontWeight: '600' },
  cell: { flex: 1, fontSize: FontSize.small },
  fact: { fontSize: FontSize.small, lineHeight: 22 },
  note: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.sm },
  linkBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm, marginBottom: Spacing.xs },
  linkBtnText: { fontSize: FontSize.caption, fontWeight: '600' },
  suggestBtn: {
    alignSelf: 'flex-start', marginTop: Spacing.sm,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  suggestBtnText: { fontSize: FontSize.small, fontWeight: '600' },
  overlay: {
    flex: 1, backgroundColor: t.scrim,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  sheet: {
    width: '100%', maxWidth: 420, maxHeight: '80%',
    borderRadius: 16, borderWidth: 1, padding: Spacing.lg,
  },
  sheetTitle: { fontSize: FontSize.subtitle, fontWeight: '700', textAlign: 'center' },
  list: { marginTop: Spacing.sm },
  candidate: {
    borderWidth: 1, borderRadius: 10, padding: Spacing.sm, marginBottom: Spacing.sm,
    minHeight: 44,
  },
  badge: { fontSize: FontSize.overline, fontWeight: '700', marginTop: 2 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
