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
import { useI18n } from '@/hooks/useI18n';

interface ModeSelectorProps {
  onSelectMode: (mode: 'draw' | 'board') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useAppTheme();
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const cardWidth = (contentWidth - Spacing.md) / 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('mode.pick')}</Text>
      <Text style={styles.subtitle}>{t('home.tagline')}</Text>

      <View style={styles.cards}>
        {/* 抽棋式 */}
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          onPress={() => onSelectMode('draw')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t('mode.draw')} ${t('mode.drawDesc')}`}
        >
          <View style={styles.cardInner}>
            <View style={styles.cardIcon}>
              <Icon name="dice" size={40} color={theme.gold} />
            </View>
            <Text style={styles.cardTitle}>{t('mode.draw')}</Text>
            <Text style={styles.cardDesc}>
              {t('mode.drawDesc')}{'\n'}{t('mode.drawHint')}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.badgeText}>{t('mode.drawTag')}</Text>
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
            <Text style={styles.cardTitle}>{t('mode.board')}</Text>
            <Text style={styles.cardDesc}>
              {t('mode.boardDesc')}{'\n'}{t('mode.boardHint')}
            </Text>
            <View style={[styles.cardBadge, styles.cardBadgeAlt]}>
              <Text style={styles.badgeTextAlt}>{t('mode.boardTag')}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* 裝飾 */}
      <Text style={styles.footer}>── {t('mode.footer')} ──</Text>
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
