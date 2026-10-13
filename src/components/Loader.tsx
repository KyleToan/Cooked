import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { size as sizes, type ColorName } from '@/theme';
import { Icon } from './Icon';

/** Runs `t` from 0 to `to` over `duration`, forever; still under Reduce Motion. */
function useLoop(to: number, duration: number) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withRepeat(withTiming(to, { duration, easing: Easing.linear }), -1));
    return () => {
      cancelAnimation(t);
      t.set(0);
    };
  }, [reduced, t, to, duration]);
  return { t, reduced };
}

/**
 * The `cooking` loader: a pot whose three wisps of steam fade in turn. For
 * longer jobs, always next to a line saying what's happening. Still with
 * reduce motion on.
 */
export function CookingLoader({ size = sizes.iconMd * 2, color = 'sageInk' }: { size?: number; color?: ColorName }) {
  const { t, reduced } = useLoop(3, 1800);

  // Shapes 0-1 are the pot; 2-4 are the wisps.
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={StyleSheet.absoluteFill}>
        <Icon name="cooking" size={size} color={color} parts={[0, 1]} />
      </View>
      {[2, 3, 4].map((part, i) => (
        <Wisp key={part} t={t} i={i} reduced={reduced}>
          <Icon name="cooking" size={size} color={color} parts={[part]} />
        </Wisp>
      ))}
    </View>
  );
}

/** One wisp: bright for its third of the loop, faint the rest. */
function Wisp({ t, i, reduced, children }: { t: SharedValue<number>; i: number; reduced: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : interpolate(t.get(), [i, i + 0.5, i + 1, 3], [0.2, 1, 0.2, 0.2], 'clamp'),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** The `loading` arc, turning once every 0.9s. For short waits. */
export function Spinner({ size = sizes.iconMd, color = 'inkMuted' }: { size?: number; color?: ColorName }) {
  const { t } = useLoop(1, 900);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.get() * 360}deg` }] }));
  return (
    <Animated.View style={turn}>
      <Icon name="loading" size={size} color={color} />
    </Animated.View>
  );
}
