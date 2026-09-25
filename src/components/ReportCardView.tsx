// 閱讀報告：單筆或多筆記錄的完整內容，離屏渲染成一張可捲動的長圖後分享/保存。
//
// 與 ShareCardView 共用同一套離屏截圖機制（ViewShot + 空白截圖防線 +
// expo-sharing），但用途不同：分享卡是對外的固定尺寸成品，內容刻意精簡；
// 報告是給使用者自己保存的完整版，高度隨內容與筆數增長，六爻／納甲／
// 用神斷語直接沿用 LiuYaoPanel（已有的完整規則式解讀，不重寫一份）。

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Icon } from '@/components/icons';
import { CARD_MODE_ICONS } from '@/components/ShareCardView';
import LiuYaoPanel from '@/components/LiuYaoPanel';
import { captureByteLength, isPlausibleCapture } from '@/services/shareCapture';
import { daysSince } from '@/services/verification';
import type { ReportSection } from '@/services/report';
import type { DivinerGender } from '@/services/useGod';
import type { OutcomeStatus } from '@/services/storage';
import { useI18n } from '@/hooks/useI18n';
import { getLang } from '@/services/i18n';
import { ShareCardPalette as P, ShareCardLevelColors } from '@/constants/theme';

const DATE_LOCALES: Record<string, string> = { 'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP' };

const CARD_WIDTH = 420;

const OUTCOME_TONE: Record<OutcomeStatus, string> = {
  accurate: ShareCardLevelColors['中吉'],
  partial: P.gold,
  inaccurate: P.red,
};

interface ReportCardViewProps {
  sections: ReportSection[];
  divinerGender?: DivinerGender;
}

export interface ReportCardHandle { share: () => Promise<boolean>; }

