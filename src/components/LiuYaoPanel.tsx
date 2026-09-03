// 六爻卦例展示：本卦 → 互卦 → 變卦 + 體用生剋

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HexagramLines from './HexagramLines';
import { trigramLabel, type LiuYaoReading, type HexagramInfo } from '@/services/liuyao';
import { hourBranchName } from '@/services/date';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { Spacing, FontSize } from '@/constants/theme';
import { getMovingLineGuidance } from '@/services/yaoReading';
import { buildNaJiaReading, transformedLineRelation, type NaJiaLine } from '@/services/najja';
import { useGodForCategory, type DivinerGender } from '@/services/useGod';
import { questionCategoryDomain } from '@/services/questionCategories';
import { judgeUseGod } from '@/services/wenwang';

interface Props {
  reading: LiuYaoReading;
  hourBranch?: number;
  castAt?: Date;
  questionCategory?: string;
  /** 占者性別，只影響感情問事的用神取法 */
  divinerGender?: DivinerGender;
}

const LEVEL_TONE: Record<string, 'good' | 'neutral' | 'bad'> = {
  大吉: 'good', 吉: 'good', 平: 'neutral', 小凶: 'bad', 凶: 'bad',
};

/** 旺相為得時、休為持平、囚死為失時 */
const STRENGTH_TONE: Record<string, 'good' | 'neutral' | 'bad'> = {
  旺: 'good', 相: 'good', 休: 'neutral', 囚: 'bad', 死: 'bad',
};

