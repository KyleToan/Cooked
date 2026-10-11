import { Text as RNText, type TextProps } from 'react-native';

import { color, type, type ColorName, type TypeName } from '@/theme';

type Props = TextProps & {
  /** A type style from the design system. Defaults to `body`. */
  variant?: TypeName;
  /** A color token. Defaults to `ink`. */
  color?: ColorName;
};

/** Text in one of the Cooked type styles. Use this instead of React Native's Text. */
export function Text({ variant = 'body', color: tint = 'ink', style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant], { color: color[tint] }, style]} />;
}
