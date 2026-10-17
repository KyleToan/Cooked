import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/hooks/haptics';
import { useGoToTab } from '@/hooks/useGoToTab';
import { makeStyles, radius, shadow, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Text } from './Text';

type TabKey = 'home' | 'kitchen' | 'recipes';
type Tab = { key: TabKey; label: string; icon: IconName; href: '/' | '/kitchen' | '/recipes' };

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/' },
  { key: 'kitchen', label: 'Kitchen', icon: 'fridge', href: '/kitchen' },
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
/** A pressed tab sinks a little and springs back on the same spring. */
const PRESSED = 0.94;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Distance from the bottom of the screen to the bottom of the island. */
export function islandEdge(insetBottom: number) {
  return Math.max(space.s6, insetBottom + space.s2);
}

/**
 * The floating tab island: Home, Kitchen (Your Kitchen) and Recipes. Scan lives
 * in Home's top bar.
 * The grey underscore slides to the picked tab. Tapping the picked tab again calls `onReselect`
 * (the tab bar uses it to scroll that screen to the top).
 */
export function TabIsland({ active, onReselect }: { active: TabKey; onReselect?: () => void }) {
  const styles = useStyles();
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
        {TABS.map((tab) => (
          <IslandTab
            key={tab.key}
            tab={tab}
            on={tab.key === active}
            onPress={() => {
              haptics.select();
              if (tab.key === active) onReselect?.();
              else goToTab(tab.href);
            }}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              setTabs((t) => {
                const old = t[tab.key];
                return old && old.x === l.x && old.width === l.width && old.y === l.y ? t : { ...t, [tab.key]: l };
              });
            }}
            onMarkLayout={tab.key === 'home' ? (e) => setMarkTop(e.nativeEvent.layout.y) : undefined}
          />
        ))}
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

function IslandTab({
  tab,
  on,
  onPress,
  onLayout,
  onMarkLayout,
}: {
  tab: Tab;
  on: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  onMarkLayout?: (e: LayoutChangeEvent) => void;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) scale.set(withSpring(PRESSED, SLIDE));
      }}
      onPressOut={() => scale.set(withSpring(1, SLIDE))}
      onLayout={onLayout}
      style={[styles.tab, press]}
    >
      <Icon name={tab.icon} size={ISLAND_ICON} color={on ? 'ink' : 'inkMuted'} filled={on && tab.key === 'home'} />
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
      <View style={styles.mark} onLayout={onMarkLayout} />
    </AnimatedPressable>
  );
}

/** The island as the tab bar of the (tabs) navigator. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const route = state.routes[state.index];
  const name = route?.name;
  return (
    <TabIsland
      active={name === 'recipes' ? 'recipes' : name === 'kitchen' ? 'kitchen' : 'home'}
      // React Navigation's re-tap event: `useScrollToTop` in Screen listens for it.
      onReselect={() => route && navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })}
    />
  );
}

/** Bottom padding a scrolling tab screen needs so its last row clears the island ("about 130px"). */
export const ISLAND_CLEARANCE = 130;

const useStyles = makeStyles((color) => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  island: {
    width: size.islandWidth,
    height: size.islandHeight,
    padding: space.tight,
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
}));
