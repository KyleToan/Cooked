import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius, size, space, type ColorName } from '@/theme';
import { ActionPill } from './ActionPill';
import { Chevron } from './Chevron';
import { Switch } from './Controls';
import { Tap } from './Tap';
import { Text } from './Text';
import { TextLink } from './TextLink';

/** A settings row: label (and a one-line description) on the left, the value and a chevron on the right. */
export function SettingsRow({
  label,
  description,
  value,
  onPress,
}: {
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Tap
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[label, value, description].filter(Boolean).join(', ')}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, description ? styles.rowTall : null]}
    >
      <View style={styles.grow}>
        <Text>{label}</Text>
        {description ? (
          <Text variant="caption" color="inkMuted">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="button" color="inkMuted" weight="regular">
          {value}
        </Text>
      ) : null}
      {onPress ? <Chevron direction="right" /> : null}
    </Tap>
  );
}

/** A switch with its title and what it does. A switch with a setting shows it underneath when on. */
export function SwitchRow({
  title,
  description,
  value,
  onChange,
  children,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (on: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.divider}>
      <View style={styles.switchRow}>
        <View style={styles.grow}>
          <Text>{title}</Text>
          <Text variant="caption" color="inkMuted">
            {description}
          </Text>
        </View>
        <Switch value={value} onChange={onChange} label={title} />
      </View>
      {value && children ? <View style={styles.switchExtra}>{children}</View> : null}
    </View>
  );
}

const AVATAR = 40;

/** Initials in a paper-colored circle. Albert Sans, never Caveat. */
export function Avatar({ name, paper = 'papaya', diameter = AVATAR }: { name: string; paper?: ColorName; diameter?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: diameter, height: diameter, backgroundColor: color[paper] }]}
    >
      <Text weight="semibold" color="noteInk">
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** A person in the kitchen: initials, name, what they did, and an optional quiet action. */
export function PersonRow({ name, note, paper, right }: { name: string; note: string; paper: ColorName; right?: ReactNode }) {
  return (
    <View style={styles.person}>
      <Avatar name={name} paper={paper} />
      <View style={styles.grow}>
        <Text>{name}</Text>
        <Text variant="caption" color="inkMuted">
          {note}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** The end of Account: a grey Log out pill, Delete account in `error-ink`, and the app version. */
export function AccountEnding({ onLogOut, onDelete, version }: { onLogOut: () => void; onDelete: () => void; version: string }) {
  return (
    <View style={styles.ending}>
      <ActionPill label="Log out" height="bottom" onPress={onLogOut} />
      <TextLink label="Delete account" color="errorInk" variant="button" align="center" onPress={onDelete} />
      <Text variant="micro" color="inkMuted" weight="regular" style={styles.center}>
        {version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  row: {
    minHeight: size.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  rowTall: { minHeight: size.rowHeight + space.s1, paddingVertical: space.s2 },
  switchRow: { minHeight: size.rowHeight, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s3 },
  switchExtra: { paddingBottom: space.s3 },
  avatar: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  person: {
    minHeight: size.rowHeight + space.s2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  ending: { gap: space.s1 + 2, paddingTop: space.s2 },
  center: { textAlign: 'center' },
});
