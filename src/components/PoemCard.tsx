// 籤詩卡元件
// 捲軸展開動畫、分面解讀、收藏分享

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Platform,
} from 'react-native';
import type { Poem } from '@/data/poems';
import { getLevelColor } from '@/data/poems';
import { localizePoem } from '@/services/localize';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import { useAnimationSpeed } from '@/hooks/useAnimationSpeed';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFontLoad } from '@/hooks/useFontLoad';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLayout } from '@/hooks/useLayout';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize, Duration, PaperSurface as P } from '@/constants/theme';

interface PoemCardProps {
  poem: Poem;
  drawnPieceChars?: string[];
  isFavorited?: boolean;
  highlightedCategory?: string;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}

// label 存的是譯文 key 而非文字：這個陣列在模組載入時就固定了，
// 存成文字會被凍結在當時的語言，之後切語言也不會變。
const CATEGORIES: { key: string; labelKey: string; icon: IconName }[] = [
  { key: 'general', labelKey: 'poem.catGeneral', icon: 'crystal-ball' },
  { key: 'marriage', labelKey: 'poem.catMarriage', icon: 'love' },
  { key: 'career', labelKey: 'poem.catCareer', icon: 'career' },
  { key: 'wealth', labelKey: 'poem.catWealth', icon: 'wealth' },
  { key: 'health', labelKey: 'poem.catHealth', icon: 'health' },
  { key: 'study', labelKey: 'poem.catStudy', icon: 'study' },
  { key: 'travel', labelKey: 'poem.catTravel', icon: 'travel' },
];

