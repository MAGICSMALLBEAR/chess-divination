// 分享圖片卡 v2
//
// 本卡片是匯出成圖片對外分享的成品，不是應用程式介面，
// 因此刻意固定為宣紙金箔的品牌樣式，不隨使用者的明暗主題改變。
// 色值集中於 ShareCardPalette。
//
// v2 變更：
// - SVG 圖示取代 Emoji
// - 加入六爻卦象圖
// - 支援六爻資訊（本卦/變卦/互卦/體用）

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, G, Line, Circle } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Icon } from '@/components/icons';
import { HexagramGlyph } from '@/components/icons/TrigramGlyph';
import { hexagramLines, trigramsFromIndex, trigramLine } from '@/services/hexagram';
import type { LineValue } from '@/services/hexagram';
import { useI18n } from '@/hooks/useI18n';
import { getLang } from '@/services/i18n';
import { ShareCardPalette as P, ShareCardLevelColors } from '@/constants/theme';

/** 日期格式跟隨介面語言：卡片上的色彩固定，文字則該是使用者讀得懂的語言 */
const DATE_LOCALES: Record<string, string> = {
  'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP',
};

const CARD_WIDTH = 400;
const CARD_HEIGHT = 680;

interface ShareCardViewProps {
  poemTitle: string;
  poemContent: string;
  poemLevel: string;
  poemHexagram: string;
  pieceChars: string[];
  pieceColors: string[];
  mode: string;
  timestamp: number;
  /** 先天序 0–63，有值時繪製卦象圖 */
  hexagramIndex?: number;
  /** 動爻 1–6 */
  movingLine?: number;
  /** 變卦卦名 */
  changedName?: string;
  /** 體用關係文字 */
  bodyUseRelation?: string;
}

export interface ShareCardHandle { share: () => Promise<boolean>; }

