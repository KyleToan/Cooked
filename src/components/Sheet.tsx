import { useEffect, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, size, space } from '@/theme';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

const SCRIM = 0.32;
const GRABBER_W = 40;
const GRABBER_H = 5;
const SHEET_RADIUS = space.s6;

type Props = {
  children: ReactNode;
  onClose: () => void;
  /** `title-lg` on the left. */
  title?: string;
  /** What happened or what to do, under the title. */
  subtitle?: string;
  /** The grey close circle on the right. Confirm sheets leave it out. */
  showClose?: boolean;
  /** Render inside a Modal (a sheet over a screen). Route sheets like Import render inline. */
  visible?: boolean;
  inline?: boolean;
  accessibilityLabel?: string;
};

/** A panel that slides up over a 32% ink scrim. Tapping the scrim closes it. */
export function Sheet({ children, onClose, title, subtitle, showClose = true, visible = true, inline, accessibilityLabel }: Props) {
  const content = (
    <SheetBody
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {children}
    </SheetBody>
  );
  if (inline) return content;
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {content}
    </Modal>
  );
}

function SheetBody({ children, onClose, title, subtitle, showClose, accessibilityLabel }: Omit<Props, 'visible' | 'inline'>) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      rise.setValue(1);
      return;
    }
    Animated.timing(rise, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduced, rise]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: rise }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.scrim} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[styles.panel, { paddingBottom: Math.max(space.s6 + space.s2, insets.bottom + space.s3), transform: [{ translateY }] }]}
        >
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.title}>
                <Text variant="titleLg" accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="button" weight="regular" color="inkMuted">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {showClose ? <CloseButton onPress={onClose} /> : null}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The cross in a 44pt hit area, as the Import prototype draws it. */
export function CloseButton({ onPress, label = 'Close' }: { onPress: () => void; label?: string }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.closeHit}>
      <Icon name="close" size={size.iconSm + 2} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.ink, opacity: SCRIM },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    paddingTop: space.s2 + 2,
    paddingHorizontal: space.section,
    gap: space.s4,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    backgroundColor: color.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_W,
    height: GRABBER_H,
    borderRadius: GRABBER_H,
    backgroundColor: color.checkBorder,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  title: { flex: 1, gap: space.s1 + 2 },
  closeHit: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -space.s1,
    marginTop: -space.s1,
  },
});
