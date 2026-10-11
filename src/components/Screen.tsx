import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '@/theme';
import { ISLAND_CLEARANCE } from './TabIsland';

type Props = {
  children: ReactNode;
  /** Leave room at the bottom for the tab island. */
  island?: boolean;
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

/**
 * The ground of every screen: white, a 20pt gutter, 24pt between sections,
 * and room for the island or a sticky bottom button.
 */
export function Screen({ children, island, footer, overlay, gap = space.section, top = 'pushed', scrollRef }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = island ? ISLAND_CLEARANCE + insets.bottom : footer ? space.section : space.section * 2 + insets.bottom;
  return (
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
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.s6) }]}>{footer}</View>
      ) : null}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  footer: {
    paddingTop: space.s4,
    paddingHorizontal: space.s5,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.line,
    gap: space.s1,
  },
});
