import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabIsland';

/** Home, Your Kitchen (Fridge in the island) and Recipes. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kitchen" />
      <Tabs.Screen name="recipes" />
    </Tabs>
  );
}
