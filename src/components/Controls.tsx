import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  ScrollView,
  Switch as RNSwitch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/hooks/haptics';
import { makeStyles, useColors, radius, shadow, size, space, type } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Tap } from './Tap';
import { Text } from './Text';

/** Critically damped: settles in about 300ms with no overshoot. */
const SPRING = { duration: 300, dampingRatio: 1 } as const;

const ROW_LAYOUT = LinearTransition.springify().duration(SPRING.duration).dampingRatio(SPRING.dampingRatio);

/**
 * Put on each list row (`layout={useRowLayout()}`) so rows slide on the same spring when one opens,
 * moves or is added. Off under Reduce Motion: Reanimated 4.5's own skip leaves rows at their old
 * frames, so an opened row draws over the next one and its controls can't be tapped.
 */
export function useRowLayout() {
  return useReducedMotion() ? undefined : ROW_LAYOUT;
}
/** The part of a row that opens in place fades in. */
export const ROW_OPEN = FadeIn.duration(200);

/* ---------- Segmented switch (Link / Text, Email / Phone) ---------- */

export type Option<T extends string> = { value: T; label: string };

const TRACK_PAD = 2;
const SEG_GAP = space.s1;

/** A 48pt grey track; the picked side is a white pill that slides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const count = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width ? (width - TRACK_PAD * 2 - SEG_GAP * (count - 1)) / count : 0;
  const x = useSharedValue(0);
  const laidOut = useRef(0);

  useEffect(() => {
    const to = index * (segW + SEG_GAP);
    if (reduced || laidOut.current !== segW) {
      // First layout, a resize or Reduce Motion: place the pill without moving it.
      laidOut.current = segW;
      x.set(to);
    } else {
      x.set(withSpring(to, SPRING));
    }
  }, [index, segW, reduced, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segW > 0 ? <Animated.View pointerEvents="none" style={[styles.segmentPill, { width: segW }, pill]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptics.select();
              onChange(o.value);
            }}
            style={styles.segment}
          >
            <Text variant="button" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'} style={styles.center}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/* ---------- On / off switch ---------- */

/** The system switch inside a 44pt tap area, so it gets the platform's motion and haptics. On: `sage-ink`. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  const color = useColors();
  const styles = useStyles();
  return (
    <Tap
      accessible={false}
      onPress={() => {
        haptics.select();
        onChange(!value);
      }}
      style={styles.switchHit}
    >
      <RNSwitch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: color.sageInk, false: color.checkBorder }}
        ios_backgroundColor={color.checkBorder}
        thumbColor={color.surface}
      />
    </Tap>
  );
}

/* ---------- Filter pills ---------- */

/** Sideways-scrolling pills that bleed to the screen edge. Picked: white with a `sage-ink` outline, so the screen keeps one sage fill. */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  action,
}: {
  options: Option<T>[];
  /** null: none picked. Tapping the picked pill again turns it off. */
  value: T | null;
  onChange: (value: T | null) => void;
  /** A button at the start of the row (Recipes' Import), the same size as the pills. */
  action?: { label: string; icon: IconName; onPress: () => void };
}) {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.filters}>
      {action ? (
        <Tap accessibilityRole="button" onPress={action.onPress} style={styles.filterHit}>
          <View style={[styles.filter, styles.filterOff, styles.filterAction]}>
            <Icon name={action.icon} size={16} color="sageInk" />
            <Text variant="link" weight="medium" color="ink">
              {action.label}
            </Text>
          </View>
        </Tap>
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.select();
              onChange(on ? null : o.value);
            }}
            style={styles.filterHit}
          >
            <View style={[styles.filter, on ? styles.filterOn : styles.filterOff]}>
              <Text variant="link" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'}>
                {o.label}
              </Text>
            </View>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

/* ---------- Stepper ---------- */

/** A minus sign drawn as a bar: the icon set has a plus but no minus. */
function Minus({ off }: { off?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.minus, off && styles.minusOff]} />;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  decLabel = 'Use one',
  incLabel = 'Add one',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  decLabel?: string;
  incLabel?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stepper}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={decLabel}
        disabled={value <= min}
        onPress={() => {
          haptics.select();
          onChange(Math.max(min, value - 1));
        }}
        style={styles.stepBtn}
      >
        <Minus off={value <= min} />
      </Tap>
      <Text
        variant="button"
        weight="semibold"
        style={styles.stepValue}
        maxFontSizeMultiplier={STEP_MAX_SCALE}
        accessibilityLiveRegion="polite"
      >
        {value}
      </Text>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={incLabel}
        onPress={() => {
          haptics.select();
          onChange(value + 1);
        }}
        style={styles.stepBtn}
      >
        <Icon name="add" size={STEP_ICON} color="sageInk" />
      </Tap>
    </View>
  );
}

