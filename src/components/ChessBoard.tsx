// 象棋棋盤元件
// 9×10 格線棋盤 + 楚河漢界 + 棋子放置互動

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';
import ChessPiece from './ChessPiece';
import type { ThemeColors } from '@/constants/theme';
import { BOARD, Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useI18n } from '@/hooks/useI18n';
import type { SpreadSlot } from '@/services/spreads';

export interface PlacedPiece {
  piece: ChessPieceType;
  col: number; // 0-8
  row: number; // 0-9
}

interface ChessBoardProps {
  placedPieces?: PlacedPiece[];
  availablePieces?: ChessPieceType[];
  /** `piece` 只有拖曳落子會傳——被拖的那顆就是要放的那顆，沒有先選取的步驟 */
  onPlacePiece?: (col: number, row: number, piece?: ChessPieceType) => void;
  onRemovePiece?: (col: number, row: number) => void;
  onSelectAvailable?: (piece: ChessPieceType) => void;
  selectedPiece?: ChessPieceType | null;
  cellSize?: number;
  maxPieces?: number;
  allowRepeatedPieces?: boolean;
  /** 固定牌陣的全部角色，用於保留已落子的閱讀標籤。 */
  spreadSlots?: readonly SpreadSlot[];
  /** 下一個必須落子的角色格位。 */
  activeSpreadSlot?: SpreadSlot | null;
  /**
   * 棋子池的位置。
   * `below` 是預設，也是窄螢幕唯一站得住的排法；`side` 把棋子池移到棋盤右側，
   * 讓「挑棋子」與「落子」落在同一個視線高度——寬螢幕上兩者上下相隔一整個
   * 棋盤高度，每放一顆子就要來回捲動一次。
   */
  trayPosition?: 'below' | 'side';
  /** `side` 時棋子池的欄寬；由呼叫端依剩餘空間換算，決定棋子排成幾欄。 */
  trayWidth?: number;
  style?: ViewStyle;
}

/** 棋盤與側置棋子池之間的間距 */
export const TRAY_GAP = Spacing.lg;

