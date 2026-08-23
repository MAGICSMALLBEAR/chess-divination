// 棋子圖示：漢字在圓形中
//
// 取代原本的彩色 Emoji（👑🎓🐘🏰🐴💣⚔️），以實際象棋漢字呈現。
// 紅方使用主題的朱砂色、黑方使用墨色，圓框統一金邊。

import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/hooks/useAppTheme';

const PIECE_CHARS: Record<string, { red: string; black: string }> = {
  king: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  chariot: { red: '車', black: '車' },
  horse: { red: '馬', black: '馬' },
  cannon: { red: '炮', black: '砲' },
  pawn: { red: '兵', black: '卒' },
};

interface PieceIconProps {
  type: string;
  color: 'red' | 'black';
  size?: number;
}

export function getPieceChar(type: string, color: 'red' | 'black'): string {
  return PIECE_CHARS[type]?.[color] ?? type;
}

export const PIECE_CHINESE_NAMES: Record<string, string> = {
  king: '帥/將',
  advisor: '仕/士',
  elephant: '相/象',
  chariot: '車',
  horse: '馬',
  cannon: '炮/砲',
  pawn: '兵/卒',
};

export default function PieceIcon({ type, color, size = 42 }: PieceIconProps) {
  const { theme } = useAppTheme();
  const char = getPieceChar(type, color);
  // 這些色值原本寫死，且混用了兩個主題的值——邊框取暗色主題的金
  // （宣紙主題應為較深的 #A08040）、黑子取宣紙主題的墨。同一顆棋子
  // 在棋盤上跟著主題走、在首頁的幸運棋子卻不動，兩邊對不起來。
  const fillColor = color === 'red' ? theme.pieceRed : theme.pieceBlack;
  const borderColor = theme.pieceBorder;
  const textColor = theme.pieceBg;
  const fontSize = size * 0.52;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" fill={fillColor} stroke={borderColor} strokeWidth={3} />
      <SvgText
        x="50"
        y="50"
        textAnchor="middle"
        alignmentBaseline="central"
        fontSize={fontSize}
        fontWeight="bold"
        fill={textColor}
      >
        {char}
      </SvgText>
    </Svg>
  );
}
