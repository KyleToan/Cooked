// The Cooked theme. Every color, font, size, space, radius and shadow in the
// app comes from here. Values are generated from design/system/tokens.json;
// see scripts/build-tokens.mjs.

import { type as typeStyles } from './tokens';

export { color, type, space, radius, size, shadow } from './tokens';
export type { ColorName, TypeName } from './tokens';
export { fontFaces } from './fonts';
export { brand } from './brand';

/**
 * Albert Sans weights, taken from the type styles that already use them, so a
 * component can say "this caption, but semibold" without naming a font.
 */
export const weight = {
  regular: typeStyles.body.fontFamily,
  medium: typeStyles.button.fontFamily,
  semibold: typeStyles.link.fontFamily,
} as const;
export type WeightName = keyof typeof weight;
