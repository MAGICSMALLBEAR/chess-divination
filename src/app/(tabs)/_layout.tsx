// Tab 導覽配置 + 首次引導檢查
import { Tabs, useRouter } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getSettings } from '@/services/storage';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      if (!settings.hasCompletedOnboarding) {
        router.replace('/onboarding');
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.bgDark,
          borderTopColor: theme.bgMedium,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: '收藏',
          tabBarIcon: () => <TabIcon emoji="📜" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: () => <TabIcon emoji="⚙️" />,
        }}
      />
    </Tabs>
  );
}
