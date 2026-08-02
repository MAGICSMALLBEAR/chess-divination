// 六爻卦象圖
// 陽爻為一整條，陰爻為中斷的兩段；動爻以金色標示並加註爻名。

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { YANG, lineName, type LineValue } from '@/services/hexagram';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, FontSize } from '@/constants/theme';

interface Props {
  /** 六爻，索引 0 為初爻（最下） */
  lines: LineValue[];
  /** 動爻 1–6，會以強調色標示 */
  movingLine?: number;
  /** 是否顯示每一爻的爻名 */
  showLabels?: boolean;
  width?: number;
}

export default function HexagramLines({
  lines,
  movingLine,
  showLabels = false,
  width = 64,
}: Props) {
  const { theme } = useAppTheme();
  const gap = Math.max(2, Math.round(width * 0.09));

  return (
    <View style={styles.container} accessibilityRole="image">
      {/* 由上而下繪製，故將六爻反轉（陣列索引 0 為最下的初爻） */}
      {[...lines].reverse().map((value, reversedIndex) => {
        const position = lines.length - reversedIndex;
        const isMoving = movingLine === position;
        const color = isMoving ? theme.gold : theme.textSecondary;

        return (
          <View key={position} style={[styles.row, { marginBottom: gap }]}>
            <View style={[styles.lineWrap, { width }]}>
              {value === YANG ? (
                <View style={[styles.bar, { width, backgroundColor: color }]} />
              ) : (
                <>
                  <View style={[styles.bar, { width: width * 0.42, backgroundColor: color }]} />
                  <View style={[styles.bar, { width: width * 0.42, backgroundColor: color }]} />
                </>
              )}
            </View>
            {showLabels && (
              <Text
                style={[
                  styles.label,
                  { color: isMoving ? theme.gold : theme.textMuted },
                  isMoving && styles.labelMoving,
                ]}
              >
                {lineName(lines, position)}
                {isMoving ? ' ●' : ''}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  lineWrap: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 5, borderRadius: 1 },
  label: { fontSize: FontSize.overline, marginLeft: Spacing.sm },
  labelMoving: { fontWeight: '700' },
});
