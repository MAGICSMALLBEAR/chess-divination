// 易經學習 — 八卦、八卦五行、六十四卦的抽認卡，以間隔重複排複習
//
// 與詞典的分工：詞典解釋「這個詞是什麼意思」，這一頁練「看到卦形認得出來」。
// 出題、排程、儲存全在 services/learning.ts；這一頁只管流程與呈現。
//
// 版面單欄限寬（Layout.maxContent），理由同詞典：一次只看一題，多欄沒有意義。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import HexagramLines from '@/components/HexagramLines';
import {
  DECKS, LEITNER_INTERVALS, NEW_PER_SESSION, trigramLabel, trigramLinesOf,
  buildQuestion, deckSummary, sessionQueue, getLearningState, recordAnswer,
  type Card, type DeckId, type LearningState, type Question,
} from '@/services/learning';
import { TRIGRAM_ELEMENTS, YANG, type LineValue } from '@/services/hexagram';
import { todayString } from '@/services/date';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { Spacing, FontSize, Layout } from '@/constants/theme';

/** 牌組名稱與說明的譯文鍵。寫成字面量對照表，理由同詞典頁的 GROUP_TITLE_KEYS */
const DECK_TITLE_KEYS: Record<DeckId, string> = {
  trigram: 'learn.deckTrigram', trigramElement: 'learn.deckElement', hexagram: 'learn.deckHexagram',
};
const DECK_DESC_KEYS: Record<DeckId, string> = {
  trigram: 'learn.deckTrigramDesc', trigramElement: 'learn.deckElementDesc', hexagram: 'learn.deckHexagramDesc',
};
const DECK_PROMPT_KEYS: Record<DeckId, string> = {
  trigram: 'learn.promptTrigram', trigramElement: 'learn.promptElement', hexagram: 'learn.promptHexagram',
};

interface Session {
  deck: DeckId;
  queue: Card[];
  position: number;
  question: Question;
  picked: string | null;
  correct: number;
}

