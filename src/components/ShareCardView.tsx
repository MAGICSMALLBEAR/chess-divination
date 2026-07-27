// 分享圖片卡元件
// 用於生成可分享的占卜結果圖片

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const CARD_WIDTH = 375;
const CARD_HEIGHT = 600;

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

export interface ShareCardHandle {
  share: () => Promise<void>;
}

const ShareCardView = forwardRef<ShareCardHandle, ShareCardViewProps>(
  function ShareCardView(props, ref) {
    const viewShotRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      share: async () => {
        try {
          const uri = await viewShotRef.current?.capture?.();
          if (uri && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: '象棋占卜 - 分享籤詩',
            });
          }
        } catch (e) {
          console.log('Share error:', e);
        }
      },
    }));

    const dateStr = new Date(props.timestamp).toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const levelColor =
      props.poemLevel === '大吉' ? '#C9A96E' :
      props.poemLevel === '上吉' ? '#E5746A' :
      props.poemLevel === '中吉' ? '#6B9B6B' :
      props.poemLevel === '中平' ? '#C9B99A' : '#8A7A60';

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={styles.card}>
          {/* 棋盤底色 */}
          <View style={styles.woodBg} />

          {/* 頂部飾邊 */}
          <View style={styles.topBorder}>
            <View style={styles.knob} />
          </View>

          {/* 標題 */}
          <Text style={styles.appName}>象棋占卜</Text>
          <Text style={styles.dateText}>{dateStr}</Text>

          {/* 棋子展示 */}
          <View style={styles.piecesRow}>
            {props.pieceChars.map((char, i) => (
              <View key={i} style={styles.piece}>
                <Text style={[
                  styles.pieceChar,
                  { color: props.pieceColors[i] === 'red' ? '#C0392B' : '#1A1210' },
                ]}>
                  {char}
                </Text>
              </View>
            ))}
          </View>

          {/* 吉凶 */}
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{props.poemLevel}</Text>
          </View>

          {/* 籤題 */}
          <Text style={styles.poemTitle}>
            第{props.poemHexagram}籤 · {props.poemTitle}
          </Text>

          {/* 籤詩內容 */}
          <View style={styles.poemBox}>
            {props.poemContent.split('\n').map((line, i) => (
              <Text key={i} style={styles.poemLine}>{line}</Text>
            ))}
          </View>

          {/* 模式標記 */}
          <Text style={styles.modeLabel}>
            {props.mode === 'draw' ? '🎲 抽棋占卜' : '♟️ 棋盤佈局'}
          </Text>

          {/* 底部 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>以棋問道 · 觀象知機</Text>
          </View>
        </View>
      </ViewShot>
    );
  }
);

export default ShareCardView;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#F5EDE0',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 0,
  },
  woodBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F5EDE0',
  },
  topBorder: {
    width: '100%', height: 20,
    backgroundColor: '#8B6914',
    alignItems: 'center', justifyContent: 'center',
  },
  knob: {
    width: 80, height: 10, backgroundColor: '#6B4F10', borderRadius: 5,
  },
  appName: {
    fontSize: 20, fontWeight: '900', color: '#8B6914',
    marginTop: 20, letterSpacing: 4,
  },
  dateText: {
    fontSize: 12, color: '#8A7A60', marginTop: 4,
  },
  piecesRow: {
    flexDirection: 'row', gap: 12, marginTop: 20,
  },
  piece: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#8B6914',
  },
  pieceChar: {
    fontSize: 24, fontWeight: '900',
  },
  levelBadge: {
    marginTop: 16, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12,
  },
  levelText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },
  poemTitle: {
    fontSize: 18, fontWeight: '700', color: '#1A1210',
    marginTop: 12,
  },
  poemBox: {
    width: 300, backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#D4C4A8',
    padding: 20, marginTop: 16,
  },
  poemLine: {
    fontSize: 18, color: '#1A1210', textAlign: 'center',
    lineHeight: 34, letterSpacing: 2,
  },
  modeLabel: {
    fontSize: 12, color: '#8A7A60', marginTop: 16,
  },
  footer: {
    position: 'absolute', bottom: 20,
  },
  footerText: {
    fontSize: 12, color: '#8A7A60', letterSpacing: 2,
  },
});
