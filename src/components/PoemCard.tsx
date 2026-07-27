// 籤詩卡元件
// 捲軸展開動畫、分面解讀、收藏分享

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import type { Poem } from '@/data/poems';
import { getLevelColor } from '@/data/poems';
import { Spacing, FontSize, Duration } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PoemCardProps {
  poem: Poem;
  drawnPieceChars?: string[];
  isFavorited?: boolean;
  highlightedCategory?: string;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'general', label: '綜合', icon: '🔮' },
  { key: 'marriage', label: '感情', icon: '💕' },
  { key: 'career', label: '事業', icon: '💼' },
  { key: 'wealth', label: '財運', icon: '💰' },
  { key: 'health', label: '健康', icon: '💪' },
  { key: 'study', label: '學業', icon: '📚' },
  { key: 'travel', label: '出行', icon: '✈️' },
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
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const lineAnimations = useRef(poem.content.split('\n').map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // 捲軸展開動畫
    Animated.sequence([
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: Duration.reveal,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
    ]).start();

    // 逐行顯示詩句
    lineAnimations.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(Duration.reveal + i * 300),
        Animated.spring(anim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const scrollScaleY = scrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 1],
  });

  const levelColor = getLevelColor(poem.level);

  return (
    <View style={styles.container}>
      {/* 捲軸效果 */}
      <Animated.View
        style={[
          styles.scrollWrap,
          { transform: [{ scaleY: scrollScaleY }] },
        ]}
      >
        {/* 卷軸頂端 */}
        <View style={styles.scrollTop}>
          <View style={styles.scrollKnob} />
        </View>

        {/* 籤詩主體 */}
        <View style={styles.scrollBody}>
          {/* 棋象 */}
          {drawnPieceChars.length > 0 && (
            <Text style={styles.pieceChars}>
              棋象：{drawnPieceChars.join(' ')}
            </Text>
          )}

          {/* 卦名 + 編號 */}
          <View style={styles.headerRow}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>{poem.level}</Text>
            </View>
            <Text style={styles.hexagramName}>
              第{poem.number}籤 · {poem.hexagramName}
            </Text>
          </View>

          {/* 籤題 */}
          <Text style={styles.poemTitle}>{poem.title}</Text>

          {/* 籤詩內容（逐行） */}
          <View style={styles.poemContent}>
            {poem.content.split('\n').map((line, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.poemLine,
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
            <Text style={styles.vernacularTitle}>▎白話解釋</Text>
            <Text style={styles.vernacular}>{poem.vernacular}</Text>
          </Animated.View>

          {/* 典故 */}
          <Animated.View style={[styles.storySection, { opacity: contentOpacity }]}>
            <Text style={styles.storyTitle}>▎典故參考</Text>
            <Text style={styles.storyText}>{poem.story}</Text>
          </Animated.View>
        </View>

        {/* 卷軸底端 */}
        <View style={styles.scrollBottom}>
          <View style={styles.scrollKnob} />
        </View>
      </Animated.View>

      {/* 各面向解讀（折疊面板） */}
      <Animated.View style={[styles.categoriesSection, { opacity: contentOpacity }]}>
        <Text style={styles.sectionTitle}>▎各面向詳解</Text>
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
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  expandedCategory === cat.key && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 解讀內容 */}
        <View style={styles.categoryContent}>
          <Text style={styles.categoryText}>
            {(poem.jieYue as unknown as Record<string, string>)[expandedCategory] || poem.jieYue.general}
          </Text>
        </View>
      </Animated.View>

      {/* 操作按鈕 */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.favBtn} onPress={onToggleFavorite}>
          <Text style={styles.favBtnText}>
            {isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
          <Text style={styles.shareBtnText}>📤 分享</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scrollWrap: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    alignItems: 'center',
  },
  scrollTop: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    height: 24,
    backgroundColor: '#8B6914',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBottom: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    height: 24,
    backgroundColor: '#8B6914',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollKnob: {
    width: 60,
    height: 12,
    backgroundColor: '#6B4F10',
    borderRadius: 6,
  },
  scrollBody: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    backgroundColor: '#F5EDE0',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  pieceChars: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: '#C0392B',
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
    color: '#FFFFFF',
  },
  hexagramName: {
    fontSize: FontSize.small,
    color: '#5A4A38',
  },
  poemTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: '#1A1210',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  poemContent: {
    marginBottom: Spacing.lg,
  },
  poemLine: {
    fontSize: FontSize.poem,
    color: '#1A1210',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#D4C4A8',
    marginVertical: Spacing.md,
  },
  vernacularTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: '#8B6914',
    marginBottom: Spacing.sm,
  },
  vernacular: {
    fontSize: FontSize.body,
    color: '#1A1210',
    lineHeight: 26,
  },
  storySection: {
    marginTop: Spacing.md,
  },
  storyTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: '#8B6914',
    marginBottom: Spacing.sm,
  },
  storyText: {
    fontSize: FontSize.small,
    color: '#5A4A38',
    lineHeight: 22,
  },
  categoriesSection: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: '#C9B99A',
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
    backgroundColor: '#231A14',
    borderWidth: 1,
    borderColor: '#3A2F25',
    gap: 4,
  },
  categoryTabActive: {
    borderColor: '#C9A96E',
    backgroundColor: '#2A1F18',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: FontSize.small,
    color: '#8A7A60',
  },
  categoryLabelActive: {
    color: '#C9A96E',
    fontWeight: '600',
  },
  categoryContent: {
    backgroundColor: '#231A14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A2F25',
    padding: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.body,
    color: '#C9B99A',
    lineHeight: 26,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: SCREEN_WIDTH - Spacing.xl * 2,
  },
  favBtn: {
    flex: 1,
    backgroundColor: '#231A14',
    borderWidth: 1,
    borderColor: '#3A2F25',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  favBtnText: {
    fontSize: FontSize.body,
    color: '#C9B99A',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#C9A96E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: '#1A1210',
  },
});
