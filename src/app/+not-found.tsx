import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';

export default function NotFoundScreen() {
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <Stack.Screen options={{ title: '找不到頁面' }} />
      <View style={styles.container}>
        <Text style={styles.title}>此頁面不存在</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>回到首頁</Text>
        </Link>
      </View>
    </>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: t.bgInk,
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: 'bold',
    color: t.textPrimary,
  },
  link: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.small,
    color: t.gold,
  },
});
