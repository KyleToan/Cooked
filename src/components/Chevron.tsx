import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { ColorName } from '@/theme';
import { Icon } from './Icon';

const TURN = { left: 0, up: 90, right: 180, down: -90 } as const;

/** Critically damped, about 0.3s; instant when the person has asked for less motion. */
const TURN_SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

/**
 * The back arrow from the icon set, turned to point any way: row chevrons and the place tag.
 * With `animated`, it turns to its new direction with a short spring instead of flipping.
 */
export function Chevron({
  direction,
  size = 16,
  color = 'inkSubtle',
  animated = false,
}: {
  direction: keyof typeof TURN;
  size?: number;
  color?: ColorName;
  animated?: boolean;
}) {
  if (animated) return <TurningChevron direction={direction} size={size} color={color} />;
  return (
    <View style={{ transform: [{ rotate: `${TURN[direction]}deg` }] }}>
      <Icon name="back" size={size} color={color} />
    </View>
  );
}

function TurningChevron({ direction, size, color }: { direction: keyof typeof TURN; size: number; color: ColorName }) {
  const turn = useSharedValue<number>(TURN[direction]);
  useEffect(() => {
    turn.value = withSpring(TURN[direction], TURN_SPRING);
  }, [direction, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Icon name="back" size={size} color={color} />
    </Animated.View>
  );
}