export default function PoemCard({
  poem,
  drawnPieceChars = [],
  isFavorited = false,
  highlightedCategory = 'general',
  onToggleFavorite,
  onShare,
}: PoemCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string>(highlightedCategory);
  const speed = useAnimationSpeed();
  const reduced = useReducedMotion();
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { contentWidth } = useLayout();
  const { t } = useI18n();
  const { loaded: fontLoaded } = useFontLoad();
  const localized = localizePoem(poem);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const lineAnimations = useRef(localized.content.split('\n').map(() => new Animated.Value(0))).current;

  // useAnimationSpeed 是掛載後才非同步取值，故必須列入依賴，
  // 否則動畫速度設定永遠只會用到預設值。
  useEffect(() => {
    const running: Animated.CompositeAnimation[] = [];

    scrollAnim.setValue(0);
    contentOpacity.setValue(0);
    lineAnimations.forEach(a => a.setValue(0));

    // 減少動態效果：直接顯示最終展開態，不跑捲軸與逐行動畫
    if (reduced) {
      scrollAnim.setValue(1);
      contentOpacity.setValue(1);
      lineAnimations.forEach(a => a.setValue(1));
      return;
    }

    const start = (anim: Animated.CompositeAnimation) => {
      running.push(anim);
      anim.start();
    };

    // 捲軸展開動畫
    start(Animated.sequence([
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: Duration.reveal * speed,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: Duration.normal * speed,
        useNativeDriver: true,
      }),
    ]));

    // 逐行顯示詩句
    lineAnimations.forEach((anim, i) => {
      start(Animated.sequence([
        Animated.delay((Duration.reveal + i * 300) * speed),
        Animated.spring(anim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]));
    });

    return () => running.forEach(a => a.stop());
  }, [reduced, speed, contentOpacity, lineAnimations, scrollAnim]);

  const scrollScaleY = scrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 1],
  });

  const levelColor = getLevelColor(localized.level);

  // 原生端在子集字型載入完成後才套用；web 沿用 CSS 字體堆疊
  // （poemLine 的 fontFamily 在原生端不是合法家族名，會被系統後備接住）
  const poemFont = Platform.OS === 'web'
    ? null
    : fontLoaded ? { fontFamily: 'NotoSerifTC' } : null;

  return (
    <View style={styles.container}>
      {/* 捲軸效果 */}
      <Animated.View
        style={[
          styles.scrollWrap,
          { width: contentWidth, transform: [{ scaleY: scrollScaleY }] },
        ]}
      >
        {/* 卷軸頂端 */}
        <View style={[styles.scrollTop, { width: contentWidth }]}>
          <View style={styles.scrollKnob} />
        </View>

        {/* 籤詩主體 */}
        <View style={[styles.scrollBody, { width: contentWidth }]}>
          {/* 棋象 */}
          {drawnPieceChars.length > 0 && (
            <Text style={styles.pieceChars}>
              {t('poem.pieces')}{drawnPieceChars.join(' ')}
            </Text>
          )}

          {/* 卦名 + 編號 */}
          <View style={styles.headerRow}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>{localized.level}</Text>
            </View>
            <Text style={styles.hexagramName}>
              {t('poem.number', { n: localized.number, hexagram: localized.hexagramName })}
            </Text>
          </View>

          {/* 籤題 */}
          <Text style={styles.poemTitle}>{localized.title}</Text>

          {/* 籤詩內容（逐行） */}
          <View style={styles.poemContent}>
            {localized.content.split('\n').map((line, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.poemLine,
                  poemFont,
                  {
                    opacity: lineAnimations[i],
                    transform: [{
                      translateY: lineAnimations[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
              >
                {line}
              </Animated.Text>
            ))}
          </View>

          {/* 裝飾線 */}
          <View style={styles.divider} />

          {/* 白話解釋 */}
          <Animated.View style={{ opacity: contentOpacity }}>
            <Text style={styles.vernacularTitle}>▎{t('poem.vernacular')}</Text>
            <Text style={styles.vernacular}>{localized.vernacular}</Text>
          </Animated.View>

          {/* 典故 */}
          <Animated.View style={[styles.storySection, { opacity: contentOpacity }]}>
            <Text style={styles.storyTitle}>▎{t('poem.story')}</Text>
            <Text style={styles.storyText}>{localized.story}</Text>
          </Animated.View>
        </View>

        {/* 卷軸底端 */}
        <View style={[styles.scrollBottom, { width: contentWidth }]}>
          <View style={styles.scrollKnob} />
        </View>
      </Animated.View>

      {/* 各面向解讀（折疊面板） */}
      <Animated.View
        style={[styles.categoriesSection, { width: contentWidth, opacity: contentOpacity }]}
      >
        <Text style={styles.sectionTitle}>▎{t('poem.categories')}</Text>
        <View style={styles.categoryTabs}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryTab,
                expandedCategory === cat.key && styles.categoryTabActive,
              ]}
              onPress={() => setExpandedCategory(cat.key)}
            >
              <Icon name={cat.icon} size={16} color={expandedCategory === cat.key ? theme.gold : theme.textMuted} />
              <Text
                style={[
                  styles.categoryLabel,
                  expandedCategory === cat.key && styles.categoryLabelActive,
                ]}
              >
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 解讀內容 */}
        <View style={styles.categoryContent}>
          <Text style={styles.categoryText}>
            {(localized.jieYue as unknown as Record<string, string>)[expandedCategory] || localized.jieYue.general}
          </Text>
        </View>
      </Animated.View>

      {/* 操作按鈕 */}
      <View style={[styles.actions, { width: contentWidth }]}>
        <TouchableOpacity style={styles.favBtn} onPress={onToggleFavorite}>
          <Icon name={isFavorited ? 'heart-filled' : 'heart'} size={16} color={isFavorited ? theme.textRed : theme.textSecondary} />
          <Text style={styles.favBtnText}>
            {' '}{t(isFavorited ? 'common.unfavorite' : 'common.favorite')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity testID="poem-share" style={styles.shareBtn} onPress={onShare}>
          <Icon name="share" size={16} color={theme.textInverse} />
          <Text style={styles.shareBtnText}> {t('common.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  // ── 卷軸本體：紙面與木軸固定為實體色，不隨主題改變 ──
  scrollWrap: {
    alignItems: 'center',
  },
  scrollTop: {
    height: 24,
    backgroundColor: P.wood,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBottom: {
    height: 24,
    backgroundColor: P.wood,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollKnob: {
    width: 60,
    height: 12,
    backgroundColor: P.woodDark,
    borderRadius: 6,
  },
  scrollBody: {
    backgroundColor: P.paper,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  pieceChars: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: P.red,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: FontSize.small,
    fontWeight: '700',
    color: P.onLevel,
  },
  hexagramName: {
    fontSize: FontSize.small,
    color: P.inkMuted,
  },
  poemTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: P.ink,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  poemContent: {
    marginBottom: Spacing.lg,
  },
  poemLine: {
    fontSize: FontSize.poem,
    color: P.ink,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 2,
    fontFamily: 'Noto Serif TC, KaiTi, STKaiti, serif',
  },
  divider: {
    height: 1,
    backgroundColor: P.border,
    marginVertical: Spacing.md,
  },
  vernacularTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: P.gold,
    marginBottom: Spacing.sm,
  },
  vernacular: {
    fontSize: FontSize.body,
    color: P.ink,
    lineHeight: 26,
  },
  storySection: {
    marginTop: Spacing.md,
  },
  storyTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: P.gold,
    marginBottom: Spacing.sm,
  },
  storyText: {
    fontSize: FontSize.small,
    color: P.inkMuted,
    lineHeight: 22,
  },
  // ── 卷軸之外的區塊：跟隨主題 ──
  categoriesSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: t.textSecondary,
    marginBottom: Spacing.md,
  },
  categoryTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: t.bgCard,
    borderWidth: 1,
    borderColor: t.bgMedium,
    gap: 4,
  },
  categoryTabActive: {
    borderColor: t.gold,
    backgroundColor: t.bgMedium,
  },
  categoryIcon: {
    fontSize: FontSize.small,
  },
  categoryLabel: {
    fontSize: FontSize.small,
    color: t.textMuted,
  },
  categoryLabelActive: {
    color: t.textGold,
    fontWeight: '600',
  },
  categoryContent: {
    backgroundColor: t.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.bgMedium,
    padding: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.body,
    color: t.textSecondary,
    lineHeight: 26,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  favBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.bgCard,
    borderWidth: 1,
    borderColor: t.bgMedium,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  favBtnText: {
    fontSize: FontSize.body,
    color: t.textSecondary,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.gold,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  shareBtnText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: t.textInverse,
  },
});
