import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColors, radius, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
import { Spinner } from './Loader';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  /** One sage primary per screen; everything else is the grey secondary. */
  variant?: 'primary' | 'secondary';
  icon?: IconName;
  /** 48 on Home (default), 44 in headers and on notes, 52 full width at the bottom of a screen. */
  height?: 'home' | 'header' | 'bottom';
  /** Share its row with the pill beside it. The bottom height always spans the full width. */
  fill?: boolean;
  disabled?: boolean;
  /** Working on it: a spinner takes the icon's place and presses are ignored. */
  busy?: boolean;
  accessibilityLabel?: string;
};

/** Pressed pills sink a little and spring back, critically damped. */
const PRESSED = 0.97;
const SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

const HEIGHT = { home: size.controlHeight, header: size.targetMin, bottom: size.controlHeight + space.s1 };

/** The sage primary and the grey secondary pill. Never black, never bronze. */
export function ActionPill({
  label,
  onPress,
  variant = 'secondary',
  icon,
  height = 'home',
  fill,
  disabled,
  busy,
  accessibilityLabel,
}: Props) {
  const color = useColors();
  const primary = variant === 'primary';
  const bottom = height === 'bottom';
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const ink = disabled ? 'inkSubtle' : 'ink';
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy }}
      onPress={busy ? undefined : onPress}
      onPressIn={() => {
        if (!reduced && !busy) scale.set(withSpring(PRESSED, SPRING));
      }}
      onPressOut={() => scale.set(withSpring(1, SPRING))}
      disabled={disabled || busy}
      style={[
        styles.pill,
        { minHeight: HEIGHT[height] },
        fill && styles.fill,
        bottom && styles.wide,
        { backgroundColor: primary && !disabled ? color.sage : color.surfaceSunken },
        height === 'header' && styles.compact,
        press,
      ]}
    >
      {busy ? (
        <Spinner size={size.iconSm} color={ink} />
      ) : icon ? (
        <Icon name={icon} size={size.iconSm} color={primary ? 'ink' : 'sageInk'} />
      ) : null}
      <Text
        variant={bottom ? 'body' : 'button'}
        weight={primary || bottom ? 'semibold' : 'medium'}
        color={ink}
        style={styles.label}
      >
        {label}
      </Text>
    </Tap>
  );
}

/** Two pills side by side, sharing the row (Scan a receipt + Import recipe). */
export function PillRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
  },
  /** Wraps at the largest text sizes instead of clipping. */
  label: { flexShrink: 1, textAlign: 'center' },
  compact: { paddingHorizontal: space.s4, alignSelf: 'flex-start' },
  fill: { flex: 1 },
  wide: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: space.s3 },
});
