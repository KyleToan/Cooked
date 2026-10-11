import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabIsland';

/** Home and Recipes. Scan sits in the island too, but opens full screen. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="recipes" />
    </Tabs>
  );
}