const ShareCardView = forwardRef<ShareCardHandle, ShareCardViewProps>(
  function ShareCardView(props, ref) {
    const viewShotRef = useRef<any>(null);
    const { t } = useI18n();

    useImperativeHandle(ref, () => ({
      // 回傳「是否真的分享出去」。Web 端 view-shot 擷取或系統分享任一
      // 不可用時回傳 false，讓呼叫端（reveal.tsx）走文字分享降級鏈。
      // 過去這裡把錯誤全吞掉又不回傳狀態，降級鏈成了永遠走不到的死碼。
      share: async () => {
        try {
          const uri = await viewShotRef.current?.capture?.();
          if (!uri) return false;
          if (!(await Sharing.isAvailableAsync())) return false;
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `${t('home.title')} - ${t('share.title')}`,
          });
          return true;
        } catch {
          console.warn(t('share.captureFailed'));
          return false;
        }
      },
    }));

    const dateStr = new Date(props.timestamp).toLocaleDateString(
      DATE_LOCALES[getLang()] ?? 'zh-TW',
      { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );

    const levelColor = ShareCardLevelColors[props.poemLevel] || ShareCardLevelColors['中平'];
    const poems = props.poemContent.split('\n');

    // 卦象：從先天序還原
    const hasHexagram = props.hexagramIndex !== undefined;
    const [upper, lower] = hasHexagram ? trigramsFromIndex(props.hexagramIndex!) : [0, 0];
    const lines = hasHexagram ? hexagramLines(upper, lower) : [];

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={styles.card}>
          {/* 背景：宣紙 + 底紋 */}
          <View style={styles.bgTop} />
          <View style={styles.bgBottom} />

          {/* 細微紙紋 —— 若干淡色橫線 */}
          <PaperTexture />

          {/* 頂部金色飾條 */}
          <View style={styles.goldBar}>
            <Text style={styles.goldBarText}>▬ ◈ {t('home.title')} ◈ ▬</Text>
          </View>

          {/* 棋子展示 */}
          <View style={styles.piecesRow}>
            {props.pieceChars.map((char, i) => (
              <View key={i} style={[styles.piece, {
                borderColor: props.pieceColors[i] === 'red' ? P.red : P.ink,
              }]}>
                <Text style={[styles.pieceChar, {
                  color: props.pieceColors[i] === 'red' ? P.red : P.ink,
                }]}>
                  {char}
                </Text>
              </View>
            ))}
          </View>

          {/* 吉凶等級 */}
          <View style={[styles.levelChip, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{props.poemLevel}</Text>
          </View>

          {/* 籤題 */}
          <Text style={styles.poemTitle}>{props.poemTitle}</Text>

          {/* 卦名 */}
          <Text style={styles.hexagram}>{props.poemHexagram}</Text>

          {/* 六爻卦象圖 */}
          {hasHexagram && (
            <View style={styles.hexagramGlyphWrap}>
              <HexagramGlyph
                upper={upper}
                lower={lower}
                movingLine={props.movingLine}
                size={60}
                color={P.ink}
                movingColor={P.red}
              />
            </View>
          )}

          {/* 六爻資訊摘要 */}
          {hasHexagram && props.movingLine && (
            <View style={styles.liuyaoSummary}>
              {lines.map((lv, i) => {
                const pos = i + 1;
                const isMoving = pos === props.movingLine;
                return (
                  <View key={i} style={styles.lineItem}>
                    <View style={[styles.lineMark, isMoving && styles.lineMarkMoving]}>
                      <Text style={[styles.lineMarkText, isMoving && { color: P.red }]}>
                        {isMoving ? '○' : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {props.changedName && (
                <Text style={styles.changedLabel}>→ {props.changedName}</Text>
              )}
              {props.bodyUseRelation && (
                <Text style={styles.bodyUseLabel}>{props.bodyUseRelation}</Text>
              )}
            </View>
          )}

          {/* 詩句 */}
          <View style={styles.poemBox}>
            {poems.map((line, i) => (
              <Text key={i} style={styles.poemLine}>{line}</Text>
            ))}
          </View>

          {/* 底部資訊 */}
          <View style={styles.footer}>
            <View style={styles.footerModeRow}>
              <Icon name={props.mode === 'draw' ? 'dice' : 'chess-board'} size={12} color={P.inkMuted} />
              <Text style={styles.footerMode}>
                {' '}{t(props.mode === 'draw' ? 'mode.draw' : 'mode.board')}
              </Text>
            </View>
            <Text style={styles.footerDate}>{dateStr}</Text>
            <Text style={styles.footerUrl}>chess-divination-app.vercel.app</Text>
            <Text style={styles.footerTagline}>{t('home.tagline')}</Text>
          </View>

          {/* 底部金條 */}
          <View style={styles.goldBarBottom} />
        </View>
      </ViewShot>
    );
  }
);

/** 宣紙紋理：若干隨機淡色橫線 */
function PaperTexture() {
  const lines = Array.from({ length: 8 }).map((_, i) => ({
    y: 80 + i * 70 + Math.sin(i * 1.7) * 20,
    w: 280 + Math.sin(i * 2.3) * 60,
    x: (400 - (280 + Math.sin(i * 2.3) * 60)) / 2,
  }));

  return (
    <Svg style={styles.texture} width={CARD_WIDTH} height={CARD_HEIGHT} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
      {lines.map((l, i) => (
        <Line
          key={i}
          x1={l.x}
          y1={l.y}
          x2={l.x + l.w}
          y2={l.y}
          stroke={P.border}
          strokeWidth={0.5}
          strokeOpacity={0.5}
        />
      ))}
      {/* 角落裝飾：梅花斑點。半徑由 index 決定性推導——render 期間的
          Math.random 會造成伺服器預渲染與客戶端 hydration 不一致 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Circle
          key={`dot-${i}`}
          cx={340 + Math.sin(i) * 30}
          cy={20 + i * 120}
          r={1.5 + (((i * 137.508) % 360) / 180)}
          fill={P.gold}
          opacity={0.3}
        />
      ))}
    </Svg>
  );
}

export default ShareCardView;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, height: CARD_HEIGHT,
    backgroundColor: P.paper, overflow: 'hidden',
  },
  texture: {
    position: 'absolute', top: 0, left: 0,
  },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.4,
    backgroundColor: P.paper,
  },
  bgBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.6,
    backgroundColor: P.paperDeep,
  },
  goldBar: {
    backgroundColor: P.gold, paddingVertical: 8, alignItems: 'center',
  },
  goldBarText: {
    fontSize: 12, color: P.paper, fontWeight: '600', letterSpacing: 3,
  },
  piecesRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 22,
  },
  piece: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: P.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  pieceChar: { fontSize: 24, fontWeight: '900' },
  levelChip: {
    alignSelf: 'center', marginTop: 14,
    paddingHorizontal: 20, paddingVertical: 5, borderRadius: 14,
  },
  levelText: { fontSize: 16, fontWeight: '700', color: P.onLevel },
  poemTitle: {
    fontSize: 20, fontWeight: '900', color: P.ink,
    textAlign: 'center', marginTop: 12, letterSpacing: 1,
  },
  hexagram: {
    fontSize: 13, color: P.gold, textAlign: 'center', marginTop: 4,
  },
  hexagramGlyphWrap: {
    alignItems: 'center', marginTop: 10,
  },
  liuyaoSummary: {
    alignItems: 'center', marginTop: 4,
  },
  lineItem: {
    flexDirection: 'row', alignItems: 'center',
  },
  lineMark: {
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  lineMarkMoving: {
    // 動爻以紅色圓點標示
  },
  lineMarkText: {
    fontSize: 14, fontWeight: '700', color: P.ink,
  },
  changedLabel: {
    fontSize: 11, color: P.red, marginTop: 2,
  },
  bodyUseLabel: {
    fontSize: 11, color: P.inkMuted, marginTop: 2,
  },
  poemBox: {
    marginHorizontal: 36, marginTop: 14,
    backgroundColor: P.white, borderRadius: 12,
    borderWidth: 1, borderColor: P.border,
    padding: 18,
  },
  poemLine: {
    fontSize: 18, color: P.ink, textAlign: 'center',
    lineHeight: 32, letterSpacing: 3,
  },
  footer: {
    alignItems: 'center', marginTop: 12,
  },
  footerModeRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  footerMode: { fontSize: 12, color: P.inkMuted },
  footerDate: { fontSize: 11, color: P.inkMuted, marginTop: 4 },
  footerUrl: { fontSize: 10, color: P.goldLight, marginTop: 4 },
  footerTagline: {
    fontSize: 12, color: P.gold, marginTop: 6, letterSpacing: 2, fontWeight: '600',
  },
  goldBarBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 6, backgroundColor: P.gold,
  },
});