const STEP_ICON = 14;
/** The count sits between two fixed 44pt buttons, so it grows only so far with Dynamic Type. */
const STEP_MAX_SCALE = 1.5;

/* ---------- Undo bar ---------- */

const UNDO_RISE = 12;
const UNDO_FADE = 200;

/** Rises 12pt and fades in on a critically damped spring. */
const undoIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: UNDO_RISE }] },
    animations: {
      opacity: withTiming(1, { duration: UNDO_FADE }),
      transform: [{ translateY: withSpring(0, SPRING) }],
    },
  };
};

/** The same path in reverse. */
const undoOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: UNDO_FADE }),
      transform: [{ translateY: withSpring(UNDO_RISE, SPRING) }],
    },
  };
};

/** With Reduce Motion the bar only fades. */
const undoFadeIn = FadeIn.duration(UNDO_FADE).reduceMotion(ReduceMotion.Never);
const undoFadeOut = FadeOut.duration(UNDO_FADE).reduceMotion(ReduceMotion.Never);

/** Rubber band constant and deceleration rate (UIScrollView's), as in the sheet. */
const RUBBER = 0.55;
const DECELERATION = 0.998;

/**
 * Floats 12pt above the island (or above the bottom edge on screens without it).
 * With `onDismiss` it can be swiped down and away.
 */
export function UndoBar({
  text,
  onUndo,
  onDismiss,
  island = true,
}: {
  text: string;
  onUndo: () => void;
  onDismiss?: () => void;
  island?: boolean;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const edge = Math.max(space.s6, insets.bottom + space.s2);
  const bottom = island ? edge + size.islandHeight + space.s3 : edge;
  const ty = useSharedValue(0);
  const height = useSharedValue(0);
  const dismiss = () => onDismiss?.();
  const pan = Gesture.Pan()
    .enabled(!!onDismiss)
    .activeOffsetY(10)
    .failOffsetX([-10, 10])
    .onBegin(() => {
      cancelAnimation(ty);
    })
    .onUpdate((e) => {
      const y = e.translationY;
      // 1:1 downwards; upwards it stretches less the further it goes.
      ty.set(y >= 0 ? y : -(1 - 1 / ((-y * RUBBER) / height.get() + 1)) * height.get());
    })
    .onFinalize((e, activated) => {
      const h = height.get();
      if (!h) return;
      const v = activated ? e.velocityY : 0;
      const projected = ty.get() + ((v / 1000) * DECELERATION) / (1 - DECELERATION);
      if (projected > h / 2) {
        ty.set(
          withSpring(h + bottom, { ...SPRING, velocity: v }, (done) => {
            if (done) scheduleOnRN(dismiss);
          }),
        );
      } else {
        ty.set(withSpring(0, { ...SPRING, velocity: v }));
      }
    });
  const drag = useAnimatedStyle(() => ({ transform: [{ translateY: ty.get() }] }));
  // iOS ignores live regions, so say it out loud; Android's live region already does.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(`${text}. Undo available.`);
  }, [text]);
  // The outer view enters and leaves; the inner one follows the finger.
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={reduced ? undoFadeIn : undoIn}
      exiting={reduced ? undoFadeOut : undoOut}
      style={[styles.undoWrap, { bottom }]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.undo, drag]} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
          <Text variant="button" numberOfLines={2} style={styles.undoText}>
            {text}
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel={`Undo: ${text}`} onPress={onUndo} style={styles.undoBtn}>
            <Text variant="button" weight="semibold" color="sageInk">
              Undo
            </Text>
          </Tap>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

/* ---------- Field ---------- */

type FieldProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  label: string;
  error?: string;
};

/** A 58pt outlined field with a small label above the value. Focus: `sage-ink`. Error: `error-ink`. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, style, onFocus, onBlur, ...rest }, ref) {
  const color = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? color.errorInk : focused ? color.sageInk : color.controlLine;
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, { borderColor, borderWidth: error || focused ? 1.5 : 1 }, style]}>
        <Text variant="micro" color="inkMuted" weight="regular">
          {label}
        </Text>
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          placeholderTextColor={color.inkMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.fieldInput}
        />
      </View>
      {error ? <ErrorLine text={error} /> : null}
    </View>
  );
});

/** A one-line error in `error-ink`, announced to screen readers. */
export function ErrorLine({ text }: { text: string }) {
  return (
    <Text variant="link" color="errorInk" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {text}
    </Text>
  );
}

