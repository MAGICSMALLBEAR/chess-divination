// 棋盤佈局模式頁面
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Dimensions, TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ChessBoard from '@/components/ChessBoard';
import { useBoardDivination } from '@/hooks/useBoardDivination';
import { useAppTheme } from '@/hooks/useAppTheme';
import { t } from '@/services/i18n';
import { Spacing, FontSize } from '@/constants/theme';
import { ALL_RED_PIECES, ALL_BLACK_PIECES } from '@/data/pieces';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.min(36, (SCREEN_WIDTH - 60) / 10);

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
  const {
    placedPieces, selectedPiece, availablePieces, maxPieces,
    selectPiece, placePieceOnBoard, removePieceFromBoard, interpret, reset,
  } = useBoardDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [showRedPieces, setShowRedPieces] = useState(true);

  const currentPool = showRedPieces ? ALL_RED_PIECES : ALL_BLACK_PIECES;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgInk }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <InkBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 標題 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
          placeholderTextColor="#5A4A38"
          value={questionText}
          onChangeText={setQuestionText}
          maxLength={200}
        />

        {/* 棋盤 */}
        <ChessBoard
          placedPieces={placedPieces}
          availablePieces={currentPool}
          selectedPiece={selectedPiece}
          onPlacePiece={placePieceOnBoard}
          onRemovePiece={removePieceFromBoard}
          onSelectAvailable={selectPiece}
          cellSize={CELL_SIZE}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0A08' },
  scroll: { flexGrow: 1, paddingBottom: 40, alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    width: '100%',
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, color: '#C9B99A' },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: '#F5EDE0' },
  catScroll: { maxHeight: 40, marginBottom: Spacing.sm },
  catContent: {
    flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
  },
  categoryChipActive: {
    borderColor: '#C9A96E', backgroundColor: '#2A1F18',
  },
  categoryChipLabel: { fontSize: 12, color: '#8A7A60' },
  boardStyle: { marginTop: Spacing.md },
  questionInput: {
    width: SCREEN_WIDTH - Spacing.md * 2,
    backgroundColor: '#1A1210',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A2F25',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.small,
    color: '#F5EDE0',
    marginBottom: Spacing.md,
  },
  poolTabs: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md,
  },
  poolTab: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#231A14', borderWidth: 1, borderColor: '#3A2F25',
  },
  poolTabActive: {
    borderColor: '#C9A96E', backgroundColor: '#2A1F18',
  },
  poolTabText: { fontSize: 14, color: '#8A7A60' },
  poolTabTextActive: { color: '#C9A96E', fontWeight: '600' },
  controls: {
    width: SCREEN_WIDTH - Spacing.md * 2,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  interpretBtn: {
    backgroundColor: '#C9A96E', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  interpretBtnText: { fontSize: FontSize.body, fontWeight: '700', color: '#1A1210' },
  resetBtn: {
    borderWidth: 1, borderColor: '#3A2F25',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  resetBtnText: { fontSize: FontSize.body, color: '#8A7A60' },
});
