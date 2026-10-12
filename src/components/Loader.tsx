import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useReducedMotion } from 'react-native-reanimated';
import { size as sizes, type ColorName } from '@/theme';
import { Icon } from './Icon';

const native = Platform.OS !== 'web';

/**
 * The `cooking` loader: a pot whose three wisps of steam fade in turn. For
 * longer jobs, always next to a line saying what's happening. Still with
 * reduce motion on.
 */
export function CookingLoader({ size = sizes.iconMd * 2, color = 'sageInk' }: { size?: number; color?: ColorName }) {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 3, duration: 1800, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [reduced, t]);

  // Shapes 0-1 are the pot; 2-4 are the wisps.
  const wisp = (i: number) =>
    reduced
      ? 1
      : t.interpolate({ inputRange: [i, i + 0.5, i + 1, 3], outputRange: [0.2, 1, 0.2, 0.2], extrapolate: 'clamp' });

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={StyleSheet.absoluteFill}>
        <Icon name="cooking" size={size} color={color} parts={[0, 1]} />
      </View>
      {[2, 3, 4].map((part, i) => (
        <Animated.View key={part} style={[StyleSheet.absoluteFill, { opacity: wisp(i) }]}>
          <Icon name="cooking" size={size} color={color} parts={[part]} />
        </Animated.View>
      ))}
    </View>
  );
}

/** The `loading` arc, turning once every 0.9s. For short waits. */
export function Spinner({ size = sizes.iconMd, color = 'inkMuted' }: { size?: number; color?: ColorName }) {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [reduced, t]);

  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon name="loading" size={size} color={color} />
    </Animated.View>
  );
}
