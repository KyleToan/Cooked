import { Text as RNText, type TextProps } from 'react-native';

import { color, type, weight as weights, type ColorName, type TypeName, type WeightName } from '@/theme';

type Props = TextProps & {
  /** A type style from the design system. Defaults to `body`. */
  variant?: TypeName;
  /** A color token. Defaults to `ink`. */
  color?: ColorName;
  /** Another Albert Sans weight for the same style (the specs use 500 and 600 on body and caption text). */
  weight?: WeightName;
  /** Draw a line through the text (done To Buy items). */
  strike?: boolean;
};

/** Text in one of the Cooked type styles. Use this instead of React Native's Text. */
export function Text({ variant = 'body', color: tint = 'ink', weight, strike, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: color[tint] },
        weight && { fontFamily: weights[weight] },
        strike && { textDecorationLine: 'line-through' },
        style,
      ]}
    />
  );
}
