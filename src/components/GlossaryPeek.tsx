// 結果頁長按術語速查：長按盤面上的一塊，跳出那一塊用到的術語說明。
//
// 為什麼是「長按一塊」而不是「長按一個詞」：盤面上的術語多半嵌在句子裡
// （「妻財　甲子 水」「乾宮屬金 · 遊魂」），而 react-native-web 的 Text 沒有
// onLongPress，巢狀 Text 在 web 上長按不到。改成以區塊為單位：每一塊列出它
// 印著的那幾個詞，一次看完，不必對準兩個字。
//
// 為什麼走 context 而不是 prop：LiuYaoPanel 同時被離屏的報告長圖使用
// （ReportCardView），那裡沒有人能長按，也不該多出任何東西。沒有 Provider 時
// GlossaryTerm 原樣回傳 children——長圖的版面與這個功能上線前一模一樣，
// 不必在 LiuYaoPanel 裡多一個「現在是不是截圖」的旗標。
//
// 首載代價（10/1 量過、決定接受）：LiuYaoPanel 落在首載的共用 chunk（收藏頁的報告卡也用它），
// 詞典資料因此跟著進首載，br 約 18 KB（約 3%）。試過在長按時才 import()，沒有用——
// 詞典頁也要同一份資料，Metro 會把兩個非同步 chunk 共用的模組提進 __common。
// 要真的拿回這 18 KB，得連詞典頁一起改成非同步讀資料，換來一個載入狀態，不划算。

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { glossaryEntriesFor } from '@/services/glossary';

/** 長按多久算數。比 RN 預設（500）略短：盤面是讀的地方，不是捲動的地方，誤觸代價低 */
const LONG_PRESS_MS = 400;

type Peek = (keys: readonly string[]) => void;

const GlossaryPeekContext = createContext<Peek | null>(null);

/**
 * 包住盤面的一塊。有 Provider 時長按（與讀屏的「長按」動作）會打開速查表；
 * 沒有時原樣回傳 children。
 */
export function GlossaryTerm({ terms, children, style, testID }: {
  terms: readonly string[];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const peek = useContext(GlossaryPeekContext);
  const { t } = useI18n();
  if (!peek) return <>{children}</>;
  return (
    <Pressable
      testID={testID}
      style={style}
      delayLongPress={LONG_PRESS_MS}
      onLongPress={() => peek(terms)}
      accessibilityHint={t('glossaryPeek.hint')}
      accessibilityActions={[{ name: 'longpress', label: t('glossaryPeek.action') }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'longpress') peek(terms); }}
    >
      {children}
    </Pressable>
  );
}

/** 揭曉頁用它包住 LiuYaoPanel；速查表本身也由它負責顯示 */
export function GlossaryPeekProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<readonly string[] | null>(null);
  const peek = useCallback<Peek>(next => setKeys(next), []);
  return (
    <GlossaryPeekContext.Provider value={peek}>
      {children}
      <GlossaryPeekSheet keys={keys} onDismiss={() => setKeys(null)} />
    </GlossaryPeekContext.Provider>
  );
}

function GlossaryPeekSheet({ keys, onDismiss }: { keys: readonly string[] | null; onDismiss: () => void }) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, lang } = useI18n();
  const router = useRouter();
  const entries = useMemo(() => (keys ? glossaryEntriesFor(keys) : []), [keys]);

  return (
    <Modal visible={keys !== null && entries.length > 0} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        {/* 內層吃掉點擊，否則點在卡片上也會被背景的關閉手勢接走 */}
        <TouchableOpacity
          activeOpacity={1}
          testID="glossary-peek"
          style={[styles.card, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}
          onPress={() => {}}
        >
          <ScrollView style={styles.scroll}>
            {entries.map((entry, i) => (
              <View key={entry.key} testID={`glossary-peek-${entry.key}`}
                style={[styles.entry, i > 0 && { borderTopWidth: 1, borderColor: theme.bgMedium }]}>
                <View style={styles.termRow}>
                  <Text style={[styles.term, { color: theme.textPrimary }]}>{entry.term}</Text>
                  {/* 與詞典同一條規則：術語不翻譯，en 讀者靠這一行對上意思 */}
                  {lang === 'en' && <Text style={[styles.gloss, { color: theme.textMuted }]}>{entry.gloss}</Text>}
                </View>
                <Text style={[styles.body, { color: theme.textSecondary }]}>{entry.plain[lang]}</Text>
                <Text style={[styles.inAppLabel, { color: theme.textGold }]}>{t('glossary.inApp')}</Text>
                <Text style={[styles.body, { color: theme.textSecondary }]}>{entry.inApp[lang]}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            testID="glossary-peek-open"
            style={styles.link}
            accessibilityRole="link"
            onPress={() => { onDismiss(); router.push('/glossary'); }}
          >
            <Text style={[styles.linkText, { color: theme.textGold }]}>{t('glossaryPeek.openGlossary')} →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="glossary-peek-close"
            style={styles.close}
            accessibilityRole="button"
            onPress={onDismiss}
          >
            <Text style={[styles.closeText, { color: theme.textMuted }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: t.scrim,
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 420, maxHeight: '80%',
    borderRadius: 16, borderWidth: 1,
    padding: Spacing.lg,
  },
  // 一塊最多列六、七條（納甲盤的一爻），手機上會超過一屏，捲動的是條目、按鈕留在底下
  scroll: { flexGrow: 0 },
  entry: { paddingVertical: Spacing.sm },
  termRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: Spacing.sm },
  term: { fontSize: FontSize.subtitle, fontWeight: '700' },
  gloss: { fontSize: FontSize.caption },
  body: { fontSize: FontSize.small, lineHeight: 21, marginTop: 4 },
  inAppLabel: { fontSize: FontSize.caption, fontWeight: '700', marginTop: Spacing.sm },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  linkText: { fontSize: FontSize.small, fontWeight: '600' },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: FontSize.small },
});