export default function LearnScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [state, setState] = useState<LearningState>({});
  // 今天的日期在掛載後才取：預渲染與 hydration 若各取一次，跨午夜時兩邊對不上（S66 同一個坑）
  const [today, setToday] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [finished, setFinished] = useState<{ deck: DeckId; correct: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    setToday(todayString());
    setState(await getLearningState());
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const describeLines = useCallback(
    (lines: LineValue[]) => t('learn.linesLabel', {
      lines: lines.map(v => t(v === YANG ? 'learn.yang' : 'learn.yin')).join(t('learn.listSeparator')),
    }),
    [t],
  );

  function start(deck: DeckId) {
    if (!today) return;
    const queue = sessionQueue(deck, state, today);
    if (queue.length === 0) return;
    setFinished(null);
    setSession({ deck, queue, position: 0, question: buildQuestion(queue[0]), picked: null, correct: 0 });
  }

  async function pick(option: string) {
    if (!session || session.picked !== null || !today) return;
    const correct = option === session.question.answer;
    setSession({ ...session, picked: option, correct: session.correct + (correct ? 1 : 0) });
    setState(await recordAnswer(session.question.card.id, correct, today));
  }

  function next() {
    if (!session) return;
    const position = session.position + 1;
    if (position >= session.queue.length) {
      setFinished({ deck: session.deck, correct: session.correct, total: session.queue.length });
      setSession(null);
      return;
    }
    setSession({ ...session, position, question: buildQuestion(session.queue[position]), picked: null });
  }

  const summaries = useMemo(
    () => (today ? DECKS.map(deck => ({ deck, ...deckSummary(deck, state, today), next: sessionQueue(deck, state, today).length })) : []),
    [state, today],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (session ? setSession(null) : router.back())}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text testID="learn-title" style={[styles.title, { color: theme.textPrimary }]}>{t('learn.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {!session && (
            <>
              <Text style={[styles.intro, { color: theme.textMuted }]}>
                {t('learn.intro', { days: LEITNER_INTERVALS.join(t('learn.listSeparator')), n: NEW_PER_SESSION })}
              </Text>

              {finished && (
                <Text testID="learn-finished" style={[styles.finished, { color: theme.textGold }]}>
                  {t('learn.finished', { deck: t(DECK_TITLE_KEYS[finished.deck]), correct: finished.correct, total: finished.total })}
                </Text>
              )}

              {summaries.map(s => (
                <View
                  key={s.deck}
                  testID={`learn-deck-${s.deck}`}
                  style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
                >
                  <Text style={[styles.deckTitle, { color: theme.textPrimary }]}>{t(DECK_TITLE_KEYS[s.deck])}</Text>
                  <Text style={[styles.deckDesc, { color: theme.textSecondary }]}>{t(DECK_DESC_KEYS[s.deck])}</Text>
                  <Text testID={`learn-summary-${s.deck}`} style={[styles.summary, { color: theme.textMuted }]}>
                    {t('learn.summary', { seen: s.seen, total: s.total, mastered: s.mastered, due: s.due })}
                  </Text>
                  {s.next > 0 ? (
                    <TouchableOpacity
                      testID={`learn-start-${s.deck}`}
                      accessibilityRole="button"
                      style={[styles.startBtn, { borderColor: theme.gold }]}
                      onPress={() => start(s.deck)}
                    >
                      <Text style={[styles.startText, { color: theme.textGold }]}>{t('learn.start', { n: s.next })}</Text>
                    </TouchableOpacity>
                  ) : (
                    // 沒有到期、也沒有新卡：明說什麼時候再來，而不是給一顆按了沒反應的按鈕
                    <Text testID={`learn-done-${s.deck}`} style={[styles.summary, { color: theme.textSecondary }]}>
                      {t('learn.nothingDue')}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {session && (() => {
            const q = session.question;
            const answered = session.picked !== null;
            return (
              <View testID="learn-session" style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
                <Text testID="learn-progress" style={[styles.summary, { color: theme.textMuted }]}>
                  {t(DECK_TITLE_KEYS[session.deck])} · {t('learn.progress', { n: session.position + 1, total: session.queue.length })}
                </Text>
                <Text style={[styles.prompt, { color: theme.textSecondary }]}>{t(DECK_PROMPT_KEYS[session.deck])}</Text>

                <View testID="learn-prompt" style={styles.promptBox}>
                  {q.prompt.kind === 'lines' ? (
                    <HexagramLines lines={q.prompt.lines} width={96} accessibilityLabel={describeLines(q.prompt.lines)} />
                  ) : (
                    <>
                      <HexagramLines
                        lines={trigramLinesOf(q.prompt.trigram)}
                        width={72}
                        accessibilityLabel={describeLines(trigramLinesOf(q.prompt.trigram))}
                      />
                      <Text style={[styles.promptName, { color: theme.textPrimary }]}>{trigramLabel(q.prompt.trigram)}</Text>
                    </>
                  )}
                </View>

                <View style={styles.options}>
                  {q.options.map(option => {
                    const isAnswer = option === q.answer;
                    const isPicked = option === session.picked;
                    const border = !answered ? theme.bgMedium
                      : isAnswer ? theme.success : isPicked ? theme.danger : theme.bgMedium;
                    return (
                      <TouchableOpacity
                        key={option}
                        testID={`learn-option-${option}`}
                        accessibilityRole="button"
                        aria-selected={isPicked}
                        disabled={answered}
                        style={[styles.option, { borderColor: border }]}
                        onPress={() => pick(option)}
                      >
                        <Text style={[styles.optionText, { color: answered && isAnswer ? theme.success : theme.textPrimary }]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {answered && (
                  <View testID="learn-feedback">
                    <Text style={[styles.feedback, { color: session.picked === q.answer ? theme.success : theme.danger }]}>
                      {session.picked === q.answer ? t('learn.correct') : t('learn.wrong', { answer: q.answer })}
                    </Text>
                    {/* 換個方向再看一次答案：六十四卦拆回上下卦，八卦補上五行，五行牌補上卦象 */}
                    <Text testID="learn-explain" style={[styles.explain, { color: theme.textSecondary }]}>
                      {q.upper !== undefined && q.lower !== undefined
                        ? t('learn.explainHexagram', { upper: trigramLabel(q.upper), lower: trigramLabel(q.lower) })
                        : t('learn.explainTrigram', {
                          label: trigramLabel(q.card.index), element: TRIGRAM_ELEMENTS[q.card.index],
                        })}
                    </Text>
                    <TouchableOpacity
                      testID="learn-next"
                      accessibilityRole="button"
                      style={[styles.startBtn, { borderColor: theme.gold }]}
                      onPress={next}
                    >
                      <Text style={[styles.startText, { color: theme.textGold }]}>
                        {session.position + 1 >= session.queue.length ? t('learn.finish') : t('learn.next')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}
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
  list: { paddingHorizontal: Spacing.md, paddingBottom: 40, alignItems: 'center' },
  column: { width: '100%', maxWidth: Layout.maxContent },
  intro: { fontSize: FontSize.caption, lineHeight: 20, marginBottom: Spacing.md },
  finished: { fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.md },
  card: { borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  deckTitle: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 4 },
  deckDesc: { fontSize: FontSize.small, lineHeight: 22 },
  summary: { fontSize: FontSize.caption, lineHeight: 20, marginTop: Spacing.xs },
  startBtn: {
    alignSelf: 'flex-start', marginTop: Spacing.sm, minHeight: 44, justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: Spacing.md,
  },
  startText: { fontSize: FontSize.small, fontWeight: '600' },
  prompt: { fontSize: FontSize.small, marginTop: Spacing.sm },
  promptBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  promptName: { fontSize: FontSize.subtitle, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  option: {
    flexGrow: 1, flexBasis: '45%', minHeight: 48, borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm,
  },
  optionText: { fontSize: FontSize.body, fontWeight: '600' },
  feedback: { fontSize: FontSize.body, fontWeight: '700', marginTop: Spacing.md },
  explain: { fontSize: FontSize.small, lineHeight: 22, marginTop: 4 },
});
