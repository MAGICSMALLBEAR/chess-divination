// 卦象 SVG 的爻位方向測試
//
// 命理正確性是本專案最高優先：卦象圖必須與旁邊印出的卦名一致。
// 舊版把「自下而上」的先天卦號位元（位元 2 = 初爻）直接按陣列順序
// 由上而下繪製，等於把每個三爻卦畫成它的綜卦（上下顛倒）——
// 64 卦中有 48 卦圖不符名，例如震為雷被畫成艮為山。
// 此檔鎖住正確的繪製方向：最上列是上爻、最下列是初爻。

import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import {
  trigramGlyphRows, hexagramGlyphRows, movingLineRowIndex,
  HexagramGlyph,
} from '../components/icons/TrigramGlyph';
import TrigramGlyph from '../components/icons/TrigramGlyph';
import ShareCardView from '../components/ShareCardView';
import { hexagramLines, YANG, YIN } from '../services/hexagram';

// react-native-svg 在測試環境沒有真正的宿主元件，
// 用同名的簡單元件代替——測試只關心傳入的 props（y、fill 等）。
jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const host = (name: string) => ({ children, ...props }: any) =>
    ReactLib.createElement(name, props, children);
  return {
    __esModule: true,
    default: host('Svg'),
    Svg: host('Svg'),
    Rect: host('Rect'),
    G: host('G'),
    Line: host('Line'),
    Circle: host('Circle'),
    Path: host('Path'),
    Polyline: host('Polyline'),
  };
});

// ShareCardView 的截圖與分享功能在測試環境不存在，
// 用直通元件取代——測試只關心渲染出來的樹。
jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));
jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// 先天序：0乾 1兌 2離 3震 4巽 5坎 6艮 7坤
const QIAN = 0, ZHEN = 3, KAN = 5, GEN = 6, KUN = 7;

describe('卦象列順序（純函式）', () => {
  test('單卦由上而下應為位元 0、1、2（最上爻在前）', () => {
    expect(trigramGlyphRows(QIAN)).toEqual([YANG, YANG, YANG]);
    expect(trigramGlyphRows(KUN)).toEqual([YIN, YIN, YIN]);
    expect(trigramGlyphRows(ZHEN)).toEqual([YIN, YIN, YANG]); // 震☳ 一陽在下
    expect(trigramGlyphRows(GEN)).toEqual([YANG, YIN, YIN]);  // 艮☶ 一陽在上
    expect(trigramGlyphRows(KAN)).toEqual([YIN, YANG, YIN]);  // 坎☵ 一陽居中
  });

  test('已知卦象的六爻由上而下排列', () => {
    // 乾為天：六爻皆陽
    expect(hexagramGlyphRows(QIAN, QIAN)).toEqual(
      [YANG, YANG, YANG, YANG, YANG, YANG]);
    // 坤為地：六爻皆陰
    expect(hexagramGlyphRows(KUN, KUN)).toEqual(
      [YIN, YIN, YIN, YIN, YIN, YIN]);
    // 震為雷：陰陰陽／陰陰陽（舊版畫成陽陰陰／陽陰陰，即艮為山）
    expect(hexagramGlyphRows(ZHEN, ZHEN)).toEqual(
      [YIN, YIN, YANG, YIN, YIN, YANG]);
    // 艮為山：陽陰陰／陽陰陰（震與艮互為綜卦，方向不可互換）
    expect(hexagramGlyphRows(GEN, GEN)).toEqual(
      [YANG, YIN, YIN, YANG, YIN, YIN]);
    // 水雷屯：上坎下震 → 陰陽陰／陰陰陽
    expect(hexagramGlyphRows(KAN, ZHEN)).toEqual(
      [YIN, YANG, YIN, YIN, YIN, YANG]);
  });

  test('六十四卦全數與 hexagramLines 反轉一致（索引 0 恆為上爻）', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        expect(hexagramGlyphRows(upper, lower))
          .toEqual([...hexagramLines(upper, lower)].reverse());
      }
    }
  });

  test('動爻對應的列索引：上爻在最上、初爻在最下', () => {
    expect(movingLineRowIndex(6)).toBe(0);
    expect(movingLineRowIndex(4)).toBe(2);
    expect(movingLineRowIndex(1)).toBe(5);
    expect(movingLineRowIndex(undefined)).toBe(-1);
    expect(movingLineRowIndex(0)).toBe(-1); // 0 表示無動爻
  });
});

/** 依 y 座標分組每一列的 rect（陽爻一列一個、陰爻一列兩個），由小而大排序 */
function rowsByY(root: ReactTestInstance) {
  const byY = new Map<number, { count: number; fills: Set<string> }>();
  root.findAll(n => n.type === 'Rect').forEach(rect => {
    const y = rect.props.y as number;
    if (!byY.has(y)) byY.set(y, { count: 0, fills: new Set() });
    const row = byY.get(y)!;
    row.count++;
    row.fills.add(rect.props.fill as string);
  });
  return [...byY.entries()].sort((a, b) => a[0] - b[0]);
}

const NORMAL = '#000000';
const MOVING = '#FF0000';

function renderGlyph(upper: number, lower: number, movingLine?: number) {
  let renderer!: TestRenderer.ReactTestRenderer;
  // React 19 的測試渲染器要求 create 包在 act 裡，否則整棵樹會被卸載
  act(() => {
    renderer = TestRenderer.create(
      <HexagramGlyph upper={upper} lower={lower} movingLine={movingLine}
        color={NORMAL} movingColor={MOVING} />,
    );
  });
  return renderer.root;
}

