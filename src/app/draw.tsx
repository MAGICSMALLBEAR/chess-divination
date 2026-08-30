// 抽棋模式頁面
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ChessPiece from '@/components/ChessPiece';
import PieceDraw3D from '@/components/PieceDraw3D';
import { Icon } from '@/components/icons';
import { useDrawDivination } from '@/hooks/useDrawDivination';
import { useQuestionCategories } from '@/hooks/useQuestionCategories';
import QuestionPrompts from '@/components/QuestionPrompts';
import { playDrawPieceSound } from '@/services/sound';
import { hapticMedium } from '@/services/haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { getSettings, saveSettings } from '@/services/storage';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
export default function DrawScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const categories = useQuestionCategories();
  const {
    step, drawnPieces, selectedPoem, drawSummary,
    startDrawing, goToResult, reset,
  } = useDrawDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  /** 設定裡的預設抽棋數量，標為建議選項（見下方讀取設定的 effect） */
  const [preferredCount, setPreferredCount] = useState<1 | 2 | 3 | null>(null);
  const selectedCategoryLabel = categories.find(category => category.key === selectedCategory)?.label ?? selectedCategory;

  // 讀取上次選擇的類別與預設抽棋數量。
  //
  // 預設數量原本存得進設定卻從來沒有人讀——三個按鈕永遠一視同仁，
  // 那一項設定對 App 的行為零影響。這裡讀進來標示為建議選項；
  // 抽棋是按下去就直接開始，沒有「確認」那一步，所以「預設」能有的
  // 誠實作用就是把偏好的那顆標出來，而不是替使用者按下去。
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      if (s.questionCategory) setSelectedCategory(s.questionCategory);
      setPreferredCount(s.pieceCountPreset);
    })();
  }, []);

  // 選擇類別時儲存偏好
  const handleCategorySelect = async (cat: string) => {
    setSelectedCategory(cat);
    await saveSettings({ questionCategory: cat });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 標題 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('mode.draw')}</Text>
          <View style={styles.backBtn} />
        </View>

        {step === 'select-count' && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>{t('draw.question')}</Text>
            {/* 問題輸入框 */}
            <TextInput
              style={[styles.questionInput, {
                width: contentWidth,
                backgroundColor: theme.bgDark,
                borderColor: theme.bgMedium,
                color: theme.textPrimary,
              }]}
              placeholder={t('common.questionPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <QuestionPrompts category={selectedCategory} categoryLabel={selectedCategoryLabel} onSelect={setQuestionText} />
            {/* 問事類別 */}
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.key && styles.categoryChipActive,
                  ]}
                  onPress={() => handleCategorySelect(cat.key)}
                >
                  <Icon name={cat.icon} size={16} color={selectedCategory === cat.key ? theme.gold : theme.textMuted} />
                  <Text
                    style={[
                      styles.categoryChipLabel,
                      selectedCategory === cat.key && styles.categoryChipLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.subtitle}>{t('draw.count')}</Text>
            <View style={styles.countRow}>
              {([1, 2, 3] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  testID={`draw-count-${n}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preferredCount === n }}
                  style={[
                    styles.countBtn,
                    { width: (contentWidth - Spacing.md * 2) / 3 },
                    preferredCount === n && { borderColor: theme.gold },
                  ]}
                  onPress={() => { playDrawPieceSound(); hapticMedium(); startDrawing(n, selectedCategory, questionText); }}
                >
                  <Text style={[styles.countNum, preferredCount === n && { color: theme.textGold }]}>{n}</Text>
                  <Text style={styles.countLabel}>
                    {t(n === 1 ? 'draw.single' : n === 2 ? 'draw.double' : 'draw.triple')}
                  </Text>
                  <Text style={styles.countDesc}>
                    {t(n === 1 ? 'draw.singleDesc' : n === 2 ? 'draw.doubleDesc' : 'draw.tripleDesc')}
                  </Text>
                  {preferredCount === n && (
                    <Text testID={`draw-count-suggested-${n}`} style={[styles.countSuggested, { color: theme.textGold }]}>
                      {t('draw.suggested')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'drawing' && drawnPieces.length > 0 && (
          <PieceDraw3D
            drawnPieces={drawnPieces}
            drawSummary={drawSummary}
            onReveal={goToResult}
            onRedraw={reset}
          />
        )}

        {step === 'result' && selectedPoem && (
          <View style={styles.content}>
            <Text style={styles.loadingText}>{t('draw.interpreting')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: t.bgInk,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: FontSize.body,
    color: t.textSecondary,
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    color: t.textPrimary,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: t.textSecondary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  questionInput: {
    borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, fontSize: FontSize.body,
    minHeight: 80, marginBottom: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, gap: 6,
    // 底色與邊框同 board.tsx：不設色時 RN 預設是黑——
    // 深色主題（App 預設）下未選中的 chip 等於整排隱形
    backgroundColor: t.bgCard, borderColor: t.bgMedium,
  },
  categoryChipActive: { borderColor: t.gold, backgroundColor: t.bgMedium },
  categoryChipIcon: { fontSize: 16 },
  categoryChipLabel: { fontSize: FontSize.small, color: t.textMuted },
  categoryChipLabelActive: { color: t.textGold, fontWeight: '600' },
  countRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countBtn: {
    borderRadius: 16, borderWidth: 1, borderColor: t.bgMedium,
    padding: Spacing.md, alignItems: 'center',
  },
  countNum: {
    fontSize: 36,
    fontWeight: '900',
    color: t.textGold,
  },
  countLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: t.textPrimary,
    marginTop: 4,
  },
  countSuggested: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  countDesc: {
    fontSize: FontSize.caption,
    color: t.textMuted,
    marginTop: 4,
  },
  loadingText: {
    fontSize: FontSize.body,
    color: t.textSecondary,
    marginTop: Spacing.xxl,
  },
});
