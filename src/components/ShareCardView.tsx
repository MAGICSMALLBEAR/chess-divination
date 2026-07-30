// 分享圖片卡 — 美化版
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

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

    const levelColor =
      props.poemLevel === '大吉' ? '#C9A96E' : props.poemLevel === '上吉' ? '#E5746A' :
      props.poemLevel === '中吉' ? '#6B9B6B' : props.poemLevel === '中平' ? '#8A8060' : '#666';

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
                borderColor: props.pieceColors[i] === 'red' ? '#C0392B' : '#1A1210',
              }]}>
                <Text style={[styles.pieceChar, {
                  color: props.pieceColors[i] === 'red' ? '#C0392B' : '#1A1210',
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
    backgroundColor: '#F5EDE0', overflow: 'hidden',
  },
  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.45,
    backgroundColor: '#F5EDE0',
  },
  bgBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.55,
    backgroundColor: '#EDE5D5',
  },
  goldBar: {
    backgroundColor: '#8B6914', paddingVertical: 8, alignItems: 'center',
  },
  goldBarText: {
    fontSize: 12, color: '#F5EDE0', fontWeight: '600', letterSpacing: 3,
  },
  piecesRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 22,
  },
  piece: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  pieceChar: { fontSize: 26, fontWeight: '900' },
  levelChip: {
    alignSelf: 'center', marginTop: 16,
    paddingHorizontal: 20, paddingVertical: 5, borderRadius: 14,
  },
  levelText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  poemTitle: {
    fontSize: 20, fontWeight: '900', color: '#1A1210',
    textAlign: 'center', marginTop: 14, letterSpacing: 1,
  },
  hexagram: {
    fontSize: 13, color: '#8B6914', textAlign: 'center', marginTop: 4,
  },
  poemBox: {
    marginHorizontal: 40, marginTop: 18,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#D4C4A8',
    padding: 20,
  },
  poemLine: {
    fontSize: 19, color: '#1A1210', textAlign: 'center',
    lineHeight: 34, letterSpacing: 3,
  },
  footer: {
    alignItems: 'center', marginTop: 16,
  },
  footerMode: { fontSize: 12, color: '#8A7A60' },
  footerDate: { fontSize: 11, color: '#8A7A60', marginTop: 4 },
  footerUrl: { fontSize: 10, color: '#C9A96E', marginTop: 4 },
  footerTagline: {
    fontSize: 12, color: '#8B6914', marginTop: 6, letterSpacing: 2, fontWeight: '600',
  },
  goldBarBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 6, backgroundColor: '#8B6914',
  },
});
