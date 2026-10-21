import { useState, type Ref } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type AnimatedStyle } from 'react-native-reanimated';

import { size } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The iOS highlight: dims at once on touch, fades back over 150ms on release. A fade, so it runs with Reduce Motion too. */
const DIM = 0.6;
const FADE_BACK = { duration: 150, reduceMotion: ReduceMotion.Never } as const;

type Props = Omit<PressableProps, 'style'> & {
  /** Can hold Reanimated styles (ActionPill's press scale). */
  style?: StyleProp<AnimatedStyle<ViewStyle>> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Height of what's drawn, so the hit area can grow to 44pt around it. */
  drawn?: number;
  /** For measuring it on screen (Kitchen's tabs, as drop targets). */
  ref?: Ref<View>;
};

/** A Pressable that dims a little when pressed and never has a hit area under 44pt. */
export function Tap({ style, drawn, hitSlop, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const slop = drawn && drawn < size.targetMin ? Math.ceil((size.targetMin - drawn) / 2) : undefined;
  const opacity = useSharedValue(1);
  // Only a style function needs the pressed state as React state.
  const [pressed, setPressed] = useState(false);
  const dim = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const pressIn = (e: GestureResponderEvent) => {
    if (!disabled) opacity.set(DIM);
    if (typeof style === 'function') setPressed(true);
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    opacity.set(withTiming(1, FADE_BACK));
    if (typeof style === 'function') setPressed(false);
    onPressOut?.(e);
  };
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop ?? slop}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[typeof style === 'function' ? style({ pressed }) : style, dim]}
    />
  );
}
