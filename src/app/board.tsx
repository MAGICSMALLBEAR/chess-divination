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
import { useI18n } from '@/hooks/useI18n';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import { useMeasuredWidth } from '@/hooks/useGrid';
import { ALL_RED_PIECES, ALL_BLACK_PIECES } from '@/data/pieces';
import { SPREADS, SPREAD_DESC_KEYS, SPREAD_HINT_KEYS, SPREAD_LABEL_KEYS, type SpreadId, nextSpreadSlot } from '@/services/spreads';

/**
 * 棋盤格子大小依可用寬度換算，旋轉與視窗縮放皆會重算。
 * 上限放寬到 56：桌面容器有 720px 可用，鎖在 44 會讓棋盤顯得侷促。
 */
function cellSizeFor(width: number): number {
  if (width <= 0) return 32;   // 尚未量測，先給可用的預設值
  return Math.min(56, Math.max(28, (width - 32) / 9));
}

export default function BoardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useLayout();
  // 量測內容容器而非視窗：Web 靜態匯出取不到視窗尺寸（見 useGrid.ts 檔頭），
  // 沿用視窗寬會讓棋盤格子縮到最小值，棋盤在桌面上明顯偏小。
  const { onLayout: onInnerLayout, width: innerWidth } = useMeasuredWidth();
  const { t } = useI18n();
  const categories = useQuestionCategories();
  const {
    placedPieces, selectedPiece, availablePieces, maxPieces,
    selectPiece, placePieceOnBoard, removePieceFromBoard, interpret, reset,
    allowRepeatedPieces, setAllowRepeatedPieces,
  } = useBoardDivination();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [questionText, setQuestionText] = useState('');
  const [showRedPieces, setShowRedPieces] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spreadId, setSpreadId] = useState<SpreadId>('free');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const spread = SPREADS[spreadId];
  const activeSpreadSlot = nextSpreadSlot(spreadId, placedPieces.length);
  const maxPiecesForSpread = spread.slots.length || maxPieces;
  const canInterpret = placedPieces.length > 0 && (spreadId === 'free' || placedPieces.length === maxPiecesForSpread);

  const selectSpread = (id: SpreadId) => {
    if (id === spreadId) return;
    reset();
    setSpreadId(id);
  };

  // 全螢幕模式下棋盤格子加大；一般模式依量測到的容器寬度換算
  const cellSz = isFullscreen
    ? Math.min(68, (width - 16) / 9)
    : cellSizeFor(innerWidth);

  const currentPool = showRedPieces ? ALL_RED_PIECES : ALL_BLACK_PIECES;
  const spreadContext = { optionA, optionB };

  const handleBack = () => {
    if (placedPieces.length > 0) {
      Alert.alert(t('board.confirmExit'), t('board.confirmExitDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('board.confirmExitOk'), style: 'destructive', onPress: () => router.back() },
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
            allowRepeatedPieces={allowRepeatedPieces}
            spreadSlots={spread.slots}
            activeSpreadSlot={activeSpreadSlot}
            style={styles.fsBoard}
          />
          <View style={styles.fsControls}>
            <TouchableOpacity style={styles.fsExitBtn} onPress={() => setIsFullscreen(false)}>
              <Text style={{ color: theme.textSecondary }}>← {t('board.exitFullscreen')}</Text>
            </TouchableOpacity>
            <View style={styles.fsPoolTabs}>
              <TouchableOpacity
                style={[styles.fsPoolTab, showRedPieces && styles.fsPoolTabActive]}
                onPress={() => setShowRedPieces(true)}
              >
                <Text style={[styles.fsPoolTabText, showRedPieces && { color: theme.textGold }]}>{t('board.red')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fsPoolTab, !showRedPieces && styles.fsPoolTabActive]}
                onPress={() => setShowRedPieces(false)}
              >
                <Text style={[styles.fsPoolTabText, !showRedPieces && { color: theme.textGold }]}>{t('board.black')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fsActions}>
              <TouchableOpacity style={styles.fsActionBtn} onPress={() => {
                const last = placedPieces[placedPieces.length - 1];
                if (last) removePieceFromBoard(last.col, last.row);
              }}>
                <Icon name="undo" size={16} color={theme.textGold} />
                <Text style={{ color: theme.textGold, marginLeft: 4 }}>{t('board.undo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fsActionBtn} onPress={reset}>
                <Icon name="refresh" size={16} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 4 }}>{t('board.reset2')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fsInterpretBtn, placedPieces.length === 0 && { opacity: 0.4 }]}
                onPress={() => interpret(selectedCategory, questionText, spreadId, spreadContext)}
                disabled={!canInterpret}
              >
                <Icon name="crystal-ball" size={14} color={theme.textInverse} />
                <Text style={{ color: theme.textInverse, fontWeight: '600', marginLeft: 4 }}>
                  {t('board.read')} ({placedPieces.length}/{maxPiecesForSpread})
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
           <View style={styles.inner} onLayout={onInnerLayout}>
            {/* 標題 */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Text style={styles.backText}>← {t('common.back')}</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{t('board.title')}</Text>
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
          placeholder={t('common.questionPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={questionText}
          onChangeText={setQuestionText}
          maxLength={200}
        />

        {/* 牌陣選擇。切換時清空棋盤，避免將不同角色的舊落子混入新牌陣。 */}
        <Text style={styles.spreadTitle}>{t('board.spread')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spreadScroll}
          contentContainerStyle={styles.spreadContent}>
          {(Object.keys(SPREADS) as SpreadId[]).map((id) => (
            <TouchableOpacity key={id} onPress={() => selectSpread(id)}
              style={[styles.spreadChip, spreadId === id && styles.spreadChipActive]}>
              <Text style={[styles.spreadChipText, spreadId === id && styles.spreadChipTextActive]}>
                {t(SPREAD_LABEL_KEYS[id])}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.spreadHint}>
          {activeSpreadSlot
            ? `${t(SPREAD_DESC_KEYS[spreadId])}　${t('board.spreadNext', { label: t(activeSpreadSlot.labelKey) })}`
            : spreadId === 'free' ? t(SPREAD_DESC_KEYS[spreadId]) : `${t(SPREAD_DESC_KEYS[spreadId])}　${t('board.spreadDone')}`}
        </Text>
        <View style={styles.spreadGuide}>
          <Text style={styles.spreadGuideHint}>{t(SPREAD_HINT_KEYS[spreadId])}</Text>
          {spread.slots.length > 0 && (
            <View style={styles.spreadRoles}>
              {spread.slots.map((slot, index) => (
                <React.Fragment key={slot.id}>
                  {index > 0 && <Text style={styles.spreadArrow}>→</Text>}
                  <View style={[styles.spreadRole, activeSpreadSlot?.id === slot.id && styles.spreadRoleActive]}>
                    <Text style={[styles.spreadRoleText, activeSpreadSlot?.id === slot.id && styles.spreadRoleTextActive]}>
                      {t(slot.labelKey)}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
        {spreadId === 'choice' && (
          <View style={styles.choiceInputs}>
            <TextInput
              style={styles.choiceInput}
              placeholder={t('board.optionAPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={optionA}
              onChangeText={setOptionA}
              maxLength={60}
            />
            <TextInput
              style={styles.choiceInput}
              placeholder={t('board.optionBPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={optionB}
              onChangeText={setOptionB}
              maxLength={60}
            />
          </View>
        )}

        {/* 首次提示 */}
        {placedPieces.length === 0 && !selectedPiece && (
          <View style={styles.hintRow}>
            <Icon name="lightbulb" size={16} color={theme.textMuted} />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              {' '}{t('board.hint')}
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
          cellSize={cellSz}
          maxPieces={maxPieces}
          allowRepeatedPieces={allowRepeatedPieces}
          spreadSlots={spread.slots}
          activeSpreadSlot={activeSpreadSlot}
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
              <Text style={[styles.poolTabText, showRedPieces && styles.poolTabTextActive]}> {t('board.red')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.poolTab, !showRedPieces && styles.poolTabActive]}
            onPress={() => setShowRedPieces(false)}
          >
            <View style={styles.poolTabInner}>
              <View style={[styles.colorDot, { backgroundColor: theme.ink }]} />
              <Text style={[styles.poolTabText, !showRedPieces && styles.poolTabTextActive]}> {t('board.black')}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.duplicateRule} onPress={() => setAllowRepeatedPieces(!allowRepeatedPieces)}>
          <Text style={[styles.duplicateRuleText, allowRepeatedPieces && { color: theme.gold }]}>
            {allowRepeatedPieces ? '✓ ' : '○ '}{t('board.allowDuplicates')}
          </Text>
        </TouchableOpacity>

        {/* 控制按鈕 */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.interpretBtn, !canInterpret && styles.btnDisabled]}
            onPress={() => interpret(selectedCategory, questionText, spreadId, spreadContext)}
            disabled={!canInterpret}
          >
            <Text style={styles.interpretBtnText}>
              {t('board.placed', { n: `${placedPieces.length}/${maxPiecesForSpread}` })} —{' '}
            </Text>
            <Icon name="crystal-ball" size={16} color={theme.textInverse} />
            <Text style={styles.interpretBtnText}> {t('board.interpret')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Icon name="refresh" size={16} color={theme.textSecondary} />
            <Text style={styles.resetBtnText}> {t('board.reset')}</Text>
          </TouchableOpacity>
          {placedPieces.length > 0 && (
            <TouchableOpacity style={styles.undoBtn} onPress={() => {
              const last = placedPieces[placedPieces.length - 1];
              if (last) removePieceFromBoard(last.col, last.row);
            }}>
              <Icon name="undo" size={16} color={theme.textSecondary} />
              <Text style={styles.undoBtnText}> {t('board.undoLast')}</Text>
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
  // 內容限寬並置中。720 比一般閱讀寬度(560)寬一些——
  // 棋盤與 7 個問事類別在 560 下會顯得侷促、類別列還會被截斷。
  inner: {
    alignItems: 'center',
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    width: '100%',
  },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, color: t.textSecondary },
  title: { fontSize: FontSize.heading, fontWeight: '700', color: t.textPrimary },
  // 用固定 height 而非 maxHeight：水平 ScrollView 在 Web 上沒有明確高度時會塌陷
  catScroll: { height: 40, marginBottom: Spacing.sm, flexGrow: 0, width: '100%' },
  // 不置中：類別數量在窄螢幕會超出可視寬度，flexbox 的 center
  // 在溢出時會把起點推成負值，第一個類別反而被切掉。靠左起排最穩。
  catContent: {
    flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md,
    alignItems: 'center',
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
  spreadTitle: { width: '100%', color: t.textSecondary, fontSize: FontSize.small, marginBottom: 4 },
  spreadScroll: { width: '100%', flexGrow: 0, marginBottom: 4 },
  spreadContent: { flexDirection: 'row', gap: 6, paddingRight: Spacing.md },
  spreadChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: t.bgMedium, backgroundColor: t.bgCard,
  },
  spreadChipActive: { borderColor: t.gold, backgroundColor: t.goldSoft },
  spreadChipText: { color: t.textMuted, fontSize: 12 },
  spreadChipTextActive: { color: t.textGold, fontWeight: '700' },
  spreadHint: { width: '100%', color: t.textMuted, fontSize: 12, lineHeight: 18, marginBottom: Spacing.xs },
  spreadGuide: {
    width: '100%', borderRadius: 10, paddingHorizontal: Spacing.sm, paddingVertical: 7,
    backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.bgMedium, marginBottom: Spacing.xs,
  },
  spreadGuideHint: { color: t.textSecondary, fontSize: 12, lineHeight: 17 },
  spreadRoles: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  spreadArrow: { color: t.textMuted, fontSize: 12 },
  spreadRole: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: t.bgDark },
  spreadRoleActive: { backgroundColor: t.goldSoft, borderWidth: 1, borderColor: t.goldFaint },
  spreadRoleText: { color: t.textMuted, fontSize: 11 },
  spreadRoleTextActive: { color: t.textGold, fontWeight: '700' },
  choiceInputs: { width: '100%', flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  choiceInput: {
    flex: 1, minWidth: 0, backgroundColor: t.bgDark, borderRadius: 8,
    borderWidth: 1, borderColor: t.bgMedium, paddingHorizontal: 10, paddingVertical: 8,
    color: t.textPrimary, fontSize: 12,
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
  duplicateRule: { alignSelf: 'center', paddingVertical: Spacing.sm },
  duplicateRuleText: { color: t.textMuted, fontSize: FontSize.small },
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