export default function ChessBoard({
  placedPieces = [],
  availablePieces = [],
  onPlacePiece,
  onRemovePiece,
  onSelectAvailable,
  selectedPiece,
  cellSize = 40,
  maxPieces = 3,
  allowRepeatedPieces = false,
  spreadSlots = [],
  activeSpreadSlot = null,
  trayPosition = 'below',
  trayWidth,
  style,
}: ChessBoardProps) {
  const trayAtSide = trayPosition === 'side';
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const boardRef = useRef<View>(null);
  const boardLayoutRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const cols = BOARD.cols;    // 9
  const rows = BOARD.rows;    // 10
  const pieceSize = cellSize * 0.85;

  const boardWidth = (cols - 1) * cellSize;
  const boardHeight = (rows - 1) * cellSize;

  // 將螢幕座標轉換為棋盤格子座標
  const screenToGrid = (screenX: number, screenY: number): { col: number; row: number } | null => {
    const { x, y, w, h } = boardLayoutRef.current;
    const relX = screenX - x;
    const relY = screenY - y;
    const col = Math.round((relX - cellSize / 2) / cellSize);
    const row = Math.round((relY - cellSize / 2) / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { col, row };
  };

  // 測量棋盤位置
  const measureBoard = () => {
    if (boardRef.current && typeof (boardRef.current as any).measureInWindow === 'function') {
      (boardRef.current as any).measureInWindow((px: number, py: number, pw: number, ph: number) => {
        boardLayoutRef.current = { x: px, y: py, w: pw, h: ph };
      });
    }
  };

  // 棋盤格子定位
  const getCellPosition = (col: number, row: number) => ({
    left: col * cellSize - cellSize * 0.44,
    top: row * cellSize - cellSize * 0.44,
  });

  // 獲取某格上的棋子
  const getPieceAt = (col: number, row: number): PlacedPiece | undefined => {
    return placedPieces.find(pp => pp.col === col && pp.row === row);
  };

  // 判斷是否為可用位置
  const isAvailable = (col: number, row: number): boolean => {
    return !placedPieces.some(pp => pp.col === col && pp.row === row);
  };

  // 格子位置的口述標籤：牌陣角色名（如「過去」）優先，自由佈局退到行列座標。
  // 棋盤對螢幕閱讀器而言是一片「在哪一格放了什麼棋」的資訊，若無標籤，
  // 90 格在語音導覽裡全部讀成「按鈕」。
  const cellSpokenLabel = (col: number, row: number): string => {
    const slot = spreadSlots.find(s => s.col === col && s.row === row);
    if (slot) return t(slot.labelKey);
    return t('board.cellPosition', { row: row + 1, col: col + 1 });
  };

  return (
    <View style={[styles.container, trayAtSide && styles.containerSide, style]}>
      {/* 棋盤 */}
      <View
        ref={boardRef}
        testID="chess-board"
        onLayout={measureBoard}
        style={[
          styles.board,
          {
            width: boardWidth + cellSize,
            height: boardHeight + cellSize,
          },
        ]}
      >
        {/* 木紋底色 */}
        <View style={[styles.boardBg, {
          width: boardWidth + cellSize,
          height: boardHeight + cellSize,
          borderRadius: 8,
        }]} />

        {/* 楚河漢界 */}
        <View style={[styles.river, {
          top: 4.5 * cellSize - 12,
          width: boardWidth,
          left: cellSize / 2,
        }]}>
          <Text style={styles.riverText}>楚  河　　　　漢  界</Text>
        </View>

        {/* 格線網 */}
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const isLastRow = row === rows - 1;
            const isLastCol = col === cols - 1;
            const hasPiece = !!getPieceAt(col, row);

            return (
              <React.Fragment key={`${row}-${col}`}>
                {/* 格子點 */}
                <View
                  style={[
                    styles.gridPoint,
                    {
                      left: col * cellSize + cellSize / 2 - 2,
                      top: row * cellSize + cellSize / 2 - 2,
                    },
                  ]}
                />

                {/* 橫線（楚河漢界斷開） */}
                {!isLastRow && !(row === 4 && col < cols - 1) && (
                  <View
                    style={[
                      styles.hLine,
                      {
                        left: col * cellSize + cellSize / 2,
                        top: row * cellSize + cellSize / 2,
                        width: col < cols - 1 ? cellSize : 1,
                      },
                    ]}
                  />
                )}

                {/* 豎線（楚河漢界斷開，邊線貫通） */}
                {!isLastCol && !(row === 4 && col > 0 && col < 8) && (
                  <View
                    style={[
                      styles.vLine,
                      {
                        left: col * cellSize + cellSize / 2,
                        top: row * cellSize + cellSize / 2,
                        height: row < rows - 1 ? (row === 4 ? cellSize / 2 : cellSize) : 1,
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })
        )}

        {/* 互動層：可放置/可點擊的格子 */}
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const placed = getPieceAt(col, row);
            const pos = getCellPosition(col, row);
            const isActiveSpreadCell = !activeSpreadSlot || (
              activeSpreadSlot.col === col && activeSpreadSlot.row === row
            );
            const available = !placed && !!selectedPiece && isActiveSpreadCell;

            if (placed) {
              // 已放置棋子：點擊可移除
              return (
                <TouchableOpacity
                  key={`cell-${row}-${col}`}
                  style={[styles.placedPiece, pos]}
                  onPress={() => onRemovePiece?.(col, row)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('board.removePieceAt', {
                    position: cellSpokenLabel(col, row),
                    piece: placed.piece.chineseName,
                  })}
                >
                  <ChessPiece
                    piece={placed.piece}
                    size={pieceSize}
                    selected={!!selectedPiece}
                  />
                </TouchableOpacity>
              );
            }

            if (available) {
              // 可放置位置：顯示虛線圓圈
              return (
                <TouchableOpacity
                  key={`cell-${row}-${col}`}
                  testID="board-drop-target"
                  style={[styles.dropTarget, pos, {
                    width: pieceSize,
                    height: pieceSize,
                    borderRadius: pieceSize / 2,
                  }]}
                  onPress={() => onPlacePiece?.(col, row)}
                  activeOpacity={0.5}
                  accessibilityRole="button"
                  accessibilityLabel={t('board.placePieceAt', {
                    position: cellSpokenLabel(col, row),
                    hint: t('board.hint'),
                  })}
                >
                  <Text style={styles.dropIcon}>+</Text>
                </TouchableOpacity>
              );
            }

            // 空位但無選中棋子：不可互動
            return null;
          })
        )}

        {/* 固定牌陣標記：只標示下一手，避免棋盤被文字遮住。 */}
        {activeSpreadSlot && !getPieceAt(activeSpreadSlot.col, activeSpreadSlot.row) && (
          <View
            pointerEvents="none"
            style={[styles.spreadMarker, getCellPosition(activeSpreadSlot.col, activeSpreadSlot.row), {
              width: pieceSize * 1.35,
              marginLeft: -pieceSize * 0.175,
              marginTop: -pieceSize * 0.72,
            }]}
          >
            <Text style={styles.spreadMarkerText}>{t(activeSpreadSlot.labelKey)}</Text>
          </View>
        )}

        {/* 已落下的棋子仍保留牌陣角色，閱讀棋局時不必回想落子順序。 */}
        {spreadSlots.map((slot) => {
          const placed = getPieceAt(slot.col, slot.row);
          if (!placed || activeSpreadSlot?.id === slot.id) return null;
          return (
            <View
              key={`spread-role-${slot.id}`}
              pointerEvents="none"
              style={[styles.spreadRoleLabel, getCellPosition(slot.col, slot.row), {
                width: pieceSize * 1.35,
                marginLeft: -pieceSize * 0.175,
                marginTop: pieceSize * 0.72,
              }]}
            >
              <Text style={styles.spreadRoleText}>{t(slot.labelKey)}</Text>
            </View>
          );
        })}
      </View>

      {/* 可選棋子區 */}
      {availablePieces.length > 0 && (
        <View
          testID="piece-tray"
          style={[
            styles.availableArea,
            trayAtSide && styles.availableAreaSide,
            trayAtSide && trayWidth ? { width: trayWidth } : null,
          ]}
        >
          <Text style={styles.availableTitle}>
            {t('board.place')} ({placedPieces.length}/{maxPieces})
          </Text>
          <View style={[styles.availableRow, trayAtSide && styles.availableRowSide]}>
            {availablePieces.map((piece) => {
              const isPlaced = placedPieces.some(
                pp => pp.piece.id === piece.id
              );
              const isSelected = selectedPiece?.id === piece.id;
              const canSelect = (allowRepeatedPieces || !isPlaced) && placedPieces.length < maxPieces;
              return (
                <View
                  key={piece.id}
                  testID={canSelect ? 'tray-piece-selectable' : 'tray-piece'}
                  style={[
                    styles.availablePiece,
                    isSelected && styles.availablePieceSelected,
                  ]}
                >
                  <ChessPiece
                    piece={piece}
                    size={36}
                    draggable={canSelect}
                    selected={isSelected}
                    onPress={canSelect ? () => onSelectAvailable?.(piece) : undefined}
                    onDragEnd={canSelect ? (p, x, y) => {
                      const grid = screenToGrid(x, y);
                      const isValidSpreadTarget = !activeSpreadSlot || (
                        grid?.col === activeSpreadSlot.col && grid?.row === activeSpreadSlot.row
                      );
                      if (grid && isValidSpreadTarget) {
                        onPlacePiece?.(grid.col, grid.row, p);
                      } else {
                        onSelectAvailable?.(p);
                      }
                    } : undefined}
                  />
                  {isPlaced && <Text style={styles.placedLabel}>{t('board.placedTag')}</Text>}
                  {isSelected && <Text style={styles.selectedLabel}>{t('board.selected')}</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center' },
  // 側置時對齊頂端而非拉伸：棋子池比棋盤矮很多，stretch 會把它撐成整個
  // 棋盤高度，標題與棋子被推到一片空白的中間。
  containerSide: { flexDirection: 'row', alignItems: 'flex-start' },
  board: { position: 'relative' },
  boardBg: {
    position: 'absolute',
    backgroundColor: t.boardBg,
  },
  gridPoint: {
    position: 'absolute',
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: t.boardLine, zIndex: 2,
  },
  hLine: {
    position: 'absolute',
    height: 1.5, backgroundColor: t.boardLine, zIndex: 1,
  },
  vLine: {
    position: 'absolute',
    width: 1.5, backgroundColor: t.boardLine, zIndex: 1,
  },
  river: {
    position: 'absolute', height: 24,
    alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  riverText: {
    fontSize: FontSize.small, fontWeight: '700', color: t.boardText, letterSpacing: 4,
  },
  placedPiece: {
    position: 'absolute', zIndex: 20,
  },
  dropTarget: {
    position: 'absolute', zIndex: 15,
    backgroundColor: t.goldSoft,
    borderWidth: 1.5, borderColor: t.goldFaint,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  dropIcon: {
    fontSize: FontSize.heading, color: t.goldFaint, fontWeight: '300',
  },
  spreadMarker: {
    position: 'absolute', zIndex: 16, alignItems: 'center',
  },
  spreadMarkerText: {
    color: t.textGold, fontSize: 11, fontWeight: '700',
    backgroundColor: t.bgDark, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
  },
  spreadRoleLabel: { position: 'absolute', zIndex: 21, alignItems: 'center' },
  spreadRoleText: {
    color: t.textSecondary, fontSize: 10, fontWeight: '600',
    backgroundColor: t.bgDark, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  availableArea: {
    marginTop: Spacing.lg, alignItems: 'center',
  },
  availableAreaSide: {
    marginTop: 0, marginLeft: TRAY_GAP, alignItems: 'flex-start',
  },
  availableTitle: {
    fontSize: FontSize.small, color: t.textSecondary, marginBottom: Spacing.sm,
  },
  availableRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: Spacing.sm,
  },
  // 側欄靠左起排：置中在最後一列不滿時會讓棋子左右浮動，換了棋色就跳位。
  availableRowSide: { justifyContent: 'flex-start' },
  availablePiece: {
    alignItems: 'center', padding: 4, borderRadius: 12,
  },
  availablePieceSelected: {
    backgroundColor: t.goldSoft,
    borderWidth: 1, borderColor: t.gold,
  },
  placedLabel: {
    fontSize: FontSize.overline, color: t.textMuted, marginTop: 2,
  },
  selectedLabel: {
    fontSize: FontSize.overline, color: t.textGold, marginTop: 2, fontWeight: '600',
  },
});
