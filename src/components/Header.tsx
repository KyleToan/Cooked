import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius, size, space, type } from '@/theme';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

/** The account button is 22pt inside a 44pt square. */
const ACCOUNT_ICON = 22;

type GreetingProps = {
  /** "Good evening, Alex" or a status line ("5 saved · 2 you can make now"). */
  line: string;
  title: string;
  /** The account button (default) or one secondary pill. */
  right?: ReactNode;
  onAccount?: () => void;
};

/** The top of a main screen: greeting above a `title-xl` title, the account button on the right. */
export function GreetingHeader({ line, title, right, onAccount }: GreetingProps) {
  return (
    <View style={styles.greetingRow}>
      <View style={styles.titles}>
        <Text variant="greeting" color="inkMuted">
          {line}
        </Text>
        <Text variant="titleXl" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right ??
        (onAccount ? (
          <Tap accessibilityRole="button" accessibilityLabel="Account and household" onPress={onAccount} style={styles.account}>
            <Icon name="account" size={ACCOUNT_ICON} />
          </Tap>
        ) : null)}
    </View>
  );
}

type PushedProps = {
  title: string;
  onBack: () => void;
  /** "Back to home". */
  backLabel?: string;
  /** A text action at the end of the title line (Rename). */
  right?: ReactNode;
  /** A line under the title (sync status, a description). */
  below?: ReactNode;
};

/** A pushed screen's header: the back arrow and a `title-lg` title on one line. */
export function PushedHeader({ title, onBack, backLabel = 'Back', right, below }: PushedProps) {
  return (
    <View style={styles.pushed}>
      <View style={styles.pushedRow}>
        <BackButton onPress={onBack} label={backLabel} />
        <Text variant="titleLg" accessibilityRole="header" style={styles.pushedTitle}>
          {title}
        </Text>
        {right ? <View style={styles.pushedRight}>{right}</View> : null}
      </View>
      {below}
    </View>
  );
}

export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back}>
      <Icon name="back" />
    </Tap>
  );
}

/** A section heading with an optional count beside it and a link or control on the right. */
export function SectionHeader({
  title,
  meta,
  icon,
  right,
}: {
  title: string;
  meta?: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLeft}>
        {icon}
        <Text variant="sectionTitle" accessibilityRole="header" style={styles.shrink}>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" color="inkMuted">
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.s3 },
  // Takes the room left by the account button, so a long title or large text wraps instead of clipping.
  titles: { gap: space.s1, flex: 1 },
  account: {
    width: size.targetMin,
    height: size.targetMin,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushed: { gap: space.s1 },
  // Top-aligned so a title that wraps at large text keeps the arrow beside its first line.
  pushedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s1, marginLeft: -space.s3 },
  // Centers a one-line title on the 44pt back button: (44 - 36) / 2.
  pushedTitle: { flex: 1, paddingTop: (size.targetMin - type.titleLg.lineHeight) / 2 },
  back: { width: size.targetMin, height: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s3 },
  pushedRight: { minHeight: size.targetMin, justifyContent: 'center' },
  sectionLeft: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.s2, flexShrink: 1 },
  shrink: { flexShrink: 1 },
});
