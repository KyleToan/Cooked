import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius, size, space } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icon-data';
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
  accessibilityLabel?: string;
};

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
  accessibilityLabel,
}: Props) {
  const primary = variant === 'primary';
  const bottom = height === 'bottom';
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pill,
        { minHeight: HEIGHT[height] },
        fill && styles.fill,
        bottom && styles.wide,
        { backgroundColor: primary && !disabled ? color.sage : color.surfaceSunken },
        height === 'header' && styles.compact,
      ]}
    >
      {icon ? <Icon name={icon} size={size.iconSm} color={primary ? 'ink' : 'sageInk'} /> : null}
      <Text
        variant={bottom ? 'body' : 'button'}
        weight={primary || bottom ? 'semibold' : 'medium'}
        color={disabled ? 'inkSubtle' : 'ink'}
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
