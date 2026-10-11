import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { size, space } from '@/theme';
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
