// 象棋棋子元件
// 圓形棋子，顯示中文字，紅黑配色
// 支援拖曳（可選）和點擊（可選）

import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  PanResponder, PanResponderGestureState, Pressable,
} from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ChessPieceProps {
  piece: ChessPieceType;
  size?: number;
  draggable?: boolean;
  selected?: boolean;
  onPress?: (piece: ChessPieceType) => void;
  onDragEnd?: (piece: ChessPieceType, x: number, y: number) => void;
  style?: object;
}

export default function ChessPiece({
  piece,
  size = 42,
  draggable = false,
  selected = false,
  onPress,
  onDragEnd,
  style,
}: ChessPieceProps) {
  const { theme } = useAppTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const isRed = piece.color === 'red';
  const pieceInk = isRed ? theme.pieceRed : theme.pieceBlack;

  // 只在可拖曳時建立 PanResponder
  const panResponder = useRef(
    draggable
      ? PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            isDragging.current = false;
            pan.setOffset({ x: 0, y: 0 });
            pan.setValue({ x: 0, y: 0 });
          },
          onPanResponderMove: (_, gesture: PanResponderGestureState) => {
            if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
              isDragging.current = true;
            }
            Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gesture);
          },
          onPanResponderRelease: (_, gesture) => {
            pan.flattenOffset();
            if (isDragging.current && onDragEnd) {
              onDragEnd(piece, gesture.moveX, gesture.moveY);
            } else if (!isDragging.current && onPress) {
              onPress(piece);
            }
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          },
        })
      : null
  ).current;

  // 棋子圓形主體
  const pieceBody = (
    <View
      style={[
        styles.piece,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.pieceBg,
          borderColor: selected ? theme.pieceBorder : pieceInk,
          borderWidth: selected ? 3 : 2,
        },
        selected && { shadowColor: theme.gold, ...styles.selected },
      ]}
    >
      <Text
        style={[
          styles.char,
          {
            fontSize: size * 0.55,
            color: pieceInk,
          },
        ]}
      >
        {piece.displayChar}
      </Text>
    </View>
  );

  // 可拖曳時：用 PanResponder 包裝
  if (draggable && panResponder) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
          style,
        ]}
        {...panResponder.panHandlers}
      >
        {pieceBody}
      </Animated.View>
    );
  }

  // 有 onPress 時：用 Pressable 包裝（不使用 TouchableOpacity 避免嵌套衝突）
  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(piece)}
        style={[
          styles.container,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      >
        {pieceBody}
      </Pressable>
    );
  }

  // 純展示：無互動
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {pieceBody}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  char: {
    fontWeight: '700',
  },
  selected: {
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
});