const ReportCardView = forwardRef<ReportCardHandle, ReportCardViewProps>(
  function ReportCardView({ sections, divinerGender }, ref) {
    const viewShotRef = useRef<any>(null);
    const { t } = useI18n();

    useImperativeHandle(ref, () => ({
      share: async () => {
        try {
          const uri = await viewShotRef.current?.capture?.();
          if (!uri) return false;
          if (!isPlausibleCapture(captureByteLength(uri))) {
            console.warn(t('share.captureFailed'));
            return false;
          }
          if (!(await Sharing.isAvailableAsync())) {
            // 報告沒有分享卡那樣的文字備援可退（那是給籤詩用的短句，報告是
            // 整份長圖）。桌面瀏覽器多半沒有 navigator.share，與其讓使用者
            // 以為匯出失敗，不如直接觸發下載——**不能**用 window.open(dataURI)：
            // Chrome 會把導到 data: URI 的新分頁擋成空白頁，右鍵也存不到東西
            // （實測驗證過，不是猜的）。改用隱形 <a download> 模擬「另存」，
            // 這是瀏覽器允許的下載手勢，不會被導覽限制擋下。
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
              const a = document.createElement('a');
              a.href = uri;
              a.download = `${t('report.title')}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              return true;
            }
            return false;
          }
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `${t('home.title')} - ${t('report.title')}`,
          });
          return true;
        } catch {
          console.warn(t('share.captureFailed'));
          return false;
        }
      },
    }));

    const dateStr = (ts: number) => new Date(ts).toLocaleDateString(
      DATE_LOCALES[getLang()] ?? 'zh-TW',
      { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={styles.card}>
          <View style={styles.goldBar}>
            <Text style={styles.goldBarText}>▬ ◈ {t('home.title')} · {t('report.title')} ◈ ▬</Text>
          </View>

          {sections.map((section, index) => (
            <ReportSectionView
              key={section.record.id}
              section={section}
              index={index}
              total={sections.length}
              divinerGender={divinerGender}
              t={t}
              dateStr={dateStr}
            />
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerUrl}>chess-divination-app.vercel.app</Text>
            <Text style={styles.footerTagline}>{t('home.tagline')}</Text>
          </View>
          <View style={styles.goldBarBottom} />
        </View>
      </ViewShot>
    );
  }
);

function ReportSectionView({
  section, index, total, divinerGender, t, dateStr,
}: {
  section: ReportSection;
  index: number;
  total: number;
  divinerGender?: DivinerGender;
  t: (key: string, params?: Record<string, string | number>) => string;
  dateStr: (ts: number) => string;
}) {
  const { record } = section;
  const levelColor = record.poemLevel
    ? (ShareCardLevelColors[record.poemLevel] || ShareCardLevelColors['中平'])
    : null;

  return (
    <View style={[styles.section, index > 0 && styles.sectionDivider]}>
      {total > 1 && (
        <Text style={styles.sectionIndex}>{t('report.recordIndex', { n: index + 1, total })}</Text>
      )}

      <View style={styles.headerRow}>
        <Icon name={CARD_MODE_ICONS[record.mode] ?? 'chess-board'} size={14} color={P.inkMuted} />
        <Text style={styles.headerMode}>
          {' '}{t(`mode.${record.mode}`)}
          {section.spreadName ? ` · ${section.spreadName}` : ''}
        </Text>
        <Text style={styles.headerDate}>{dateStr(record.timestamp)}</Text>
      </View>

      {levelColor && (
        <View style={[styles.levelChip, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>{record.poemLevel}</Text>
        </View>
      )}

      <Text style={styles.title}>{section.title}</Text>

      {record.drawnPieceChars.length > 0 && (
        <View style={styles.piecesRow}>
          {record.drawnPieceChars.map((char, i) => (
            <View key={i} style={[styles.piece, {
              borderColor: record.drawnPieceColors[i] === 'red' ? P.red : P.ink,
            }]}>
              <Text style={[styles.pieceChar, {
                color: record.drawnPieceColors[i] === 'red' ? P.red : P.ink,
              }]}>
                {char}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(section.relatedPrevious || section.relatedLaterCount > 0) && (
        <View testID="report-related" style={styles.relatedBox}>
          {section.relatedPrevious && (
            <Text style={styles.relatedText}>
              {t('report.relatedPrevious', {
                date: dateStr(section.relatedPrevious.timestamp),
                title: section.relatedPrevious.title,
              })}
            </Text>
          )}
          {section.relatedLaterCount > 0 && (
            <Text style={styles.relatedText}>{t('report.relatedLater', { n: section.relatedLaterCount })}</Text>
          )}
        </View>
      )}

      {(section.questionText || section.note) && (
        <View style={styles.personalBox}>
          {section.questionText && (
            <Text style={styles.personalText}>
              <Text style={styles.personalLabel}>{t('report.questionLabel')}　</Text>
              {section.questionText}
            </Text>
          )}
          {section.note && (
            <Text style={styles.personalText}>
              <Text style={styles.personalLabel}>{t('report.noteLabel')}　</Text>
              {section.note}
            </Text>
          )}
        </View>
      )}

      {section.poem && (
        <View style={styles.poemBox}>
          {section.poem.content.split('\n').map((line, i) => (
            <Text key={i} style={styles.poemLine}>{line}</Text>
          ))}
        </View>
      )}

      {section.oracle && (
        <View style={styles.poemBox}>
          <Text style={styles.oracleNotation}>{section.oracle.notation}</Text>
          {section.oracle.xiang.map((line, i) => <Text key={`x${i}`} style={styles.oracleLine}>{line}</Text>)}
          <Text style={styles.oracleDivider} />
          {section.oracle.shi.map((line, i) => <Text key={`s${i}`} style={styles.oracleLine}>{line}</Text>)}
        </View>
      )}

      {/* 六爻與納甲：沿用畫面上原有的完整規則式解讀，不重寫一份 */}
      {section.reading && (
        <View style={styles.liuyaoWrap}>
          <LiuYaoPanel
            reading={section.reading}
            hourBranch={record.hourBranch}
            castAt={new Date(record.timestamp)}
            questionCategory={record.questionCategory}
            divinerGender={divinerGender}
          />
        </View>
      )}

      {record.mode === 'board' && record.positionSummary && (
        <View style={styles.textBlock}>
          <Text style={styles.blockTitle}>{t('report.positionTitle')}</Text>
          <Text style={styles.blockText}>{record.positionSummary}</Text>
        </View>
      )}

      {section.interpretation && (
        <View style={styles.textBlock}>
          <Text style={styles.blockTitle}>{t('report.interpretationTitle')}</Text>
          <Text style={styles.blockText}>{section.interpretation}</Text>
        </View>
      )}

      {section.actionPlan.length > 0 && (
        <View style={styles.textBlock}>
          <Text style={styles.blockTitle}>{t('report.actionPlanTitle')}</Text>
          {section.actionPlan.map((step, i) => (
            <Text key={i} style={styles.blockText}>{i + 1}. {step}</Text>
          ))}
        </View>
      )}

      {section.outcome && (
        <View style={styles.textBlock}>
          <Text style={styles.blockTitle}>{t('outcome.title')}</Text>
          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeBadge, { borderColor: OUTCOME_TONE[section.outcome.status] }]}>
              <Text style={[styles.outcomeBadgeText, { color: OUTCOME_TONE[section.outcome.status] }]}>
                {t(`outcome.${section.outcome.status}`)}
              </Text>
            </View>
            <Text style={styles.outcomeDelay}>
              {t('outcome.delay', { n: daysSince(record.timestamp, section.outcome.verifiedAt) })}
            </Text>
          </View>
          {section.outcome.note && <Text style={styles.blockText}>{section.outcome.note}</Text>}
        </View>
      )}
    </View>
  );
}

export default ReportCardView;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, backgroundColor: P.paper, paddingBottom: 20,
  },
  goldBar: { backgroundColor: P.gold, paddingVertical: 8, alignItems: 'center' },
  goldBarText: { fontSize: 12, color: P.paper, fontWeight: '600', letterSpacing: 2 },
  goldBarBottom: { height: 6, backgroundColor: P.gold, marginTop: 8 },
  section: { paddingHorizontal: 24, paddingTop: 18 },
  sectionDivider: { borderTopWidth: 1, borderTopColor: P.border, marginTop: 4 },
  sectionIndex: { fontSize: 11, color: P.inkMuted, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  headerMode: { fontSize: 12, color: P.inkMuted, flexShrink: 1 },
  headerDate: { fontSize: 11, color: P.inkMuted, marginLeft: 'auto' },
  levelChip: {
    alignSelf: 'flex-start', marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12,
  },
  levelText: { fontSize: 13, fontWeight: '700', color: P.onLevel },
  title: { fontSize: 18, fontWeight: '900', color: P.ink, marginTop: 8 },
  piecesRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  piece: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: P.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  pieceChar: { fontSize: 17, fontWeight: '900' },
  relatedBox: {
    marginTop: 12, borderLeftWidth: 3, borderLeftColor: P.gold, paddingLeft: 10, gap: 2,
  },
  relatedText: { fontSize: 12, color: P.inkMuted, lineHeight: 18 },
  personalBox: {
    marginTop: 12, backgroundColor: P.paperDeep, borderRadius: 8,
    padding: 12, gap: 4,
  },
  personalText: { fontSize: 13, color: P.ink, lineHeight: 20 },
  personalLabel: { fontWeight: '700', color: P.gold },
  poemBox: {
    marginTop: 12, backgroundColor: P.white, borderRadius: 10,
    borderWidth: 1, borderColor: P.border, padding: 14,
  },
  poemLine: { fontSize: 15, color: P.ink, textAlign: 'center', lineHeight: 26 },
  oracleNotation: { fontSize: 13, color: P.gold, textAlign: 'center', marginBottom: 6 },
  oracleLine: { fontSize: 14, color: P.ink, textAlign: 'center', lineHeight: 24 },
  oracleDivider: { height: 8 },
  liuyaoWrap: { marginTop: 12 },
  textBlock: { marginTop: 12 },
  blockTitle: { fontSize: 13, fontWeight: '700', color: P.gold, marginBottom: 4 },
  blockText: { fontSize: 13, color: P.ink, lineHeight: 21 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  outcomeBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  outcomeBadgeText: { fontSize: 12, fontWeight: '700' },
  outcomeDelay: { fontSize: 11, color: P.inkMuted },
  footer: { alignItems: 'center', marginTop: 20 },
  footerUrl: { fontSize: 10, color: P.goldLight },
  footerTagline: { fontSize: 12, color: P.gold, marginTop: 4, letterSpacing: 2, fontWeight: '600' },
});
