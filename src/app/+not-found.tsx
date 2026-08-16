import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useI18n } from '@/hooks/useI18n';

export default function NotFoundScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFound.desc')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.home')}</Text>
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