/* ---------- Checkbox ---------- */

const BOX = 24;
const CHECK_ICON = 13;
const ADD_ICON = 12;

/** Checks pop in on a quick critically damped spring. */
const CHECK_SPRING = { duration: 250, dampingRatio: 1 } as const;
const CHECK_FROM = 0.6;

/**
 * The 24pt To Buy checkbox inside a 44pt hit area. Checked: `sage-ink` fill with a white check. Pass just the item name as `label`.
 * Without `onPress` it only draws the box, for a row that is the checkbox itself.
 */
export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress?: () => void; label?: string }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const on = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    on.set(reduced ? withTiming(checked ? 1 : 0, { duration: UNDO_FADE }) : withSpring(checked ? 1 : 0, CHECK_SPRING));
  }, [checked, reduced, on]);
  const mark = useAnimatedStyle(() => ({
    opacity: on.get(),
    transform: [{ scale: reduced ? 1 : CHECK_FROM + (1 - CHECK_FROM) * on.get() }],
  }));
  // The fill fades over the outline on the same value, so box and tick move together.
  const fill = useAnimatedStyle(() => ({ opacity: on.get() }));
  const box = (
    <View style={styles.box}>
      <Animated.View style={[styles.boxFill, fill]} />
      <Animated.View style={mark}>
        <Icon name="check" size={CHECK_ICON} color="onInk" />
      </Animated.View>
    </View>
  );
  if (!onPress) return <View style={styles.checkHit}>{box}</View>;
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={styles.checkHit}
    >
      {box}
    </Tap>
  );
}

/** The dashed box with a plus that starts an add row. */
export function AddBox() {
  const styles = useStyles();
  return (
    <View style={styles.addBox}>
      <Icon name="add" size={ADD_ICON} color="sageInk" />
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  track: {
    minHeight: size.controlHeight,
    padding: TRACK_PAD,
    flexDirection: 'row',
    gap: SEG_GAP,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  segment: {
    flex: 1,
    minHeight: size.controlHeight - TRACK_PAD * 2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentPill: {
    position: 'absolute',
    top: TRACK_PAD,
    bottom: TRACK_PAD,
    left: TRACK_PAD,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  center: { textAlign: 'center' },
  switchHit: { minWidth: size.targetMin, minHeight: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -space.s5, flexGrow: 0 },
  filters: { paddingHorizontal: space.s5, gap: space.s2 },
  filterHit: { minHeight: size.targetMin, justifyContent: 'center' },
  filter: {
    minHeight: size.targetMin - space.s2,
    paddingVertical: space.tight,
    paddingHorizontal: space.roomy,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { backgroundColor: color.surface, borderColor: color.sageInk },
  filterOff: { backgroundColor: color.surfaceSunken, borderColor: color.surfaceSunken },
  filterAction: { flexDirection: 'row', gap: space.s1 },
  minus: { width: 11, height: 2, borderRadius: 1, backgroundColor: color.sageInk },
  minusOff: { backgroundColor: color.inkSubtle },
  stepper: {
    minHeight: size.targetMin,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  stepBtn: { width: size.targetMin, height: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: BOX, textAlign: 'center' },
  undoWrap: { position: 'absolute', left: space.s5, right: space.s5 },
  undo: {
    minHeight: size.controlHeight + space.s1,
    paddingVertical: space.s1,
    paddingLeft: space.s4 + 2,
    paddingRight: space.tight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    ...shadow.island,
  },
  undoText: { flexShrink: 1 },
  undoBtn: { minHeight: size.targetMin, paddingHorizontal: space.roomy, justifyContent: 'center' },
  fieldWrap: { gap: space.s2 },
  field: {
    minHeight: size.controlHeight + space.s3 - 2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.control,
  },
  fieldInput: { ...type.body, color: color.ink, padding: 0, outlineWidth: 0 },
  checkHit: {
    width: size.targetMin,
    height: size.targetMin,
    marginLeft: -(space.cozy),
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: BOX, height: BOX, borderRadius: radius.check, borderWidth: 1.5, borderColor: color.controlLine, alignItems: 'center', justifyContent: 'center' },
  /** Covers the 1.5pt outline too. */
  boxFill: { position: 'absolute', top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: radius.check, backgroundColor: color.sageInk },
  addBox: {
    width: BOX,
    height: BOX,
    borderRadius: radius.check,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.controlLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