describe('HexagramGlyph 繪製', () => {
  test('震為雷：上而下陰陰陽／陰陰陽，動爻四落在上卦最下列', () => {
    const rows = rowsByY(renderGlyph(ZHEN, ZHEN, 4));
    expect(rows.map(([y]) => y)).toEqual([0, 9, 18, 30, 39, 48]);
    // 陰爻一列兩個 rect、陽爻一個
    expect(rows.map(([, v]) => v.count)).toEqual([2, 2, 1, 2, 2, 1]);
    // 動爻 4 = 上卦（震）第一爻 = 上卦塊最下的陽爻列 → y=18，其餘為常色
    expect(rows[2][1].fills).toEqual(new Set([MOVING]));
    expect(rows.filter(([, v]) => v.fills.has(MOVING))).toHaveLength(1);
    expect(rows[0][1].fills).toEqual(new Set([NORMAL]));
    expect(rows[5][1].fills).toEqual(new Set([NORMAL]));
  });

  test('動爻初九在最下列、上六在最上列', () => {
    // 初爻（動爻 1）是最下列 → 震為雷最下列是下卦初爻（陽），y=48
    const bottom = rowsByY(renderGlyph(ZHEN, ZHEN, 1));
    expect(bottom[5][1].fills).toEqual(new Set([MOVING]));
    // 上爻（動爻 6）是最上列 → 震為雷最上列是上卦第三爻（陰，兩個 rect）
    const top = rowsByY(renderGlyph(ZHEN, ZHEN, 6));
    expect(top[0][0]).toBe(0);
    expect(top[0][1].fills).toEqual(new Set([MOVING]));
    expect(top[0][1].count).toBe(2);
  });

  test('乾為天六陽、坤為地六陰', () => {
    const qian = rowsByY(renderGlyph(QIAN, QIAN));
    expect(qian.map(([, v]) => v.count)).toEqual([1, 1, 1, 1, 1, 1]);
    const kun = rowsByY(renderGlyph(KUN, KUN));
    expect(kun.map(([, v]) => v.count)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  test('動爻著色列與純函式一致（64 卦 × 6 爻全掃）', () => {
    for (let upper = 0; upper < 8; upper++) {
      for (let lower = 0; lower < 8; lower++) {
        for (let ml = 1; ml <= 6; ml++) {
          const rows = rowsByY(renderGlyph(upper, lower, ml));
          const expected = movingLineRowIndex(ml);
          rows.forEach(([, v], idx) => {
            expect(v.fills).toEqual(new Set([idx === expected ? MOVING : NORMAL]));
          });
        }
      }
    }
  });

  test('單卦 TrigramGlyph：艮由上而下陽陰陰', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TrigramGlyph trigram={GEN} color={NORMAL} />,
      );
    });
    const rows = rowsByY(renderer.root);
    expect(rows.map(([y]) => y)).toEqual([0, 9, 18]);
    expect(rows.map(([, v]) => v.count)).toEqual([1, 2, 2]);
  });
});

// 分享卡上卦象圖旁的六爻圓點列，方向必須與卦象圖一致：
// 最上列是上爻（第 6 爻）、最下列是初爻，否則動爻圓點會標錯位置。
const CARD_PROPS = {
  poemTitle: '水雷屯',
  poemContent: '元亨利貞',
  poemLevel: '上吉',
  poemHexagram: '水雷屯',
  pieceChars: ['帥', '將'],
  pieceColors: ['red', 'black'],
  mode: 'draw',
  timestamp: 1750000000000,
  hexagramIndex: 43, // 上坎下震
  movingLine: 1,
  changedName: '水澤節',
  bodyUseRelation: '體生用',
};

function renderCard(movingLine: number) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ShareCardView {...CARD_PROPS} movingLine={movingLine} />,
    );
  });
  return renderer;
}

/** 依文件順序（即由上而下）取六爻圓點列，回傳各列是否有動爻圓點。
 *  直接在 JSON 樹上走訪——測試渲染器在部分樹上會重複走訪同一節點。 */
function yaoSummaryRows(json: any) {
  const acc: Array<{ id: string; hasDot: boolean }> = [];
  (function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.props?.testID === 'string' &&
        node.props.testID.startsWith('yao-row-')) {
      acc.push({
        id: node.props.testID as string,
        hasDot: JSON.stringify(node).includes('○'),
      });
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  })(json);
  return acc;
}

describe('ShareCardView 六爻圓點列', () => {
  test('六列由上而下為第 6 爻到初爻，動爻圓點落在對應列', () => {
    // 動爻 1（初爻）→ 圓點落在最下列（舊版列序顛倒，圓點會浮在最上列）
    const bottom = yaoSummaryRows(renderCard(1).toJSON());
    expect(bottom.map(r => r.id)).toEqual(
      ['yao-row-6', 'yao-row-5', 'yao-row-4', 'yao-row-3', 'yao-row-2', 'yao-row-1']);
    expect(bottom.map(r => r.hasDot)).toEqual(
      [false, false, false, false, false, true]);

    // 動爻 6（上爻）→ 圓點落在最上列
    const top = yaoSummaryRows(renderCard(6).toJSON());
    expect(top.map(r => r.hasDot)).toEqual(
      [true, false, false, false, false, false]);

    // 動爻 4 → 由上面下第 3 列
    const fourth = yaoSummaryRows(renderCard(4).toJSON());
    expect(fourth.map(r => r.hasDot)).toEqual(
      [false, false, true, false, false, false]);
  });
});
