// The Cooked theme. Every color, font, size, space, radius and shadow in the
// app comes from here. Values are generated from design/system/tokens.json;
// see scripts/build-tokens.mjs.

import { font, type as typeStyles } from './tokens';

export { color, type, space, radius, size, shadow } from './tokens';
export type { ColorName, TypeName } from './tokens';
export { fontFaces } from './fonts';
export { brand } from './brand';

/**
 * Lexend weights, taken from the type styles that already use them, so a
 * component can say "this caption, but semibold" without naming a font.
 */
export const weight = {
  regular: typeStyles.body.fontFamily,
  medium: typeStyles.button.fontFamily,
  semibold: typeStyles.link.fontFamily,
} as const;
export type WeightName = keyof typeof weight;

/** The next weight up for each face, for iOS's Bold Text setting. */
export const bolder: Record<string, string> = {
  [font.Lexend_400Regular]: font.Lexend_500Medium,
  [font.Lexend_500Medium]: font.Lexend_600SemiBold,
  [font.Lexend_600SemiBold]: font.Lexend_700Bold,
  [font.Caveat_400Regular]: font.Caveat_500Medium,
  [font.Caveat_500Medium]: font.Caveat_600SemiBold,
  [font.Caveat_600SemiBold]: font.Caveat_700Bold,
};
