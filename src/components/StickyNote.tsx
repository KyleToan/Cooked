import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { color, radius, shadow, size, space, type, type ColorName } from '@/theme';
import { Tap } from './Tap';
import { Text } from './Text';

/** Note titles are handwriting on a small paper: they grow with Dynamic Type, but only a little. */
export const NOTE_TITLE_MAX = 1.3;
/** Critically damped and quick, so the note settles without wobbling. */
const PRESS_SPRING = { duration: 220, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
/** How far a pressed note rises toward you. */
const LIFT = 2;
const LIFT_SCALE = 1.02;

/** Paper color per kitchen place. */
export const PAPER = { fridge: 'cornsilk', pantry: 'papaya', freezer: 'beige' } as const satisfies Record<string, ColorName>;

/** Home's three notes tilt -2.5°, 1.5° and -1°. */
export const NOTE_TILT = { fridge: -2.5, pantry: 1.5, freezer: -1 } as const;

const TAPE_OPACITY = 0.65;
const TAPE_TILT = '-3deg';

function Tape({ width }: { width: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.tape, { width, height: Math.round(width * 0.36), marginLeft: -width / 2, top: -space.s2 - 1 }]}
    />
  );
}

type KitchenNoteProps = {
  label: string;
  count: string;
  /** "2 use soon". At most one per row of notes. */
  flag?: string;
  paper: ColorName;
  tilt: number;
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * One of the three small kitchen notes on Home: a link to that place's tab.
 * While pressed it straightens and lifts off the fridge door a little; with
 * Reduce Motion on it just dims. Notes in a row stretch to the tallest one, so
 * they stay the same height when text grows.
 */
export function KitchenNote({ label, count, flag, paper, tilt, onPress, accessibilityLabel }: KitchenNoteProps) {
  return (
    <LiftingNote
      noteStyle={styles.small}
      areaStyle={styles.pressArea}
      corner={radius.control}
      paper={paper}
      tilt={tilt}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? [label, count, flag].filter(Boolean).join(', ')}
    >
      <Tape width={40} />
      <Text variant="noteTitle" color="noteInk" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={NOTE_TITLE_MAX}>
        {label}
      </Text>
      <Text variant="noteBody" color="noteInkSoft">
        {count}
      </Text>
      {flag ? <UseSoonFlag text={flag} /> : null}
    </LiftingNote>
  );
}

type LiftingNoteProps = {
  children: ReactNode;
  noteStyle: StyleProp<ViewStyle>;
  /** The pressable area around the note (a row's share of the width). */
  areaStyle?: StyleProp<ViewStyle>;
  /** The note's bottom right corner, so the lifted shadow matches its shape. */
  corner: number;
  paper: ColorName;
  tilt: number;
  onPress: () => void;
  accessibilityRole: 'link' | 'button';
  accessibilityLabel?: string;
};

/** A note you can press: while pressed it straightens and lifts a little; with Reduce Motion on it just dims. */
function LiftingNote({ children, noteStyle, areaStyle, corner, paper, tilt, onPress, accessibilityRole, accessibilityLabel }: LiftingNoteProps) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const lifted = useAnimatedStyle(() => ({
    transform: [
      { translateY: -LIFT * press.value },
      { scale: interpolate(press.value, [0, 1], [1, LIFT_SCALE]) },
      { rotate: `${tilt * (1 - press.value)}deg` },
    ],
  }));
  const raisedShadow = useAnimatedStyle(() => ({ opacity: press.value }));
  const a11y = { accessibilityRole, accessibilityLabel };

  if (reduced) {
    return (
      <Tap {...a11y} onPress={onPress} style={[noteStyle, { backgroundColor: color[paper], transform: [{ rotate: `${tilt}deg` }] }]}>
        {children}
      </Tap>
    );
  }
  return (
    <Pressable
      {...a11y}
      onPress={onPress}
      onPressIn={() => {
        press.set(withSpring(1, PRESS_SPRING));
      }}
      onPressOut={() => {
        press.set(withSpring(0, PRESS_SPRING));
      }}
      style={areaStyle}
    >
      <Animated.View style={[noteStyle, { backgroundColor: color[paper] }, lifted]}>
        {/* A deeper shadow under the paper that fades in as the note lifts. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.raised, { backgroundColor: color[paper], borderBottomRightRadius: corner }, raisedShadow]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** A note that isn't a link: Welcome's notes and what was put away on Ready. */
export function PaperNote({
  label,
  body,
  flag,
  paper,
  tilt,
  style,
}: {
  label: string;
  body?: string;
  flag?: string;
  paper: ColorName;
  tilt: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.small, { backgroundColor: color[paper], transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Tape width={40} />
      <Text variant="noteTitle" color="noteInk" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={NOTE_TITLE_MAX}>
        {label}
      </Text>
      {body ? (
        <Text variant="noteBody" color="noteInkSoft">
          {body}
        </Text>
      ) : null}
      {flag ? <UseSoonFlag text={flag} /> : null}
    </View>
  );
}

/** "2 use soon" in bronze handwriting with a bronze underline. */
export function UseSoonFlag({ text }: { text: string }) {
  return (
    <View style={styles.flag}>
      <Text variant="noteBody" color="bronzeInk" style={styles.flagText}>
        {text}
      </Text>
    </View>
  );
}

type BigNoteProps = {
  children: ReactNode;
  paper?: ColorName;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  /** Makes the whole note one link (Tonight's recipe), with the kitchen notes' press-lift. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: 'link' | 'button';
};

/** The full-width note: the empty kitchen, Tonight's recipe, the kitchen you're joining. */
export function BigNote({ children, paper = 'cornsilk', tilt = -1, style, onPress, accessibilityLabel, accessibilityRole = 'link' }: BigNoteProps) {
  if (onPress) {
    return (
      <LiftingNote
        noteStyle={[styles.big, style]}
        corner={radius.field}
        paper={paper}
        tilt={tilt}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
      >
        <Tape width={52} />
        {children}
      </LiftingNote>
    );
  }
  return (
    <View style={[styles.big, { backgroundColor: color[paper], transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Tape width={52} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tape: {
    position: 'absolute',
    left: '50%',
    backgroundColor: color.surface,
    opacity: TAPE_OPACITY,
    transform: [{ rotate: TAPE_TILT }],
  },
  pressArea: { flex: 1 },
  raised: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.note,
    ...shadow.island,
  },
  small: {
    flex: 1,
    // A minimum, not a fixed height: at large text sizes the note grows instead of clipping.
    minHeight: size.noteHeight,
    paddingTop: space.roomy,
    paddingHorizontal: space.s3,
    paddingBottom: space.cozy,
    gap: space.s2,
    borderRadius: radius.note,
    borderBottomRightRadius: radius.control,
    ...shadow.note,
  },
  big: {
    marginHorizontal: 2,
    marginTop: space.s2,
    paddingTop: space.s5,
    paddingHorizontal: space.s4 + 2,
    paddingBottom: space.s4 + 2,
    gap: space.s2,
    borderRadius: radius.note,
    borderBottomRightRadius: radius.field,
    ...shadow.note,
  },
  flag: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: color.bronze,
  },
  flagText: { fontFamily: type.noteTitle.fontFamily },
});
