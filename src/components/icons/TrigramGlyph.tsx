// 卦象圖示：六爻線條的 SVG 版本
//
// 原先使用 Unicode 卦符（☰☱☲☳☴☵☶☷），各平台字體不一。
// 此處提供 SVG 版本，供分享卡等需要精確視覺控制的場景使用。
//
// 爻位方向（與 services/hexagram.ts 一致）：
// 先天卦號的位元 2 為初爻（最下）、位元 0 為第三爻（最上）。
// SVG 的 y 座標由上而下遞增，卦象的閱讀方向卻是最上為上爻，
// 因此自下而上的爻序在繪製前必須反轉——否則每個三爻卦都會被
// 畫成它的綜卦（上下顛倒），例如震為雷會畫成艮為山。

import React from 'react';
import Svg, { Rect, G } from 'react-native-svg';
import { trigramLine, type LineValue } from '@/services/hexagram';

const BAR_W = 28;
const BAR_H = 6;
const GAP = 3;
const SEG_GAP = 4;
const TRIGRAM_H = BAR_H * 3 + GAP * 2;

interface TrigramGlyphProps {
  trigram: number;   // 0–7，先天卦序
  size?: number;     // 視埠最長邊
  color?: string;
}

/** 單卦三爻由上而下（索引 0 為該卦最上爻）的陰陽序列 */
export function trigramGlyphRows(trigram: number): LineValue[] {
  // 位元 2 是初爻，故由上而下依序取第三爻（位元 0）、第二爻、初爻
  return [trigramLine(trigram, 3), trigramLine(trigram, 2), trigramLine(trigram, 1)];
}

export default function TrigramGlyph({ trigram, size = 32, color = '#1A1210' }: TrigramGlyphProps) {
  const lines = trigramGlyphRows(trigram);

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

/** 六爻由上而下（索引 0 為上爻、5 為初爻）的陰陽序列 */
export function hexagramGlyphRows(upper: number, lower: number): LineValue[] {
  return [...trigramGlyphRows(upper), ...trigramGlyphRows(lower)];
}

/** 動爻（1–6）對應的列索引（由上而下 0–5）；無動爻回傳 -1 */
export function movingLineRowIndex(movingLine: number | undefined): number {
  // 上爻是第 6 爻且落在最上列，故列索引 = 6 − 爻位
  return movingLine && movingLine >= 1 && movingLine <= 6 ? 6 - movingLine : -1;
}

export function HexagramGlyph({
  upper, lower, movingLine, size = 56, color = '#1A1210', movingColor = '#C9A96E',
}: HexagramGlyphProps) {
  const rows = hexagramGlyphRows(upper, lower);
  const movingRow = movingLineRowIndex(movingLine);

  const totalH = BAR_H * 6 + GAP * 5 + GAP * 2;  // 6 lines + inner gap + trigram gap
  const scale = size / Math.max(BAR_W, totalH);
  const sw = BAR_W * scale;
  const sh = totalH * scale;

  return (
    <Svg width={sw} height={sh} viewBox={`0 0 ${BAR_W} ${totalH}`}>
      {rows.map((line, row) => {
        // 上卦（列 0–2）與下卦（列 3–5）之間多留一道間隔，兩卦才不會連成一片
        const y = row * (BAR_H + GAP) + (row >= 3 ? GAP : 0);
        const isMoving = movingRow === row;
        const fill = isMoving ? movingColor : color;
        if (line === 0) {
          return <Rect key={row} x={0} y={y} width={BAR_W} height={BAR_H} rx={2} fill={fill} />;
        }
        const halfW = (BAR_W - SEG_GAP) / 2;
        return (
          <G key={row}>
            <Rect x={0} y={y} width={halfW} height={BAR_H} rx={2} fill={fill} />
            <Rect x={halfW + SEG_GAP} y={y} width={halfW} height={BAR_H} rx={2} fill={fill} />
          </G>
        );
      })}
    </Svg>
  );
}
