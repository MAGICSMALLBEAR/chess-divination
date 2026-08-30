// 象棋棋子元件
// 圓形棋子，顯示中文字，紅黑配色
// 支援拖曳（可選）和點擊（可選）

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  PanResponder, PanResponderGestureState, Pressable, Platform,
  type PointerEvent as RNPointerEvent,
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

  // PanResponder 只在首次 render 建立，若閉包直接抓 onDragEnd/onPress 的
  // prop，之後的 re-render 永遠拿不到新函式——例如拖曳放子會閉包到首渲
  // 的 placePieceOnBoard（其 selectedPiece 還是 null），拖曳落子全程無效。
  // 這裡用 ref 保存最新回呼，PanResponder 本體只建一次。
  const onDragEndRef = useRef(onDragEnd);
  const onPressRef = useRef(onPress);
  onDragEndRef.current = onDragEnd;
  onPressRef.current = onPress;

  /**
   * Web 的 pointermove / pointerup 不能只掛在棋子上。
   *
   * 指標移到棋盤後，棋子 DOM 節點不再收到事件，這正是原本 PanResponder 的
   * release 消失、拖曳永遠不會落子的原因。按下時把監聽暫掛到 document，
   * 直到放開或取消才移除，能保證不論指標停在哪裡都會結束這次拖曳。
   * 原生沒有 DOM，仍走下方原有的 PanResponder。
   */
  const webDrag = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const removeWebListeners = useRef<(() => void) | null>(null);

  // 導頁或重選棋色時元件可能在指標尚未放開前卸載；不能把 document 監聽留給
  // 下一個畫面。正常放開時 finishWebDrag 已會先清掉，這裡只是保險。
  useEffect(() => () => removeWebListeners.current?.(), []);

  const finishWebDrag = (event: globalThis.PointerEvent, cancelled = false) => {
    const active = webDrag.current;
    if (!active || event.pointerId !== active.pointerId) return;

    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    const dragged = Math.abs(dx) > 5 || Math.abs(dy) > 5;
    webDrag.current = null;
    removeWebListeners.current?.();
    removeWebListeners.current = null;

    pan.flattenOffset();
    if (!cancelled && dragged && onDragEndRef.current) {
      // ChessBoard 的 measureInWindow() 也使用 viewport 座標，須傳 clientX/Y。
      onDragEndRef.current(piece, event.clientX, event.clientY);
    } else if (!cancelled && !dragged && onPressRef.current) {
      onPressRef.current(piece);
    }
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  };

  const startWebDrag = (event: RNPointerEvent) => {
    if (!draggable || Platform.OS !== 'web') return;
    const native = event.nativeEvent;
    webDrag.current = { pointerId: native.pointerId, startX: native.clientX, startY: native.clientY };
    pan.setOffset({ x: 0, y: 0 });
    pan.setValue({ x: 0, y: 0 });

    const move = (moveEvent: globalThis.PointerEvent) => {
      const active = webDrag.current;
      if (!active || moveEvent.pointerId !== active.pointerId) return;
      pan.setValue({ x: moveEvent.clientX - active.startX, y: moveEvent.clientY - active.startY });
    };
    const up = (upEvent: globalThis.PointerEvent) => finishWebDrag(upEvent);
    const cancel = (cancelEvent: globalThis.PointerEvent) => finishWebDrag(cancelEvent, true);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    removeWebListeners.current = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
  };

  // 一律建立（不再以 draggable 條件化）：棋子可能在後續 render 才變為
  // 可拖曳（例如棋盤上移除棋子後），條件化建立會讓它永遠沒有手勢處理器。
  const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (panResponder.current === null) {
    panResponder.current = PanResponder.create({
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
        if (isDragging.current && onDragEndRef.current) {
          onDragEndRef.current(piece, gesture.moveX, gesture.moveY);
        } else if (!isDragging.current && onPressRef.current) {
          onPressRef.current(piece);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    });
  }

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
  if (draggable && panResponder.current) {
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
        {...(Platform.OS === 'web'
          ? { onPointerDown: startWebDrag }
          : panResponder.current.panHandlers)}
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
