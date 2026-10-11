import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Text } from './Text';

type Tab = { key: 'home' | 'scan' | 'recipes'; label: string; icon: IconName; route?: string };

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', route: 'index' },
  { key: 'scan', label: 'Scan', icon: 'scan' },
  { key: 'recipes', label: 'Recipes', icon: 'recipes', route: 'recipes' },
];

/** Island icons are 22px in the spec, between the two icon sizes. */
const ISLAND_ICON = 22;
const MARK_WIDTH = 16;
const MARK_HEIGHT = 2.5;

/**
 * The floating tab island: Home, Scan and Recipes. Scan isn't a tab page; it
 * opens the camera full screen.
 */
export function TabIsland({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(space.s6, insets.bottom + space.s2) }]}
    >
      <View accessibilityRole="tablist" style={styles.island}>
        {TABS.map((tab) => {
          const active = tab.route === activeRoute;
          const onPress = () => {
            if (!tab.route) {
              router.push('/scan');
              return;
            }
            const route = state.routes.find((r) => r.name === tab.route);
            if (!route) return;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={onPress}
              style={styles.tab}
            >
              <Icon name={tab.icon} size={ISLAND_ICON} color={active ? 'ink' : 'inkMuted'} />
              <Text variant="micro" color={active ? 'ink' : 'inkMuted'} weight={active ? 'semibold' : 'medium'}>
                {tab.label}
              </Text>
              <View style={[styles.mark, active && styles.markOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom padding a scrolling tab screen needs so its last row clears the island ("about 130px"). */
export const ISLAND_CLEARANCE = 130;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  island: {
    width: size.islandWidth,
    height: size.islandHeight,
    padding: space.s1 + 2,
    flexDirection: 'row',
    gap: space.s1,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    ...shadow.island,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  mark: { width: MARK_WIDTH, height: MARK_HEIGHT, borderRadius: 2, marginTop: 1, backgroundColor: 'transparent' },
  markOn: { backgroundColor: color.tabMark },
});
