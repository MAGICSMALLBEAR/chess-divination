// Tab 導覽配置 + 首次引導檢查
import { Tabs, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import { getSettings } from '@/services/storage';

function TabIcon({ name, color }: { name: IconName; color: string | { toString(): string } }) {
  return <Icon name={name} size={22} color={String(color)} />;
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
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: '收藏',
          tabBarIcon: ({ color }) => <TabIcon name="scroll" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
