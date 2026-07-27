// 象棋棋盤元件
// 9×10 格線棋盤 + 楚河漢界 + 棋子放置互動

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';
import ChessPiece from './ChessPiece';
import { BOARD, Spacing } from '@/constants/theme';

export interface PlacedPiece {
  piece: ChessPieceType;
  col: number; // 0-8
  row: number; // 0-9
}

interface ChessBoardProps {
  placedPieces?: PlacedPiece[];
  availablePieces?: ChessPieceType[];
  onPlacePiece?: (col: number, row: number) => void;
  onRemovePiece?: (col: number, row: number) => void;
  onSelectAvailable?: (piece: ChessPieceType) => void;
  selectedPiece?: ChessPieceType | null;
  cellSize?: number;
  maxPieces?: number;
  style?: ViewStyle;
}

export default function ChessBoard({
  placedPieces = [],
  availablePieces = [],
  onPlacePiece,
  onRemovePiece,
  onSelectAvailable,
  selectedPiece,
  cellSize = 40,
  maxPieces = 3,
  style,
}: ChessBoardProps) {
  const boardRef = useRef<View>(null);
  const cols = BOARD.cols;    // 9
  const rows = BOARD.rows;    // 10
  const pieceSize = cellSize * 0.85;

  const boardWidth = (cols - 1) * cellSize;
  const boardHeight = (rows - 1) * cellSize;

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

  return (
    <View style={[styles.container, style]}>
      {/* 棋盤 */}
      <View
        ref={boardRef}
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
            const available = !placed && !!selectedPiece;

            if (placed) {
              // 已放置棋子：點擊可移除
              return (
                <TouchableOpacity
                  key={`cell-${row}-${col}`}
                  style={[styles.placedPiece, pos]}
                  onPress={() => onRemovePiece?.(col, row)}
                  activeOpacity={0.7}
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
                  style={[styles.dropTarget, pos, {
                    width: pieceSize,
                    height: pieceSize,
                    borderRadius: pieceSize / 2,
                  }]}
                  onPress={() => onPlacePiece?.(col, row)}
                  activeOpacity={0.5}
                >
                  <Text style={styles.dropIcon}>+</Text>
                </TouchableOpacity>
              );
            }

            // 空位但無選中棋子：不可互動
            return null;
          })
        )}
      </View>

      {/* 可選棋子區 */}
      {availablePieces.length > 0 && (
        <View style={styles.availableArea}>
          <Text style={styles.availableTitle}>
            選擇棋子放置 ({placedPieces.length}/{maxPieces})
          </Text>
          <View style={styles.availableRow}>
            {availablePieces.map((piece) => {
              const isPlaced = placedPieces.some(
                pp => pp.piece.id === piece.id
              );
              const isSelected = selectedPiece?.id === piece.id;
              const canSelect = !isPlaced && placedPieces.length < maxPieces;
              return (
                <TouchableOpacity
                  key={piece.id}
                  style={[
                    styles.availablePiece,
                    isSelected && styles.availablePieceSelected,
                  ]}
                  onPress={() => canSelect && onSelectAvailable?.(piece)}
                  disabled={!canSelect}
                  activeOpacity={0.6}
                >
                  <ChessPiece
                    piece={piece}
                    size={36}
                    selected={isSelected}
                  />
                  {isPlaced && <Text style={styles.placedLabel}>已放置</Text>}
                  {isSelected && <Text style={styles.selectedLabel}>已選中</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  board: { position: 'relative' },
  boardBg: {
    position: 'absolute',
    backgroundColor: '#D4A55A',
  },
  gridPoint: {
    position: 'absolute',
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#8B6914', zIndex: 2,
  },
  hLine: {
    position: 'absolute',
    height: 1.5, backgroundColor: '#8B6914', zIndex: 1,
  },
  vLine: {
    position: 'absolute',
    width: 1.5, backgroundColor: '#8B6914', zIndex: 1,
  },
  river: {
    position: 'absolute', height: 24,
    alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  riverText: {
    fontSize: 14, fontWeight: '700', color: '#1A1210', letterSpacing: 4,
  },
  placedPiece: {
    position: 'absolute', zIndex: 20,
  },
  dropTarget: {
    position: 'absolute', zIndex: 15,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    borderWidth: 1.5, borderColor: 'rgba(201, 169, 110, 0.5)',
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  dropIcon: {
    fontSize: 20, color: 'rgba(201, 169, 110, 0.6)', fontWeight: '300',
  },
  availableArea: {
    marginTop: Spacing.lg, alignItems: 'center',
  },
  availableTitle: {
    fontSize: 14, color: '#C9B99A', marginBottom: Spacing.sm,
  },
  availableRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: Spacing.sm,
  },
  availablePiece: {
    alignItems: 'center', padding: 4, borderRadius: 12,
  },
  availablePieceSelected: {
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    borderWidth: 1, borderColor: '#C9A96E',
  },
  placedLabel: {
    fontSize: 10, color: '#8A7A60', marginTop: 2,
  },
  selectedLabel: {
    fontSize: 10, color: '#C9A96E', marginTop: 2, fontWeight: '600',
  },
});
