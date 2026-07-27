// 象棋棋子元件
// 圓形棋子，顯示中文字，紅黑配色

import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  PanResponder, GestureResponderEvent, PanResponderGestureState,
} from 'react-native';
import type { ChessPiece as ChessPieceType } from '@/data/pieces';

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
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const isRed = piece.color === 'red';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggable,
      onMoveShouldSetPanResponder: () => draggable,
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
        // Reset position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

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
      <TouchableOpacity
        onPress={() => onPress?.(piece)}
        activeOpacity={0.7}
        style={[
          styles.piece,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#F5EDE0',
            borderColor: selected ? '#C9A96E' : isRed ? '#C0392B' : '#1A1210',
            borderWidth: selected ? 3 : 2,
          },
          selected && styles.selected,
        ]}
      >
        <Text
          style={[
            styles.char,
            {
              fontSize: size * 0.55,
              color: isRed ? '#C0392B' : '#1A1210',
            },
          ]}
        >
          {piece.displayChar}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    shadowColor: '#C9A96E',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
});
