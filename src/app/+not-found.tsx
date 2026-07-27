import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '找不到頁面' }} />
      <View style={styles.container}>
        <Text style={styles.title}>此頁面不存在</Text>
        <Link href={'/' as any} style={styles.link}>
          <Text style={styles.linkText}>回到首頁</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0D0A08',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5EDE0',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#C9A96E',
  },
});
