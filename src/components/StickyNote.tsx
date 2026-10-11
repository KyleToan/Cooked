import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, shadow, size, space, type, type ColorName } from '@/theme';
import { Tap } from './Tap';
import { Text } from './Text';

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

/** One of the three small kitchen notes on Home: a link to that place's tab. */
export function KitchenNote({ label, count, flag, paper, tilt, onPress, accessibilityLabel }: KitchenNoteProps) {
  return (
    <Tap
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? [label, count, flag].filter(Boolean).join(', ')}
      onPress={onPress}
      style={[styles.small, { backgroundColor: color[paper], transform: [{ rotate: `${tilt}deg` }] }]}
    >
      <Tape width={40} />
      <Text variant="noteTitle" color="noteInk" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      <Text variant="noteBody" color="noteInkSoft">
        {count}
      </Text>
      {flag ? <UseSoonFlag text={flag} /> : null}
    </Tap>
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
      <Text variant="noteTitle" color="noteInk" numberOfLines={1} adjustsFontSizeToFit>
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
};

/** The full-width note: the empty kitchen, Tonight's recipe, the kitchen you're joining. */
export function BigNote({ children, paper = 'cornsilk', tilt = -1, style }: BigNoteProps) {
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
  small: {
    flex: 1,
    height: size.noteHeight,
    paddingTop: space.s3 + 2,
    paddingHorizontal: space.s3,
    paddingBottom: space.s2 + 2,
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
