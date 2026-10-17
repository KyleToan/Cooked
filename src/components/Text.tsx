import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { useBoldText } from '@/hooks/useBoldText';
import { bolder, color, type, weight as weights, type ColorName, type TypeName, type WeightName } from '@/theme';

type Props = TextProps & {
  /** A type style from the design system. Defaults to `body`. */
  variant?: TypeName;
  /** A color token. Defaults to `ink`. */
  color?: ColorName;
  /** Another Lexend weight for the same style (the specs use 500 and 600 on body and caption text). */
  weight?: WeightName;
  /** Draw a line through the text (done To Buy items). */
  strike?: boolean;
};

/** Text in one of the Cooked type styles. Use this instead of React Native's Text. */
export function Text({ variant = 'body', color: tint = 'ink', weight, strike, style, ...rest }: Props) {
  const bold = useBoldText();
  const styles = [
    type[variant],
    { color: color[tint] },
    weight && { fontFamily: weights[weight] },
    strike && { textDecorationLine: 'line-through' as const },
    style,
  ];
  // Custom fonts don't follow Bold Text on their own, so step each face up one weight.
  const family = bold ? StyleSheet.flatten(styles).fontFamily : undefined;
  return <RNText {...rest} style={family && bolder[family] ? [styles, { fontFamily: bolder[family] }] : styles} />;
}
