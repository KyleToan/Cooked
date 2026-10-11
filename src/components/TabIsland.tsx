import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Text } from './Text';

type TabKey = 'home' | 'scan' | 'recipes';
type Tab = { key: TabKey; label: string; icon: IconName; href: '/' | '/scan' | '/recipes' };

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/' },
  { key: 'scan', label: 'Scan', icon: 'scan', href: '/scan' },
  { key: 'recipes', label: 'Recipes', icon: 'recipes', href: '/recipes' },
];

/** Island icons are 22px in the spec, between the two icon sizes. */
const ISLAND_ICON = 22;
const MARK_WIDTH = 16;
const MARK_HEIGHT = 2.5;

/**
 * The floating tab island: Home, Scan and Recipes. Scan isn't a tab page; it
 * opens the camera full screen. Pushed screens like Kitchen show it too.
 */
export function TabIsland({ active }: { active: TabKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(space.s6, insets.bottom + space.s2) }]}>
      <View accessibilityRole="tablist" style={styles.island}>
        {TABS.map((tab) => {
          const on = tab.key === active;
          const onPress = () => {
            if (tab.key === 'scan') router.push('/scan');
            else if (!on) {
              // From a pushed screen (Kitchen), go back to the tabs first.
              if (router.canDismiss()) router.dismissAll();
              router.navigate(tab.href);
            }
          };
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              onPress={onPress}
              style={styles.tab}
            >
              <Icon name={tab.icon} size={ISLAND_ICON} color={on ? 'ink' : 'inkMuted'} />
              <Text variant="micro" color={on ? 'ink' : 'inkMuted'} weight={on ? 'semibold' : 'medium'}>
                {tab.label}
              </Text>
              <View style={[styles.mark, on && styles.markOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The island as the tab bar of the (tabs) navigator. */
export function TabBar({ state }: BottomTabBarProps) {
  return <TabIsland active={state.routes[state.index]?.name === 'recipes' ? 'recipes' : 'home'} />;
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
