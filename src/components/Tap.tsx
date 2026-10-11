import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { size } from '@/theme';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Height of what's drawn, so the hit area can grow to 44pt around it. */
  drawn?: number;
};

/** A Pressable that dims a little when pressed and never has a hit area under 44pt. */
export function Tap({ style, drawn, hitSlop, disabled, ...rest }: Props) {
  const slop = drawn && drawn < size.targetMin ? Math.ceil((size.targetMin - drawn) / 2) : undefined;
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop ?? slop}
      style={(state) => [typeof style === 'function' ? style(state) : style, state.pressed && !disabled && { opacity: 0.6 }]}
    />
  );
}
