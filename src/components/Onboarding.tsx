import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, size, space } from '@/theme';
import { BackButton } from './Header';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

/** Onboarding screens use a 24pt gutter: one thing per screen. */
export const ONB_GUTTER = space.section;

type Props = {
  /** The back arrow, or a close cross on Log in or sign up. */
  onBack?: () => void;
  backIcon?: 'back' | 'close';
  title?: string;
  sub?: string;
  children?: ReactNode;
  /** Pinned to the bottom: the main button and a link under it. */
  bottom?: ReactNode;
  /** Push the content down a little when there's no back button (Ready). */
  topSpace?: number;
};

/** One onboarding step: back, a `title-lg` question, a line under it, the content and the bottom buttons. */
export function OnbScreen({ onBack, backIcon = 'back', title, sub, children, bottom, topSpace = 0 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.s1 + topSpace }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack ? (
          backIcon === 'close' ? (
            <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={onBack} style={styles.close}>
              <Icon name="close" />
            </Tap>
          ) : (
            <View style={styles.back}>
              <BackButton onPress={onBack} />
            </View>
          )
        ) : null}
        {title ? (
          <View style={styles.head}>
            <Text variant="titleLg" accessibilityRole="header">
              {title}
            </Text>
            {sub ? (
              <Text variant="button" weight="regular" color="inkMuted">
                {sub}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {bottom ? <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.s4) + space.s3 }]}>{bottom}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: ONB_GUTTER, paddingBottom: space.section, gap: space.s5 },
  back: { marginLeft: -space.s3, alignSelf: 'flex-start' },
  close: { width: size.targetMin, height: size.targetMin, justifyContent: 'center' },
  head: { gap: space.s2 },
  bottom: { paddingHorizontal: ONB_GUTTER, paddingTop: space.s3, gap: space.s3 },
});

export type Choice<T extends string> = { id: T; title: string; sub: string };

const RADIO = 22;

/** Radio cards for an onboarding question: the picked card is beige with a sage-ink ring. */
export function ChoiceCards<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const cards = useCardStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={cards.choices}>
      {choices.map((c) => {
        const on = c.id === value;
        return (
          <Tap
            key={c.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(c.id)}
            style={[cards.choice, on ? cards.on : cards.off]}
          >
            <View style={cards.text}>
              <Text weight="semibold">{c.title}</Text>
              <Text variant="caption" color="inkMuted">
                {c.sub}
              </Text>
            </View>
            <View style={[cards.radio, on ? cards.radioOn : cards.radioOff]} />
          </Tap>
        );
      })}
    </View>
  );
}

const useCardStyles = makeStyles((color) => ({
  choices: { gap: space.s3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.roomy, padding: space.s4, borderRadius: radius.field },
  on: { backgroundColor: color.beige, borderWidth: 1.5, borderColor: color.sageInk },
  off: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  text: { flex: 1, gap: 3 },
  radio: { width: RADIO, height: RADIO, flexShrink: 0, borderRadius: radius.pill },
  radioOn: { borderWidth: 7, borderColor: color.sageInk },
  radioOff: { borderWidth: 1.5, borderColor: color.controlLine },
}));
