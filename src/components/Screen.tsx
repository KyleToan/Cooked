import { useId, type ReactNode, type Ref } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, size, space } from '@/theme';
import { ISLAND_CLEARANCE, islandEdge } from './TabIsland';

type Props = {
  children: ReactNode;
  /** Leave room at the bottom for the tab island. */
  island?: boolean;
  /** True while an undo bar shows: adds the bar's height to the bottom so the last row clears it. */
  raised?: boolean;
  /** A sticky bottom area (the full-width button on Check items and Recipe). */
  footer?: ReactNode;
  /** Something that floats above the content (the undo bar, the island). */
  overlay?: ReactNode;
  /** Gap between sections. 24 by default. */
  gap?: number;
  /** Extra space under the status bar: a main tab sits a little lower than a pushed screen. */
  top?: 'tab' | 'pushed';
  scrollRef?: Ref<ScrollView>;
};

/** How far content fades out before it meets the island, the undo bar or a footer. */
const FADE = 32;
/** The undo bar: its height plus the gap above the island (or the bottom edge). */
const UNDO_ROOM = size.controlHeight + space.s1 + space.s3;

/**
 * The ground of every screen: white, a 20pt gutter, 24pt between sections,
 * and room for the island or a sticky bottom button. Content fades out just
 * above the island, the undo bar and the footer, so rows never look cut in half.
 */
export function Screen({ children, island, raised, footer, overlay, gap = space.section, top = 'pushed', scrollRef }: Props) {
  const insets = useSafeAreaInsets();
  const undo = raised ? UNDO_ROOM : 0;
  const bottom = (island ? ISLAND_CLEARANCE + insets.bottom : footer ? space.section : space.section * 2 + insets.bottom) + undo;
  // On a screen with the island, white covers everything from the island's top edge down, and fades in above it.
  const islandFade = island ? islandEdge(insets.bottom) + size.islandHeight + undo : 0;
  return (
    <View style={styles.root}>
      <View style={styles.root}>
        <ScrollView
          ref={scrollRef}
          style={styles.root}
          contentContainerStyle={{
            paddingTop: insets.top + (top === 'tab' ? space.s3 : space.s1),
            paddingBottom: bottom,
            paddingHorizontal: space.s5,
            gap,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {island ? <EdgeFade solid={islandFade} /> : footer ? <EdgeFade solid={0} /> : null}
      </View>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.s6) }]}>{footer}</View>
      ) : null}
      {overlay}
    </View>
  );
}

/** White fading to clear upwards over `FADE` points, above `solid` points of plain white at the bottom. */
function EdgeFade({ solid }: { solid: number }) {
  const id = `edge${useId().replace(/:/g, '')}`;
  const height = solid + FADE;
  return (
    <View pointerEvents="none" style={[styles.fade, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.surface} stopOpacity={0} />
            <Stop offset={FADE / height} stopColor={color.surface} stopOpacity={1} />
            <Stop offset="1" stopColor={color.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footer: {
    paddingTop: space.s4,
    paddingHorizontal: space.s5,
    backgroundColor: color.surface,
    gap: space.s1,
  },
});