export default function LiuYaoPanel({
  reading, hourBranch, castAt, questionCategory, divinerGender,
}: Props) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const {
    primary, nuclear, changed, movingLine, movingLineName,
    bodyUse, strength, finalLevel,
  } = reading;

  function colorFor(tone: 'good' | 'neutral' | 'bad') {
    return tone === 'good' ? theme.success : tone === 'bad' ? theme.danger : theme.warning;
  }

  // 徽章顯示調整後的斷語——那才是使用者該據以行動的結論
  const toneColor = colorFor(LEVEL_TONE[finalLevel] || 'neutral');
  const strengthColor = colorFor(STRENGTH_TONE[strength.state] || 'neutral');
  const adjusted = finalLevel !== bodyUse.level;
  const movingGuidance = getMovingLineGuidance(primary.poemId, movingLine, finalLevel);
  const naJia = buildNaJiaReading(primary.upper, primary.lower, primary.poemId, primary.lines, castAt);
  const changedNaJia = buildNaJiaReading(changed.upper, changed.lower, changed.poemId, changed.lines, castAt);
  const primaryMovingNaJia = naJia?.lines[movingLine - 1];
  const changedMovingNaJia = changedNaJia?.lines[movingLine - 1];
  const changingRelation = primaryMovingNaJia && changedMovingNaJia
    ? transformedLineRelation(primaryMovingNaJia.element, changedMovingNaJia.element)
    : null;
  const useGod = useGodForCategory(questionCategory, { gender: divinerGender });
  // 只有取法明確的問事類別才取得到用神；取不到就不出斷語，
  // 硬猜身分反而會給出看似精確、其實無根據的結論
  const verdict = naJia && useGod
    ? judgeUseGod({
        reading: naJia,
        changed: changedNaJia,
        movingLine,
        subject: useGod.subject,
        favorable: useGod.favorable,
        taboo: useGod.taboo,
        at: castAt,
      })
    : null;
  // 感情是唯一取法取決於占者性別的類別。沒設定就靜靜不出斷語，
  // 使用者只會覺得功能壞了——說明缺什麼才有辦法補。
  // 比對的是映回後的主類別：「關係經營」「復合」等子領域走的是同一套
  // 取法，只認 'marriage' 的話它們會沒有斷語也沒有補設定的提示。
  const needsGender = questionCategoryDomain(questionCategory) === 'marriage' && !divinerGender;
  // 世爻為用時盤面上沒有六親可標，改標世爻本身
  const marksUseGod = (line: NaJiaLine) =>
    useGod?.subject === '世爻'
      ? line.isWorld
      : !!useGod?.relatives.includes(line.relative);

  const columns: { info: HexagramInfo; caption: string; hint: string; moving?: number }[] = [
    { info: primary, caption: t('liuyao.primary'), hint: t('liuyao.primaryHint'), moving: movingLine },
    { info: nuclear, caption: t('liuyao.nuclear'), hint: t('liuyao.nuclearHint') },
    { info: changed, caption: t('liuyao.changed'), hint: t('liuyao.changedHint') },
  ];

  return (
    <View style={[styles.box, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textGold }]}>▎{t('liuyao.title')}</Text>
        {hourBranch ? (
          <Text style={[styles.hour, { color: theme.textMuted }]}>
            {t('liuyao.castAt', { hour: hourBranchName(hourBranch) })}
          </Text>
        ) : null}
      </View>

      {/* 三卦並列 */}
      <View style={styles.columns}>
        {columns.map(({ info, caption, hint, moving }) => (
          <View key={caption} style={styles.column}>
            <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text>
            <HexagramLines lines={info.lines} movingLine={moving} width={52} />
            <Text style={[styles.hexName, { color: theme.textPrimary }]}>{info.name}</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
          </View>
        ))}
      </View>

      {/* 動爻 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <Text style={[styles.movingText, { color: theme.textSecondary }]}> 
        {t('liuyao.moving', { name: movingLineName, n: movingLine })}
      </Text>
      <View style={[styles.yaoBox, { borderColor: theme.bgMedium, backgroundColor: theme.bgInk }]}>
        <Text style={[styles.yaoLabel, { color: theme.textGold }]}>{t('liuyao.yaoReading')}</Text>
        {movingGuidance.classicalText ? (
          <>
            <Text style={[styles.classicalText, { color: theme.textPrimary }]}>
              {movingGuidance.classicalText}
            </Text>
            <Text style={[styles.sourceNote, { color: theme.textMuted }]}>{t('liuyao.yaoSource')}</Text>
          </>
        ) : (
          <Text style={[styles.sourceNote, { color: theme.textMuted }]}>{t('liuyao.yaoPending')}</Text>
        )}
        <Text style={[styles.yaoPlain, { color: theme.textSecondary }]}>{movingGuidance.plainLanguage}</Text>
        <Text style={[styles.yaoAction, { color: theme.success }]}>◎ {movingGuidance.action}</Text>
      </View>

      {naJia && (
        <View style={[styles.najjaBox, { borderColor: theme.bgMedium, backgroundColor: theme.bgInk }]}>
          <Text style={[styles.yaoLabel, { color: theme.textGold }]}>{t('liuyao.najjaTitle')}</Text>
          <Text style={[styles.sourceNote, { color: theme.textMuted }]}>
            {t('liuyao.najjaMeta', { palace: naJia.palace, element: naJia.palaceElement, generation: naJia.generation, day: naJia.dayStemBranch, month: naJia.monthBranch, xun: naJia.xun, void: naJia.voidBranches.join('') })}
          </Text>
          {useGod && (
            <Text style={[styles.useGodText, { color: theme.warning }]}>
              {useGod.description}
            </Text>
          )}
          {needsGender && (
            <Text style={[styles.useGodText, { color: theme.textMuted }]}>
              {t('liuyao.useGodGenderHint')}
            </Text>
          )}
          {naJia.lines.slice().reverse().map(line => (
            <View key={line.position} style={styles.najjaRow}>
              <Text style={[styles.najjaPosition, { color: theme.textMuted }]}>{line.name}</Text>
              <Text style={[styles.najjaText, { color: theme.textSecondary }]}>{line.spirit}　{line.relative}　{line.stemBranch} {line.element}</Text>
              <Text style={[styles.najjaMarker, { color: theme.success }]}> 
                {[
                  line.isWorld ? t('liuyao.world') : line.isResponding ? t('liuyao.responding') : '',
                  marksUseGod(line) ? t('liuyao.useGod') : '',
                  line.isVoid ? t('liuyao.void') : '',
                  line.isMonthBroken ? t('liuyao.monthBroken') : '',
                  line.isDayClashed ? t('liuyao.dayClash') : '',
                ].join('')}
              </Text>
            </View>
          ))}
          {primaryMovingNaJia && changedMovingNaJia && changingRelation && (
            <View style={[styles.transformBox, { borderColor: theme.bgMedium }]}>
              <Text style={[styles.transformTitle, { color: theme.textGold }]}>{t('liuyao.transformTitle')}</Text>
              <Text style={[styles.transformText, { color: theme.textSecondary }]}>
                {t('liuyao.transformText', {
                  from: `${primaryMovingNaJia.stemBranch}${primaryMovingNaJia.element}`,
                  to: `${changedMovingNaJia.stemBranch}${changedMovingNaJia.element}`,
                  relation: changingRelation,
                })}
              </Text>
            </View>
          )}
          {/* 伏神：卦中不現的六親，用神不上卦時的唯一依據 */}
          {naJia.hidden.length > 0 && (
            <View style={[styles.transformBox, { borderColor: theme.bgMedium }]}>
              <Text style={[styles.transformTitle, { color: theme.textGold }]}>{t('liuyao.hiddenTitle')}</Text>
              {naJia.hidden.map(h => (
                <Text
                  key={`${h.position}-${h.relative}`}
                  style={[styles.transformText, { color: theme.textSecondary }]}
                >
                  {t('liuyao.hiddenRow', {
                    relative: h.relative,
                    stemBranch: h.stemBranch,
                    element: h.element,
                    position: h.position,
                    flying: h.flyingStemBranch,
                  })}
                  <Text style={{ color: h.canEmerge ? theme.success : theme.danger }}>
                    {t(h.canEmerge ? 'liuyao.hiddenOpen' : 'liuyao.hiddenBlocked', { relation: h.relation })}
                  </Text>
                </Text>
              ))}
              <Text style={[styles.sourceNote, { color: theme.textMuted }]}>{t('liuyao.hiddenNote')}</Text>
            </View>
          )}

          {/* 用神斷語：把整張盤收斂成「所問之事如何」 */}
          {verdict && (
            <View style={[styles.transformBox, { borderColor: theme.goldFaint }]}>
              <Text style={[styles.transformTitle, { color: theme.textGold }]}>{t('liuyao.verdictTitle')}</Text>
              <Text style={[styles.verdictLine, { color: colorFor(LEVEL_TONE[verdict.verdict] || 'neutral') }]}>
                {t('liuyao.verdictLine', {
                  relative: verdict.subject === '世爻'
                    ? t('liuyao.verdictWorld', { relative: verdict.relative ?? '' })
                    : verdict.subject,
                  verdict: verdict.verdict,
                })}
              </Text>
              {verdict.reasons.map((reason, i) => (
                <Text key={i} style={[styles.verdictReason, { color: theme.textSecondary }]}>
                  · {reason.label}
                  {reason.score !== 0 && (
                    <Text style={{ color: reason.score > 0 ? theme.success : theme.danger }}>
                      {` ${reason.score > 0 ? '+' : ''}${reason.score}`}
                    </Text>
                  )}
                </Text>
              ))}
              <Text style={[styles.sourceNote, { color: theme.textMuted }]}>{t('liuyao.verdictNote')}</Text>
            </View>
          )}

          <Text style={[styles.sourceNote, { color: theme.textMuted }]}>{t('liuyao.najjaNote')}</Text>
        </View>
      )}

      {/* 體用 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <View style={styles.bodyUseRow}>
        <Text style={[styles.bodyUseLabel, { color: theme.textMuted }]}>
          {t('liuyao.bodyUse', {
            body: trigramLabel(bodyUse.body),
            use: trigramLabel(bodyUse.use),
          })}
        </Text>
        <View style={[styles.badge, { borderColor: toneColor }]}>
          <Text style={[styles.badgeText, { color: toneColor }]}>
            {bodyUse.relation} · {finalLevel}
          </Text>
        </View>
      </View>
      <Text style={[styles.bodyUseText, { color: theme.textSecondary }]}>{bodyUse.text}</Text>

      {/* 月建旺衰：體卦五行在起卦當月是否得時 */}
      <View style={[styles.divider, { backgroundColor: theme.bgMedium }]} />
      <View style={styles.bodyUseRow}>
        <Text style={[styles.bodyUseLabel, { color: theme.textMuted }]}>
          {t('liuyao.season', {
            month: strength.monthBranchName,
            term: strength.solarTerm,
            season: strength.season,
            element: strength.seasonElement,
            bodyElement: strength.bodyElement,
          })}
        </Text>
        <View style={[styles.badge, { borderColor: strengthColor }]}>
          <Text style={[styles.badgeText, { color: strengthColor }]}>{strength.state}</Text>
        </View>
      </View>
      <Text style={[styles.bodyUseText, { color: theme.textSecondary }]}>{strength.text}</Text>
      {adjusted && (
        <Text style={[styles.adjustNote, { color: theme.textMuted }]}>
          {t('liuyao.adjusted', { from: bodyUse.level, to: finalLevel })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%', borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.body, fontWeight: '600' },
  hour: { fontSize: FontSize.caption },
  columns: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  column: { flex: 1, alignItems: 'center' },
  caption: { fontSize: FontSize.caption, marginBottom: Spacing.sm },
  hexName: {
    fontSize: FontSize.small, fontWeight: '600',
    marginTop: Spacing.sm, textAlign: 'center',
  },
  hint: { fontSize: FontSize.overline, marginTop: 2, textAlign: 'center' },
  divider: { height: 1, marginVertical: Spacing.md },
  movingText: { fontSize: FontSize.small, lineHeight: 22 },
  yaoBox: { borderWidth: 1, borderRadius: 10, padding: Spacing.sm, marginTop: Spacing.sm },
  yaoLabel: { fontSize: FontSize.caption, fontWeight: '700', marginBottom: 4 },
  classicalText: { fontSize: FontSize.body, fontWeight: '600', lineHeight: 26 },
  sourceNote: { fontSize: FontSize.overline, lineHeight: 18, marginTop: 3 },
  yaoPlain: { fontSize: FontSize.small, lineHeight: 22, marginTop: Spacing.sm },
  yaoAction: { fontSize: FontSize.small, lineHeight: 22, marginTop: Spacing.sm, fontWeight: '600' },
  najjaBox: { borderWidth: 1, borderRadius: 10, padding: Spacing.sm, marginTop: Spacing.sm },
  najjaRow: { flexDirection: 'row', alignItems: 'center', minHeight: 22 },
  najjaPosition: { fontSize: FontSize.overline, width: 34 },
  najjaText: { fontSize: FontSize.small, flex: 1 },
  najjaMarker: { fontSize: FontSize.caption, fontWeight: '700', width: 42, textAlign: 'right' },
  useGodText: { fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  transformBox: { borderTopWidth: 1, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  transformTitle: { fontSize: FontSize.caption, fontWeight: '700', marginBottom: 3 },
  transformText: { fontSize: FontSize.small, lineHeight: 20 },
  verdictLine: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 4 },
  verdictReason: { fontSize: FontSize.caption, lineHeight: 19 },
  bodyUseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  bodyUseLabel: { fontSize: FontSize.caption, flexShrink: 1 },
  badge: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: FontSize.caption, fontWeight: '700' },
  bodyUseText: { fontSize: FontSize.small, lineHeight: 22 },
  adjustNote: { fontSize: FontSize.caption, lineHeight: 20, marginTop: Spacing.sm },
});
