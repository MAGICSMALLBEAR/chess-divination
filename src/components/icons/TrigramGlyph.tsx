// 卦象圖示：六爻線條的 SVG 版本
//
// 原先使用 Unicode 卦符（☰☱☲☳☴☵☶☷），各平台字體不一。
// 此處提供 SVG 版本，供分享卡等需要精確視覺控制的場景使用。

import React from 'react';
import Svg, { Rect, G } from 'react-native-svg';

const BAR_W = 28;
const BAR_H = 6;
const GAP = 3;
const SEG_GAP = 4;
const TRIGRAM_H = BAR_H * 3 + GAP * 2;

/** 爻值：0 為陽（長橫），1 為陰（兩短橫） */
type LineValue = 0 | 1;

interface TrigramGlyphProps {
  trigram: number;   // 0–7，先天卦序
  size?: number;     // 視埠最長邊
  color?: string;
}

export default function TrigramGlyph({ trigram, size = 32, color = '#1A1210' }: TrigramGlyphProps) {
  const lines: LineValue[] = [
    ((trigram >> 2) & 1) as LineValue,
    ((trigram >> 1) & 1) as LineValue,
    (trigram & 1) as LineValue,
  ];

  const w = BAR_W;
  const h = TRIGRAM_H;
  const scale = size / Math.max(w, h);
  const sw = w * scale;
  const sh = h * scale;

  return (
    <Svg width={sw} height={sh} viewBox={`0 0 ${w} ${h}`}>
      {lines.map((line, i) => {
        const y = i * (BAR_H + GAP);
        if (line === 0) {
          return <Rect key={i} x={0} y={y} width={BAR_W} height={BAR_H} rx={2} fill={color} />;
        }
        const halfW = (BAR_W - SEG_GAP) / 2;
        return (
          <G key={i}>
            <Rect x={0} y={y} width={halfW} height={BAR_H} rx={2} fill={color} />
            <Rect x={halfW + SEG_GAP} y={y} width={halfW} height={BAR_H} rx={2} fill={color} />
          </G>
        );
      })}
    </Svg>
  );
}

/** 六爻完整卦象（上卦 + 下卦） */
interface HexagramGlyphProps {
  upper: number;
  lower: number;
  movingLine?: number;   // 1–6，0 表示無動爻
  size?: number;
  color?: string;
  movingColor?: string;
}

export function HexagramGlyph({
  upper, lower, movingLine, size = 56, color = '#1A1210', movingColor = '#C9A96E',
}: HexagramGlyphProps) {
  const trigram = (lines: LineValue[], startY: number) =>
    lines.map((line, i) => {
      const y = startY + i * (BAR_H + GAP);
      const globalLine = startY === 0 ? i + 4 : i + 1; // 上卦爻位 4/5/6, 下卦爻位 1/2/3
      const isMoving = movingLine === globalLine;
      const fill = isMoving ? movingColor : color;
      if (line === 0) {
        return <Rect key={i} x={0} y={y} width={BAR_W} height={BAR_H} rx={2} fill={fill} />;
      }
      const halfW = (BAR_W - SEG_GAP) / 2;
      return (
        <G key={i}>
          <Rect x={0} y={y} width={halfW} height={BAR_H} rx={2} fill={fill} />
          <Rect x={halfW + SEG_GAP} y={y} width={halfW} height={BAR_H} rx={2} fill={fill} />
        </G>
      );
    });

  const uLines: LineValue[] = [
    ((upper >> 2) & 1) as LineValue,
    ((upper >> 1) & 1) as LineValue,
    (upper & 1) as LineValue,
  ];
  const lLines: LineValue[] = [
    ((lower >> 2) & 1) as LineValue,
    ((lower >> 1) & 1) as LineValue,
    (lower & 1) as LineValue,
  ];

  const totalH = BAR_H * 6 + GAP * 5 + GAP * 2;  // 6 lines + inner gap + trigram gap
  const scale = size / Math.max(BAR_W, totalH);
  const sw = BAR_W * scale;
  const sh = totalH * scale;

  return (
    <Svg width={sw} height={sh} viewBox={`0 0 ${BAR_W} ${totalH}`}>
      {trigram(uLines, 0)}
      {trigram(lLines, BAR_H * 3 + GAP * 4)}
    </Svg>
  );
}
