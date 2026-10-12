import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { color, radius, size, space, type } from "@/theme";
import { Icon } from "./Icon";
import { Tap } from "./Tap";
import { Text } from "./Text";

/** The account and Scan buttons are 22pt icons inside 44pt circles. */
const ACCOUNT_ICON = 22;

type GreetingProps = {
  /** A status line above the title ("5 saved · 2 you can make now"). */
  line?: string;
  title: string;
  /** The account button (default) or one secondary pill. */
  right?: ReactNode;
  onAccount?: () => void;
};

/** The top of the Kitchen and Recipes tabs: a status line above a `title-xl` title, the account button on the right. */
export function GreetingHeader({
  line,
  title,
  right,
  onAccount,
}: GreetingProps) {
  return (
    <View style={styles.greetingRow}>
      <View style={styles.titles}>
        {line ? (
          <Text variant="greeting" color="inkMuted">
            {line}
          </Text>
        ) : null}
        <Text variant="titleXl" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right ??
        (onAccount ? (
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Account and household"
            onPress={onAccount}
            style={styles.account}
          >
            <Icon name="account" size={ACCOUNT_ICON} />
          </Tap>
        ) : null)}
    </View>
  );
}

type TopBarProps = {
  title: string;
  /** The greeting under the title ("Good morning, Alex"). */
  line?: string;
  onScan: () => void;
  onAccount: () => void;
};

/** Home's top bar: a round Scan button on the left, the title and greeting centred, the account button on the right. */
export function TopBar({ title, line, onScan, onAccount }: TopBarProps) {
  return (
    <View style={styles.topRow}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Scan a receipt"
        accessibilityHint="Opens the camera"
        onPress={onScan}
        style={styles.scan}
      >
        <Icon name="scan" size={ACCOUNT_ICON} color="sageInk" />
      </Tap>
      <View style={styles.topTitles}>
        <Text
          variant="titleXl"
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.center}
        >
          {title}
        </Text>
        {line ? (
          <Text
            variant="greeting"
            color="inkMuted"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.center}
          >
            {line}
          </Text>
        ) : null}
      </View>
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Account and household"
        onPress={onAccount}
        style={styles.account}
      >
        <Icon name="account" size={ACCOUNT_ICON} />
      </Tap>
    </View>
  );
}

type PushedProps = {
  title: string;
  /** Left out on a tab page (Your Kitchen), which has no back arrow. */
  onBack?: () => void;
  /** "Back to home". */
  backLabel?: string;
  /** A text action at the end of the title line (Rename). */
  right?: ReactNode;
  /** A line under the title (sync status, a description). */
  below?: ReactNode;
};

/** A pushed screen's header: the back arrow and a `title-lg` title on one line. */
export function PushedHeader({
  title,
  onBack,
  backLabel = "Back",
  right,
  below,
}: PushedProps) {
  return (
    <View style={styles.pushed}>
      <View style={[styles.pushedRow, !onBack && styles.noBack]}>
        {onBack ? <BackButton onPress={onBack} label={backLabel} /> : null}
        <Text
          variant="titleLg"
          accessibilityRole="header"
          style={styles.pushedTitle}
        >
          {title}
        </Text>
        {right ? <View style={styles.pushedRight}>{right}</View> : null}
      </View>
      {below}
    </View>
  );
}

export function BackButton({
  onPress,
  label = "Back",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.back}
    >
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
        <Text
          variant="sectionTitle"
          accessibilityRole="header"
          style={styles.shrink}
        >
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
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.s3,
  },
  // Takes the room left by the account button, so a long title or large text wraps instead of clipping.
  titles: { gap: space.s1, flex: 1 },
  account: {
    width: size.targetMin,
    height: size.targetMin,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  // Top-aligned so the buttons sit beside the title line (46pt), not halfway down the greeting.
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: space.s3 },
  // Both side buttons are 44pt wide, so a flex title between them sits in the true centre.
  topTitles: { flex: 1, gap: space.s1 },
  center: { textAlign: "center" },
  scan: {
    width: size.targetMin,
    height: size.targetMin,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  pushed: { gap: space.s1 },
  // Top-aligned so a title that wraps at large text keeps the arrow beside its first line.
  pushedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.s1,
    marginLeft: -space.s3,
  },
  noBack: { marginLeft: 0 },
  // Centers a one-line title on the 44pt back button: (44 - 36) / 2.
  pushedTitle: {
    flex: 1,
    paddingTop: (size.targetMin - type.titleLg.lineHeight) / 2,
  },
  back: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
  },
  pushedRight: { minHeight: size.targetMin, justifyContent: "center" },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: space.s2,
    flexShrink: 1,
  },
  shrink: { flexShrink: 1 },
});
