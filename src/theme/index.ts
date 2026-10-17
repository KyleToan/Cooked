// The Cooked theme. Every color, font, size, space, radius and shadow in the
// app comes from here. Values are generated from design/system/tokens.json;
// see scripts/build-tokens.mjs.

import { createContext, useContext } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';

import { font, palette, type as typeStyles, type Palette } from './tokens';

export { palette, type, space, radius, size, shadow } from './tokens';
export type { ColorName, Palette, TypeName } from './tokens';

/**
 * Pins the palette for everything inside it, whatever the system appearance:
 * the camera screens are always dark glass and white marks over the feed, so
 * they wrap themselves in `<FixedScheme value="light">`.
 */
export const FixedScheme = createContext<'light' | 'dark' | null>(null);

function useScheme(): 'light' | 'dark' {
  const fixed = useContext(FixedScheme);
  const system = useColorScheme();
  return fixed ?? (system === 'dark' ? 'dark' : 'light');
}

/** The palette for the system appearance (Settings > Display & Brightness). There is no in-app toggle. */
export function useColors(): Palette {
  return palette[useScheme()];
}

/**
 * A StyleSheet that uses colors: built once per palette, and the returned hook
 * picks the one for the system appearance. Use it in place of StyleSheet.create
 * whenever a style names a color.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(build: (color: Palette) => T): () => T {
  const sheets = { light: StyleSheet.create(build(palette.light)), dark: StyleSheet.create(build(palette.dark)) };
  return function useStyles() {
    return sheets[useScheme()];
  };
}
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
