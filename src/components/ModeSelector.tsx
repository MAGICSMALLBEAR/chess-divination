// 模式選擇元件
// 兩種模式：抽棋式 + 棋盤佈局式

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/icons';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ModeSelectorProps {
  onSelectMode: (mode: 'draw' | 'board') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useAppTheme();
  const { contentWidth } = useLayout();
  const cardWidth = (contentWidth - Spacing.md) / 2;

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
          accessibilityRole="button"
          accessibilityLabel="抽棋占卜 從32顆棋子中隨機抽取"
        >
          <View style={styles.cardInner}>
            <View style={styles.cardIcon}>
              <Icon name="dice" size={40} color={theme.gold} />
            </View>
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
            <View style={styles.cardIcon}>
              <Icon name="chess-board" size={40} color={theme.gold} />
            </View>
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

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: t.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: t.textSecondary,
    marginBottom: Spacing.xl,
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: t.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.bgMedium,
    overflow: 'hidden',
  },
  cardInner: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardIcon: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.heading,
    fontWeight: '700',
    color: t.textGold,
    marginBottom: Spacing.sm,
  },
  cardDesc: {
    fontSize: FontSize.small,
    color: t.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  cardBadge: {
    backgroundColor: t.bgMedium,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: FontSize.caption,
    color: t.textGold,
  },
  cardBadgeAlt: {
    backgroundColor: t.bgDark,
  },
  badgeTextAlt: {
    fontSize: FontSize.caption,
    color: t.textRed,
  },
  footer: {
    fontSize: FontSize.small,
    color: t.textMuted,
    letterSpacing: 2,
  },
});
