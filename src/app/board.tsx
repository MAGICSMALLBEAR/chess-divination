// 棋盤佈局模式頁面
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ChessBoard from '@/components/ChessBoard';
import { useBoardDivination } from '@/hooks/useBoardDivination';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import { ALL_RED_PIECES, ALL_BLACK_PIECES } from '@/data/pieces';

/** 棋盤格子大小依當前可用寬度換算，旋轉與視窗縮放皆會重算 */
function cellSizeFor(width: number): number {
  return Math.min(44, (width - 32) / 9);
}

const QUESTION_CATEGORIES = [
  { key: 'general', label: '綜合', icon: '🔮' },
  { key: 'marriage', label: '感情', icon: '💕' },
  { key: 'career', label: '事業', icon: '💼' },
  { key: 'wealth', label: '財運', icon: '💰' },
  { key: 'health', label: '健康', icon: '💪' },
  { key: 'study', label: '學業', icon: '📚' },
  { key: 'travel', label: '出行', icon: '✈️' },
];

export default function BoardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { width, contentWidth } = useLayout();
  const {
    placedPieces, selectedPiece, availablePieces, maxPieces,
    selectPiece, placePieceOnBoard, removePieceFromBoard, interpret, reset,
  } = useBoardDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [showRedPieces, setShowRedPieces] = useState(true);

  const currentPool = showRedPieces ? ALL_RED_PIECES : ALL_BLACK_PIECES;

  const handleBack = () => {
    if (placedPieces.length > 0) {
      Alert.alert('確定要返回嗎？', '已放置的棋子將會被清除。', [
        { text: '取消', style: 'cancel' },
        { text: '確定返回', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
       <View style={[styles.inner, { width: contentWidth }]}>
        {/* 標題 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>棋盤佈局</Text>
          <View style={styles.backBtn} />
        </View>

        {/* 問事類別 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}
          contentContainerStyle={styles.catContent}>
          {QUESTION_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.categoryChipLabel}>{cat.icon} {cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 問題輸入 */}
        <TextInput
          style={styles.questionInput}
          placeholder="寫下您想問的問題..."
          placeholderTextColor={theme.textMuted}
          value={questionText}
          onChangeText={setQuestionText}
          maxLength={200}
        />

        {/* 首次提示 */}
        {placedPieces.length === 0 && !selectedPiece && (
          <Text style={[styles.hintText, { color: theme.textMuted }]}>
            💡 先從下方棋子庫選擇一顆棋子，再點擊棋盤上的 + 號放置
          </Text>
        )}

        {/* 棋盤 */}
        <ChessBoard
          placedPieces={placedPieces}
          availablePieces={currentPool}
          selectedPiece={selectedPiece}
          onPlacePiece={placePieceOnBoard}
          onRemovePiece={removePieceFromBoard}
          onSelectAvailable={selectPiece}
          cellSize={cellSizeFor(width)}
          maxPieces={maxPieces}
          style={styles.boardStyle}
        />

        {/* 紅黑切換 */}
        <View style={styles.poolTabs}>
          <TouchableOpacity
            style={[styles.poolTab, showRedPieces && styles.poolTabActive]}
            onPress={() => setShowRedPieces(true)}
          >
            <Text style={[styles.poolTabText, showRedPieces && styles.poolTabTextActive]}>
              🔴 紅方
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.poolTab, !showRedPieces && styles.poolTabActive]}
            onPress={() => setShowRedPieces(false)}
          >
            <Text style={[styles.poolTabText, !showRedPieces && styles.poolTabTextActive]}>
              ⚫ 黑方
            </Text>
          </TouchableOpacity>
        </View>

        {/* 控制按鈕 */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.interpretBtn, placedPieces.length === 0 && styles.btnDisabled]}
            onPress={() => interpret(selectedCategory, questionText)}
            disabled={placedPieces.length === 0}
          >
            <Text style={styles.interpretBtnText}>
              已放置 {placedPieces.length}/{maxPieces} 顆 — 🔮 解讀佈局
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>🔄 重新佈局</Text>
          </TouchableOpacity>
          {placedPieces.length > 0 && (
            <TouchableOpacity style={styles.undoBtn} onPress={() => {
              const last = placedPieces[placedPieces.length - 1];
              if (last) removePieceFromBoard(last.col, last.row);
            }}>
              <Text style={styles.undoBtnText}>↩️ 撤銷上一步</Text>
            </TouchableOpacity>
          )}
        </View>
       </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bgInk },
  scroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  // 內容以 contentWidth 限寬並置中，避免在平板／桌面被撐成整個視窗寬
  inner: { alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    width: '100%',
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, color: t.textSecondary },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: t.textPrimary },
  catScroll: { maxHeight: 40, marginBottom: Spacing.sm },
  catContent: {
    flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  categoryChipActive: {
    borderColor: t.gold, backgroundColor: t.bgMedium,
  },
  categoryChipLabel: { fontSize: 12, color: t.textMuted },
  boardStyle: { marginTop: Spacing.md },
  questionInput: {
    width: '100%',
    backgroundColor: t.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.bgMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.small,
    color: t.textPrimary,
    marginBottom: Spacing.md,
  },
  poolTabs: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md,
  },
  poolTab: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  poolTabActive: {
    borderColor: t.gold, backgroundColor: t.bgMedium,
  },
  poolTabText: { fontSize: 14, color: t.textMuted },
  poolTabTextActive: { color: t.textGold, fontWeight: '600' },
  controls: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  interpretBtn: {
    backgroundColor: t.gold, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  interpretBtnText: { fontSize: FontSize.body, fontWeight: '700', color: t.textInverse },
  resetBtn: {
    borderWidth: 1, borderColor: t.bgMedium,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  resetBtnText: { fontSize: FontSize.body, color: t.textMuted },
  undoBtn: {
    borderWidth: 1, borderColor: t.gold,
    paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    marginTop: 4,
  },
  undoBtnText: { fontSize: FontSize.body, color: t.textGold },
  hintText: {
    textAlign: 'center', fontSize: 13,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
});
