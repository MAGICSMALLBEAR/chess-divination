// 棋盤佈局模式頁面
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import InkBackground from '@/components/InkBackground';
import ChessBoard from '@/components/ChessBoard';
import { Icon } from '@/components/icons';
import { useBoardDivination } from '@/hooks/useBoardDivination';
import { useQuestionCategories } from '@/hooks/useQuestionCategories';
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

export default function BoardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { width, contentWidth } = useLayout();
  const categories = useQuestionCategories();
  const {
    placedPieces, selectedPiece, availablePieces, maxPieces,
    selectPiece, placePieceOnBoard, removePieceFromBoard, interpret, reset,
  } = useBoardDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [showRedPieces, setShowRedPieces] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 全螢幕模式下棋盤格子加大
  const cellSz = isFullscreen
    ? Math.min(68, (width - 16) / 9)
    : cellSizeFor(width);

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
      {isFullscreen ? (
        /* 全螢幕棋盤模式 */
        <View style={styles.fsContainer}>
          <ChessBoard
            placedPieces={placedPieces}
            availablePieces={currentPool}
            selectedPiece={selectedPiece}
            onPlacePiece={placePieceOnBoard}
            onRemovePiece={removePieceFromBoard}
            onSelectAvailable={selectPiece}
            cellSize={cellSz}
            maxPieces={maxPieces}
            style={styles.fsBoard}
          />
          <View style={styles.fsControls}>
            <TouchableOpacity style={styles.fsExitBtn} onPress={() => setIsFullscreen(false)}>
              <Text style={{ color: theme.textSecondary }}>← 退出全螢幕</Text>
            </TouchableOpacity>
            <View style={styles.fsPoolTabs}>
              <TouchableOpacity
                style={[styles.fsPoolTab, showRedPieces && styles.fsPoolTabActive]}
                onPress={() => setShowRedPieces(true)}
              >
                <Text style={[styles.fsPoolTabText, showRedPieces && { color: theme.textGold }]}>紅方</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fsPoolTab, !showRedPieces && styles.fsPoolTabActive]}
                onPress={() => setShowRedPieces(false)}
              >
                <Text style={[styles.fsPoolTabText, !showRedPieces && { color: theme.textGold }]}>黑方</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fsActions}>
              <TouchableOpacity style={styles.fsActionBtn} onPress={() => {
                const last = placedPieces[placedPieces.length - 1];
                if (last) removePieceFromBoard(last.col, last.row);
              }}>
                <Icon name="undo" size={16} color={theme.textGold} />
                <Text style={{ color: theme.textGold, marginLeft: 4 }}>撤銷</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fsActionBtn} onPress={reset}>
                <Icon name="refresh" size={16} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 4 }}>重置</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fsInterpretBtn, placedPieces.length === 0 && { opacity: 0.4 }]}
                onPress={() => interpret(selectedCategory, questionText)}
                disabled={placedPieces.length === 0}
              >
                <Icon name="crystal-ball" size={14} color={theme.textInverse} />
                <Text style={{ color: theme.textInverse, fontWeight: '600', marginLeft: 4 }}>
                  解讀 ({placedPieces.length}/{maxPieces})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* 正常模式 */
        <>
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
              <TouchableOpacity
                style={styles.fullscreenBtn}
                onPress={() => setIsFullscreen(!isFullscreen)}
              >
                <Icon name="chess-board" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

        {/* 問事類別 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}
          contentContainerStyle={styles.catContent}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Icon name={cat.icon} size={14} color={selectedCategory === cat.key ? theme.gold : theme.textMuted} />
              <Text style={styles.categoryChipLabel}> {cat.label}</Text>
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
          <View style={styles.hintRow}>
            <Icon name="lightbulb" size={16} color={theme.textMuted} />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              {' '}先從下方棋子庫選擇一顆棋子，再點擊棋盤上的 + 號放置
            </Text>
          </View>
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
            <View style={styles.poolTabInner}>
              <View style={[styles.colorDot, { backgroundColor: theme.cinnabar }]} />
              <Text style={[styles.poolTabText, showRedPieces && styles.poolTabTextActive]}> 紅方</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.poolTab, !showRedPieces && styles.poolTabActive]}
            onPress={() => setShowRedPieces(false)}
          >
            <View style={styles.poolTabInner}>
              <View style={[styles.colorDot, { backgroundColor: theme.ink }]} />
              <Text style={[styles.poolTabText, !showRedPieces && styles.poolTabTextActive]}> 黑方</Text>
            </View>
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
              已放置 {placedPieces.length}/{maxPieces} 顆 —{' '}
            </Text>
            <Icon name="crystal-ball" size={16} color={theme.textInverse} />
            <Text style={styles.interpretBtnText}> 解讀佈局</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Icon name="refresh" size={16} color={theme.textSecondary} />
            <Text style={styles.resetBtnText}> 重新佈局</Text>
          </TouchableOpacity>
          {placedPieces.length > 0 && (
            <TouchableOpacity style={styles.undoBtn} onPress={() => {
              const last = placedPieces[placedPieces.length - 1];
              if (last) removePieceFromBoard(last.col, last.row);
            }}>
              <Icon name="undo" size={16} color={theme.textSecondary} />
              <Text style={styles.undoBtnText}> 撤銷上一步</Text>
            </TouchableOpacity>
          )}
        </View>
       </View>
      </ScrollView>
        </>
      )}
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
    flexDirection: 'row', alignItems: 'center',
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
  poolTabInner: { flexDirection: 'row', alignItems: 'center' },
  poolTabText: { fontSize: 14, color: t.textMuted },
  poolTabTextActive: { color: t.textGold, fontWeight: '600' },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  controls: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  interpretBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: t.gold, paddingVertical: 14,
    borderRadius: 12, gap: 4,
  },
  btnDisabled: { opacity: 0.4 },
  interpretBtnText: { fontSize: FontSize.body, fontWeight: '700', color: t.textInverse },
  resetBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: t.bgMedium,
    paddingVertical: 12, borderRadius: 12, gap: 4,
  },
  resetBtnText: { fontSize: FontSize.body, color: t.textMuted },
  undoBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: t.gold,
    paddingVertical: 10, borderRadius: 12, gap: 4,
    marginTop: 4,
  },
  undoBtnText: { fontSize: FontSize.body, color: t.textGold },
  hintRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  hintText: {
    textAlign: 'center', fontSize: 13, flex: 1,
  },
  fullscreenBtn: {
    width: 60, alignItems: 'flex-end',
  },
  // 全螢幕模式
  fsContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  fsBoard: {
    marginVertical: 8,
  },
  fsControls: {
    width: '100%', paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  fsExitBtn: {
    alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8,
  },
  fsPoolTabs: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  fsPoolTab: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium,
  },
  fsPoolTabActive: { borderColor: t.gold, backgroundColor: t.bgMedium },
  fsPoolTabText: { fontSize: 13, color: t.textMuted },
  fsActions: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  fsActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: t.bgMedium,
  },
  fsInterpretBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.gold, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8,
  },
});
