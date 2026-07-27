// 模式選擇元件
// 兩種模式：抽棋式 + 棋盤佈局式

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Spacing, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModeSelectorProps {
  onSelectMode: (mode: 'draw' | 'board') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const cardWidth = (SCREEN_WIDTH - Spacing.md * 3) / 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>選擇占卜方式</Text>
      <Text style={styles.subtitle}>以棋問道，觀象知機</Text>

      <View style={styles.cards}>
        {/* 抽棋式 */}
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          onPress={() => onSelectMode('draw')}
          activeOpacity={0.8}
        >
          <View style={styles.cardInner}>
            <Text style={styles.cardIcon}>🎲</Text>
            <Text style={styles.cardTitle}>抽棋占卜</Text>
            <Text style={styles.cardDesc}>
              從32顆棋子中{'\n'}隨機抽取1-3顆{'\n'}觀棋象而知天機
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.badgeText}>快速便捷</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 棋盤式 */}
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          onPress={() => onSelectMode('board')}
          activeOpacity={0.8}
        >
          <View style={styles.cardInner}>
            <Text style={styles.cardIcon}>♟️</Text>
            <Text style={styles.cardTitle}>棋盤佈局</Text>
            <Text style={styles.cardDesc}>
              在棋盤上親手{'\n'}擺放棋子位置{'\n'}佈局問道更深層
            </Text>
            <View style={[styles.cardBadge, styles.cardBadgeAlt]}>
              <Text style={styles.badgeTextAlt}>深度體驗</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* 裝飾 */}
      <Text style={styles.footer}>── 棋中有道，心誠則靈 ──</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: '#F5EDE0',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    marginBottom: Spacing.xl,
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: '#231A14',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A2F25',
    overflow: 'hidden',
  },
  cardInner: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    color: '#C9A96E',
    marginBottom: Spacing.sm,
  },
  cardDesc: {
    fontSize: FontSize.small,
    color: '#C9B99A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  cardBadge: {
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#C9A96E',
  },
  cardBadgeAlt: {
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
  },
  badgeTextAlt: {
    fontSize: 12,
    color: '#E5746A',
  },
  footer: {
    fontSize: FontSize.small,
    color: '#8A7A60',
    letterSpacing: 2,
  },
});
