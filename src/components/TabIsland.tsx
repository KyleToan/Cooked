import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/hooks/haptics';
import { useGoToTab } from '@/hooks/useGoToTab';
import { color, radius, shadow, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Text } from './Text';

type TabKey = 'home' | 'kitchen' | 'recipes';
type Tab = { key: TabKey; label: string; icon: IconName; href: '/' | '/kitchen' | '/recipes' };

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/' },
  { key: 'kitchen', label: 'Fridge', icon: 'fridge', href: '/kitchen' },
  { key: 'recipes', label: 'Recipes', icon: 'recipes', href: '/recipes' },
];

/** Island icons are 22px in the spec, between the two icon sizes. */
const ISLAND_ICON = 22;
const MARK_WIDTH = 16;
const MARK_HEIGHT = 2.5;
const ISLAND_BORDER = 1;
/** The island is chrome: its labels grow with Dynamic Type, but only a little, so the pill keeps its shape. */
export const CHROME_TEXT_MAX = 1.3;

/** Critically damped, about 0.3s; instant when the person has asked for less motion. */
const SLIDE = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

/** Distance from the bottom of the screen to the bottom of the island. */
export function islandEdge(insetBottom: number) {
  return Math.max(space.s6, insetBottom + space.s2);
}

/**
 * The floating tab island: Home, Fridge (Your Kitchen) and Recipes. Scan lives
 * in Home's top bar.
 * The grey underscore slides to the picked tab.
 */
export function TabIsland({ active }: { active: TabKey }) {
  const goToTab = useGoToTab();
  const insets = useSafeAreaInsets();
  const [tabs, setTabs] = useState<Partial<Record<TabKey, LayoutRectangle>>>({});
  const [markTop, setMarkTop] = useState<number | null>(null);

  const target = tabs[active];
  const x = useSharedValue(-1);
  useEffect(() => {
    if (!target) return;
    // Layout x counts the island's border; an absolute child starts inside it.
    const to = target.x - ISLAND_BORDER + (target.width - MARK_WIDTH) / 2;
    // First placement doesn't animate; later ones slide.
    x.value = x.value < 0 ? to : withSpring(to, SLIDE);
  }, [target, x]);
  const markStyle = useAnimatedStyle(() => ({ opacity: x.value < 0 ? 0 : 1, transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: islandEdge(insets.bottom) }]}>
      <View accessibilityRole="tablist" style={styles.island}>
        {TABS.map((tab) => {
          const on = tab.key === active;
          const onPress = () => {
            if (on) return;
            haptics.select();
            goToTab(tab.href);
          };
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              onPress={onPress}
              onLayout={(e) => {
                const l = e.nativeEvent.layout;
                setTabs((t) => {
                  const old = t[tab.key];
                  return old && old.x === l.x && old.width === l.width && old.y === l.y ? t : { ...t, [tab.key]: l };
                });
              }}
              style={styles.tab}
            >
              <Icon name={tab.icon} size={ISLAND_ICON} color={on ? 'ink' : 'inkMuted'} />
              <Text
                variant="micro"
                color={on ? 'ink' : 'inkMuted'}
                weight={on ? 'semibold' : 'medium'}
                numberOfLines={1}
                maxFontSizeMultiplier={CHROME_TEXT_MAX}
              >
                {tab.label}
              </Text>
              {/* Keeps the room for the underscore; the one that moves is drawn over the island. */}
              <View
                style={styles.mark}
                onLayout={tab.key === 'home' ? (e) => setMarkTop(e.nativeEvent.layout.y) : undefined}
              />
            </Pressable>
          );
        })}
        {target && markTop !== null ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.mark, styles.markOn, { top: target.y - ISLAND_BORDER + markTop }, markStyle]}
          />
        ) : null}
      </View>
    </View>
  );
}

/** The island as the tab bar of the (tabs) navigator. */
export function TabBar({ state }: BottomTabBarProps) {
  const name = state.routes[state.index]?.name;
  return <TabIsland active={name === 'recipes' ? 'recipes' : name === 'kitchen' ? 'kitchen' : 'home'} />;
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
    borderWidth: ISLAND_BORDER,
    borderColor: color.line,
    ...shadow.island,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  mark: { width: MARK_WIDTH, height: MARK_HEIGHT, borderRadius: 2, marginTop: 1, backgroundColor: 'transparent' },
  markOn: { position: 'absolute', left: 0, marginTop: 0, backgroundColor: color.tabMark },
});
