import { Tabs } from 'expo-router';

import { TabIsland } from '@/components/TabIsland';

/** Home and Recipes. Scan sits in the island too, but opens full screen. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabIsland {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="recipes" />
    </Tabs>
  );
}
