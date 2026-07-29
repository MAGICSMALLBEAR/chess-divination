// 抽棋模式頁面
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Dimensions, TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ChessPiece from '@/components/ChessPiece';
import PieceDrawAnimation from '@/components/PieceDrawAnimation';
import { useDrawDivination } from '@/hooks/useDrawDivination';
import { playDrawPieceSound } from '@/services/sound';
import { hapticMedium } from '@/services/haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import { getSettings, saveSettings } from '@/services/storage';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUESTION_CATEGORIES = [
  { key: 'general', label: '綜合', icon: '🔮' },
  { key: 'marriage', label: '感情', icon: '💕' },
  { key: 'career', label: '事業', icon: '💼' },
  { key: 'wealth', label: '財運', icon: '💰' },
  { key: 'health', label: '健康', icon: '💪' },
  { key: 'study', label: '學業', icon: '📚' },
  { key: 'travel', label: '出行', icon: '✈️' },
];

export default function DrawScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const {
    step, drawnPieces, selectedPoem, drawSummary,
    startDrawing, goToResult, reset,
  } = useDrawDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');

  // 讀取上次選擇的類別
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      if (s.questionCategory) setSelectedCategory(s.questionCategory);
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
          <Text style={styles.title}>抽棋占卜</Text>
          <View style={styles.backBtn} />
        </View>

        {step === 'select-count' && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>請問您想問什麼？</Text>
            {/* 問題輸入框 */}
            <TextInput
              style={[styles.questionInput, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium, color: theme.textPrimary }]}
              placeholder={t('draw.question')}
              placeholderTextColor="#5A4A38"
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            {/* 問事類別 */}
            <View style={styles.categoryGrid}>
              {QUESTION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.key && styles.categoryChipActive,
                  ]}
                  onPress={() => handleCategorySelect(cat.key)}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
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

            <Text style={styles.subtitle}>選擇抽取棋子數量</Text>
            <View style={styles.countRow}>
              {([1, 2, 3] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.countBtn}
                  onPress={() => { playDrawPieceSound(); hapticMedium(); startDrawing(n, selectedCategory, questionText); }}
                >
                  <Text style={styles.countNum}>{n}</Text>
                  <Text style={styles.countLabel}>
                    {n === 1 ? '單棋' : n === 2 ? '雙棋' : '三棋'}
                  </Text>
                  <Text style={styles.countDesc}>
                    {n === 1 ? '一針見血' : n === 2 ? '陰陽互濟' : '天地人合'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'drawing' && drawnPieces.length > 0 && (
          <PieceDrawAnimation
            drawnPieces={drawnPieces}
            drawSummary={drawSummary}
            onReveal={goToResult}
            onRedraw={reset}
          />
        )}

        {step === 'result' && selectedPoem && (
          <View style={styles.content}>
            <Text style={styles.loadingText}>正在為您解讀...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0D0A08',
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
    color: '#C9B99A',
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    color: '#F5EDE0',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  questionInput: {
    width: SCREEN_WIDTH - Spacing.lg * 2,
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
  },
  categoryChipActive: { borderColor: '#C9A96E' },
  categoryChipIcon: { fontSize: 16 },
  categoryChipLabel: { fontSize: FontSize.small },
  categoryChipLabelActive: { color: '#C9A96E', fontWeight: '600' },
  countRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countBtn: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3,
    borderRadius: 16, borderWidth: 1,
    padding: Spacing.md, alignItems: 'center',
  },
  countNum: {
    fontSize: 36,
    fontWeight: '900',
    color: '#C9A96E',
  },
  countLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: '#F5EDE0',
    marginTop: 4,
  },
  countDesc: {
    fontSize: FontSize.caption,
    color: '#8A7A60',
    marginTop: 4,
  },
  loadingText: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    marginTop: Spacing.xxl,
  },
});
