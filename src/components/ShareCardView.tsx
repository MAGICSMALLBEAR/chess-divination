// 分享圖片卡 — 美化版
//
// 本卡片是匯出成圖片對外分享的成品，不是應用程式介面，
// 因此刻意固定為宣紙金箔的品牌樣式，不隨使用者的明暗主題改變——
// 否則同一張分享卡在不同使用者手上會長得不一樣。色值集中於 ShareCardPalette。
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ShareCardPalette as P, ShareCardLevelColors } from '@/constants/theme';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 620;

interface ShareCardViewProps {
  poemTitle: string;
  poemContent: string;
  poemLevel: string;
  poemHexagram: string;
  pieceChars: string[];
  pieceColors: string[];
  mode: string;
  timestamp: number;
}

export interface ShareCardHandle { share: () => Promise<void>; }

const ShareCardView = forwardRef<ShareCardHandle, ShareCardViewProps>(
  function ShareCardView(props, ref) {
    const viewShotRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      share: async () => {
        try {
          const uri = await viewShotRef.current?.capture?.();
          if (uri && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '象棋占卜 - 分享籤詩' });
          }
        } catch {}
      },
    }));

    const dateStr = new Date(props.timestamp).toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const levelColor = ShareCardLevelColors[props.poemLevel] || ShareCardLevelColors['中平'];

    const poems = props.poemContent.split('\n');

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={styles.card}>
          {/* 背景紋理 */}
          <View style={styles.bgTop} />
          <View style={styles.bgBottom} />

          {/* 頂部金色飾條 */}
          <View style={styles.goldBar}>
            <Text style={styles.goldBarText}>▬ ◈ 象棋占卜 ◈ ▬</Text>
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

          {/* 詩句 */}
          <View style={styles.poemBox}>
            {poems.map((line, i) => (
              <Text key={i} style={styles.poemLine}>{line}</Text>
            ))}
          </View>

          {/* 底部資訊 */}
          <View style={styles.footer}>
            <Text style={styles.footerMode}>
              {props.mode === 'draw' ? '🎲 抽棋占卜' : '♟️ 棋盤佈局'}
            </Text>
            <Text style={styles.footerDate}>{dateStr}</Text>
            <Text style={styles.footerUrl}>chess-divination-app.vercel.app</Text>
            <Text style={styles.footerTagline}>以棋問道 · 觀象知機</Text>
          </View>

          {/* 底部金條 */}
          <View style={styles.goldBarBottom} />
        </View>
      </ViewShot>
    );
  }
);

export default ShareCardView;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, height: CARD_HEIGHT,
    backgroundColor: P.paper, overflow: 'hidden',
  },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.45,
    backgroundColor: P.paper,
  },
  bgBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.55,
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
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: P.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  pieceChar: { fontSize: 26, fontWeight: '900' },
  levelChip: {
    alignSelf: 'center', marginTop: 16,
    paddingHorizontal: 20, paddingVertical: 5, borderRadius: 14,
  },
  levelText: { fontSize: 16, fontWeight: '700', color: P.onLevel },
  poemTitle: {
    fontSize: 20, fontWeight: '900', color: P.ink,
    textAlign: 'center', marginTop: 14, letterSpacing: 1,
  },
  hexagram: {
    fontSize: 13, color: P.gold, textAlign: 'center', marginTop: 4,
  },
  poemBox: {
    marginHorizontal: 40, marginTop: 18,
    backgroundColor: P.white, borderRadius: 12,
    borderWidth: 1, borderColor: P.border,
    padding: 20,
  },
  poemLine: {
    fontSize: 19, color: P.ink, textAlign: 'center',
    lineHeight: 34, letterSpacing: 3,
  },
  footer: {
    alignItems: 'center', marginTop: 16,
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
