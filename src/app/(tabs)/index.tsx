// 首頁：模式選擇 + 每日運勢
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ModeSelector from '@/components/ModeSelector';
import { Icon, PieceIcon, PIECE_CHINESE_NAMES } from '@/components/icons';
import { generateDailyFortune } from '@/services/divination';
import { getDailyFortune, saveDailyFortune, getHistory, recordHasLevel, type DailyFortune, type DivinationRecord } from '@/services/storage';
import { getStreak } from '@/services/achievements';
import { recordTitle } from '@/services/poemList';
import { recordLink } from '@/services/recordLink';
import { getLevelColor } from '@/data/poems';
import { shareNative, shareToTarget, type ShareTarget } from '@/services/socialShare';
import ShareTargetSheet from '@/components/ShareTargetSheet';
import { notify } from '@/services/dialog';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, Layout } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  const [recentRecords, setRecentRecords] = useState<DivinationRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingShareText, setPendingShareText] = useState<string | null>(null);

  useEffect(() => {
    loadDaily();
    loadRecent();
    loadStreak();
  }, []);

  async function loadStreak() { setStreak(await getStreak()); }

  /** 使用者在分享選單挑了去處。訊息由服務層決定，這裡只負責說出來 */
  async function handleShareTarget(target: ShareTarget) {
    const text = pendingShareText;
    setPendingShareText(null);
    if (!text) return;
    const messageKey = await shareToTarget(target, {
      title: `${t('home.title')} - ${t('home.todayFortune')}`,
      text,
    });
    if (messageKey) notify(t(messageKey));
  }

  async function loadDaily() {
    let fortune = await getDailyFortune();
    if (!fortune) {
      fortune = generateDailyFortune();
      await saveDailyFortune(fortune);
    }
    setDailyFortune(fortune);
  }
  async function loadRecent() {
    const h = await getHistory();
    setRecentRecords(h.slice(0, 3));
  }

  function handleSelectMode(mode: 'draw' | 'board') {
    if (mode === 'draw') {
      router.push('/draw');
    } else {
      router.push('/board');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 頂部標題 */}
        <View style={styles.header}>
          <Text style={styles.appName}>{t('home.title')}</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
          {streak > 1 && (
            <View style={styles.iconRow}>
              <Icon name="flame" size={14} color={theme.gold} />
              <Text style={[styles.streakText, { color: theme.textGold }]}>
                {' '}{t('home.streak', { n: streak })}
              </Text>
            </View>
          )}
        </View>

        {/* 每日運勢卡片 */}
        {dailyFortune && (
          <TouchableOpacity
            style={[styles.dailyCard, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
            onPress={() => router.push('/draw')}
            activeOpacity={0.8}
          >
            <View style={styles.dailyHeaderRow}>
              <View style={styles.iconRow}>
                <Icon name="location" size={18} color={theme.gold} />
                <Text style={[styles.dailyTitle, { color: theme.textGold }]}> {t('home.daily')}</Text>
              </View>
              <TouchableOpacity
                testID="daily-share"
                accessibilityRole="button"
                accessibilityLabel={t('a11y.shareDailyFortune')}
                // 圖示本身 18pt，遠低於 44pt 的建議觸控目標。hitSlop 把可按
                // 範圍撐開而不動版面——圖示旁邊就是外層的整張卡片，
                // 放大實體尺寸會擠掉標題列。
                hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
                onPress={() => {
                if (!dailyFortune) return;
                const text = `${t('home.daily')}：${dailyFortune.fortuneLevel}\n\n${dailyFortune.fortuneText}\n\n${t('home.luckyPiece')}：${PIECE_CHINESE_NAMES[dailyFortune.luckyPiece]}\n${t('home.luckyDir')}：${dailyFortune.luckyDirection}\n${t('home.luckyNum')}：${dailyFortune.luckyNumber}\n${t('home.luckyColor')}：${dailyFortune.luckyColor}\n\nchess-divination-app.vercel.app`;
                // 原生與 Web 共用同一條分享鏈（與 reveal 頁一致）：
                // 之前直接取 navigator.share/clipboard，原生端兩者皆無，
                // 且未 await 的 share 被取消時 rejection 無人接
                void (async () => {
                  const outcome = await shareNative({ title: `${t('home.title')} - ${t('home.todayFortune')}`, text });
                  // 只有「沒有分享功能」才降級，取消不算（與 reveal.tsx／lingqi.tsx 同一套）。
                  //
                  // 降級原本是直接複製到剪貼簿，而且一句話都不說：桌面瀏覽器沒有
                  // navigator.share，於是按下分享 = 畫面上什麼都沒發生。S56 修掉了
                  // 「取消也被覆寫」那一半，剩下的這一半是「按了沒反應」——同一個
                  // 分享鏈的第三個入口，S55 的去處選單當時只接了揭曉頁與靈棋頁。
                  if (outcome === 'unavailable') setPendingShareText(text);
                })();
              }}>
                <Icon name="share" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.dailyContent}>
              <View style={styles.dailyMain}>
                <Text style={styles.dailyLevel}>{dailyFortune.fortuneLevel}</Text>
                <Text style={[styles.dailyText, { color: theme.textSecondary }]}>{dailyFortune.fortuneText}</Text>
              </View>
              <View style={styles.dailyDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('home.luckyPiece')}</Text>
                  <View style={styles.iconRow}>
                    <PieceIcon type={dailyFortune.luckyPiece} color="red" size={20} />
                    <Text style={styles.detailValue}> {PIECE_CHINESE_NAMES[dailyFortune.luckyPiece]}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('home.luckyDir')}</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyDirection}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('home.luckyNum')}</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyNumber}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('home.luckyColor')}</Text>
                  <Text style={styles.detailValue}>{dailyFortune.luckyColor}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 最近紀錄 */}
        {recentRecords.length > 0 && (
          <View style={[styles.recentSection, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <View style={styles.iconRow}>
              <Icon name="scroll" size={16} color={theme.gold} />
              <Text style={[styles.recentTitle, { color: theme.textGold }]}> {t('home.recent')}</Text>
            </View>
            {recentRecords.map(r => (
              <TouchableOpacity key={r.id} style={styles.recentRow}
                onPress={() => router.push(recordLink(r))}>
                {/* 靈棋擲的是卦目、不落子，`drawnPieceChars` 是空的——照畫就是
                    一格寬 60 的空白欄位占在卦名前面。與 S44 的空等級標籤、
                    S54 收藏卡的空棋子格是同一個毛病的第四個位置：
                    **沒有那個欄位的記錄，不該照著有那個欄位的路走。**
                    收藏卡與資料夾預覽早就這樣判了（`length > 0`／`filter(Boolean)`），
                    只有首頁沒跟上。 */}
                {r.drawnPieceChars.length > 0 && (
                  <Text testID="recent-pieces" style={[styles.recentPieces, { color: theme.textPrimary }]}>{r.drawnPieceChars.join(' ')}</Text>
                )}
                {/* 記錄存的是中文原題；與 reveal 頁一致，顯示時依目前語言翻譯 */}
                <Text style={[styles.recentPoem, { color: theme.textSecondary }]} numberOfLines={1}>{recordTitle(r)}</Text>
                {/* 等級色走 getLevelColor 這份語意色盤。原本是手寫的三元式，
                    而且兩個分支都回 theme.textMuted——中平與下下看起來
                    一模一樣，五個等級只剩兩種顏色。 */}
                {/* 靈棋沒有吉凶等級（原典未載，故也不計入吉凶統計）——
                    空字串照印就是一個沒有字卻占著位的等級欄 */}
                {recordHasLevel(r) && (
                  <Text testID="recent-level" style={[styles.recentLevel, { color: getLevelColor(r.poemLevel) }]}>{r.poemLevel}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 快速抽棋 */}
        <TouchableOpacity
          testID="quick-draw"
          style={[styles.quickDraw, { backgroundColor: theme.gold, borderColor: theme.gold }]}
          onPress={() => router.push('/draw')}
          activeOpacity={0.8}
        >
          <View style={styles.iconRow}>
            <Icon name="dice" size={18} color={theme.textInverse} />
            <Text style={styles.quickDrawText}> {t('home.quickDraw')}</Text>
          </View>
          <Text style={styles.quickDrawSub}>{t('home.quickDrawDesc')}</Text>
        </TouchableOpacity>

        {/* 模式選擇 */}
        <ModeSelector onSelectMode={handleSelectMode} />

        <TouchableOpacity
          style={[styles.lingqiBtn, { borderColor: theme.gold, backgroundColor: theme.bgDark }]}
          onPress={() => router.push('/lingqi')}
        >
          <Text style={[styles.lingqiTitle, { color: theme.textGold }]}>{t('lingqi.title')}</Text>
          <Text style={[styles.lingqiDesc, { color: theme.textSecondary }]}>{t('lingqi.homeDesc')}</Text>
        </TouchableOpacity>

        {/* 棋道箴言 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quote}>
            「{t('home.motto1')}{'\n'}{t('home.motto2')}」
          </Text>
        </View>
      </ScrollView>

      <ShareTargetSheet
        visible={pendingShareText !== null}
        onSelect={handleShareTarget}
        onDismiss={() => setPendingShareText(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  // 限寬並置中，避免在平板／桌面被撐成整個視窗寬而出現超長行寬
  scroll: {
    flexGrow: 1, paddingBottom: 40,
    width: '100%', maxWidth: Layout.maxContent, alignSelf: 'center',
  },
  header: {
    alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize.hero, fontWeight: '900', color: t.textGold,
    letterSpacing: 4, marginBottom: Spacing.xs,
  },
  tagline: { fontSize: FontSize.body, color: t.textSecondary, letterSpacing: 2 },
  streakText: { fontSize: FontSize.small, fontWeight: '600', marginTop: 4 },
  dailyCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: t.bgDark, borderRadius: 16,
    borderWidth: 1, borderColor: t.bgMedium, padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  lingqiBtn: { marginHorizontal: Spacing.md, borderWidth: 1, borderRadius: 16, padding: Spacing.lg, marginTop: Spacing.md },
  lingqiTitle: { fontSize: FontSize.heading, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  lingqiDesc: { fontSize: FontSize.small, lineHeight: 20, textAlign: 'center' },
  dailyHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dailyTitle: { fontSize: FontSize.heading, fontWeight: '700' },
  dailyContent: { gap: Spacing.md },
  dailyMain: { alignItems: 'center' },
  dailyLevel: {
    fontSize: FontSize.subtitle, fontWeight: '900', color: t.textRed,
    marginBottom: Spacing.xs,
  },
  dailyText: {
    fontSize: FontSize.body, color: t.textSecondary, textAlign: 'center',
    lineHeight: 26,
  },
  dailyDetails: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: Spacing.sm,
  },
  detailItem: {
    alignItems: 'center',
    backgroundColor: t.bgCard, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 70,
  },
  detailLabel: { fontSize: 11, color: t.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: t.textPrimary },
  quoteCard: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.md,
    padding: Spacing.md, alignItems: 'center',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  quote: {
    fontSize: FontSize.small, color: t.textMuted, textAlign: 'center',
    lineHeight: 24, fontStyle: 'italic',
  },
  quickDraw: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },
  quickDrawText: {
    fontSize: FontSize.body, fontWeight: '700', color: t.textInverse,
  },
  quickDrawSub: {
    // 按鈕是金色底，副標原本沿用 textMuted（淺灰）幾乎讀不出來；
    // 改用與主文字同一組的反白色，再以 opacity 拉出層次。
    fontSize: FontSize.caption, color: t.textInverse, opacity: 0.75, marginTop: 2,
  },
  recentSection: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: 12, borderWidth: 1, padding: Spacing.md,
  },
  recentTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.sm },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.bgMedium,
  },
  recentPieces: { fontSize: 18, fontWeight: '700', letterSpacing: 3, width: 60 },
  recentPoem: { flex: 1, fontSize: FontSize.small },
  recentLevel: { fontSize: FontSize.caption, fontWeight: '600' },
});
