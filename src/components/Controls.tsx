import { forwardRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, shadow, size, space, type } from '@/theme';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

/* ---------- Segmented switch (Link / Text, Email / Phone) ---------- */

export type Option<T extends string> = { value: T; label: string };

/** A 48pt grey track; the picked side is a white 44pt pill. */
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
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text variant="button" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/* ---------- On / off switch ---------- */

const SWITCH_W = 51;
const SWITCH_H = 31;
const KNOB = 27;

/** iOS-sized switch inside a 44pt tap area. On: `sage-ink`. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Tap
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      drawn={SWITCH_H}
      style={styles.switchHit}
    >
      <View style={[styles.switchTrack, { backgroundColor: value ? color.sageInk : color.checkBorder }]}>
        <View style={[styles.knob, { left: value ? SWITCH_W - KNOB - 2 : 2 }]} />
      </View>
    </Tap>
  );
}

/* ---------- Filter pills ---------- */

/** Sideways-scrolling pills that bleed to the screen edge. Picked: `sage`. */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.filters}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={styles.filterHit}
          >
            <View style={[styles.filter, { backgroundColor: on ? color.sage : color.surfaceSunken }]}>
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
function Minus() {
  return <View style={styles.minus} />;
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
  return (
    <View style={styles.stepper}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={decLabel}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
      >
        <Minus />
      </Tap>
      <Text variant="button" weight="semibold" style={styles.stepValue} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Tap accessibilityRole="button" accessibilityLabel={incLabel} onPress={() => onChange(value + 1)} style={styles.stepBtn}>
        <Icon name="add" size={STEP_ICON} color="sageInk" />
      </Tap>
    </View>
  );
}

const STEP_ICON = 14;

/* ---------- Undo bar ---------- */

/** Floats 12pt above the island (or above the bottom edge on screens without it). */
export function UndoBar({ text, onUndo, island = true }: { text: string; onUndo: () => void; island?: boolean }) {
  const insets = useSafeAreaInsets();
  const edge = Math.max(space.s6, insets.bottom + space.s2);
  const bottom = island ? edge + size.islandHeight + space.s3 : edge;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.undo, { bottom }]}>
      <Text variant="button" numberOfLines={1} style={styles.undoText}>
        {text}
      </Text>
      <Tap accessibilityRole="button" accessibilityLabel={`Undo: ${text}`} onPress={onUndo} style={styles.undoBtn}>
        <Text variant="button" weight="semibold" color="sageInk">
          Undo
        </Text>
      </Tap>
    </View>
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
  const [focused, setFocused] = useState(false);
  const borderColor = error ? color.errorInk : focused ? color.sageInk : color.line;
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
          placeholderTextColor={color.inkSubtle}
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

/** The 24pt To Buy checkbox inside a 44pt hit area. Checked: `sage-ink` fill with a white check. */
export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkHit}
    >
      <View style={[styles.box, checked ? styles.boxOn : styles.boxOff]}>
        {checked ? <Icon name="check" size={CHECK_ICON} color="onInk" /> : null}
      </View>
    </Tap>
  );
}

/** The dashed box with a plus that starts an add row. */
export function AddBox() {
  return (
    <View style={styles.addBox}>
      <Icon name="add" size={ADD_ICON} color="sageInk" />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: size.controlHeight,
    padding: 2,
    flexDirection: 'row',
    gap: space.s1,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentOn: { backgroundColor: color.surface, ...shadow.card },
  switchHit: { minWidth: size.targetMin, minHeight: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  switchTrack: { width: SWITCH_W, height: SWITCH_H, borderRadius: SWITCH_H / 2 },
  knob: {
    position: 'absolute',
    top: 2,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  bleed: { marginHorizontal: -space.s5, flexGrow: 0 },
  filters: { paddingHorizontal: space.s5, gap: space.s2 },
  filterHit: { height: size.targetMin, justifyContent: 'center' },
  filter: {
    height: size.targetMin - space.s2,
    paddingHorizontal: space.s3 + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { width: 11, height: 2, borderRadius: 1, backgroundColor: color.sageInk },
  stepper: {
    height: size.targetMin,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  stepBtn: { width: size.targetMin, height: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: BOX, textAlign: 'center' },
  undo: {
    position: 'absolute',
    left: space.s5,
    right: space.s5,
    height: size.controlHeight + space.s1,
    paddingLeft: space.s4 + 2,
    paddingRight: space.s1 + 2,
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
  undoBtn: { height: size.targetMin, paddingHorizontal: space.s3 + 2, justifyContent: 'center' },
  fieldWrap: { gap: space.s2 },
  field: {
    height: size.controlHeight + space.s3 - 2,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.control,
  },
  fieldInput: { ...type.body, color: color.ink, padding: 0, outlineWidth: 0 },
  checkHit: {
    width: size.targetMin,
    height: size.targetMin,
    marginLeft: -(space.s2 + 2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: BOX, height: BOX, borderRadius: radius.check, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  boxOff: { borderColor: color.tabMark },
  boxOn: { borderColor: color.sageInk, backgroundColor: color.sageInk },
  addBox: {
    width: BOX,
    height: BOX,
    borderRadius: radius.check,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.checkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
