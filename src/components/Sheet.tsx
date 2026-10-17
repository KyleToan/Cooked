import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, palette, size, space } from '@/theme';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

const SCRIM = 0.32;
const GRABBER_W = 40;
const GRABBER_H = 5;
const SHEET_RADIUS = space.s6;
/** White that hangs below the screen edge, so pulling the sheet up past rest never shows a gap. */
const OVERDRAG = 120;
/** Rubber band constant (UIScrollView's). */
const RUBBER = 0.55;
/** UIScrollView's normal deceleration rate, for projecting where a flick lands. */
const DECELERATION = 0.998;

/** Spring from Apple's response / damping ratio, with mass 1. */
function spring(response: number, dampingRatio: number) {
  return {
    mass: 1,
    stiffness: ((2 * Math.PI) / response) ** 2,
    damping: (4 * Math.PI * dampingRatio) / response,
    // Reduce Motion is handled here with a cross-fade, so the springs always run.
    reduceMotion: ReduceMotion.Never,
  };
}
/** Opening and closing: critically damped, no overshoot. */
const SLIDE = spring(0.35, 1);
/** Settling back after a drag: Apple's sheet values. */
const SETTLE = spring(0.3, 0.8);
/** Reduce Motion: a short cross-fade instead of the slide. */
const FADE = { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never };

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

/**
 * A panel that slides up over a 32% ink scrim. Drag it down by the grabber or title, tap the
 * scrim, use the close button or Android back to close it: it slides away first, then `onClose` runs.
 */
export function Sheet({ children, onClose, title, subtitle, showClose = true, visible = true, inline, accessibilityLabel }: Props) {
  const styles = useStyles();
  // A modal sheet stays mounted after `visible` turns false until it has slid away.
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  const closeRef = useRef<(() => void) | null>(null);

  const body = (
    <SheetBody
      open={inline ? true : visible}
      inline={inline}
      onClose={onClose}
      onExited={inline ? undefined : () => setShown(false)}
      closeRef={inline ? undefined : closeRef}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {children}
    </SheetBody>
  );
  if (inline) return body;
  return (
    <Modal transparent visible={shown} animationType="none" onRequestClose={() => closeRef.current?.()} statusBarTranslucent>
      {/* Modal content is a separate native root, so gestures need their own root view on Android. */}
      <GestureHandlerRootView style={styles.fill}>
        {body}
      </GestureHandlerRootView>
    </Modal>
  );
}

type BodyProps = Omit<Props, 'visible'> & {
  open: boolean;
  onExited?: () => void;
  /** Filled in by the body, so the Modal's Android back can use the animated close. */
  closeRef?: { current: (() => void) | null };
};

function SheetBody({ children, onClose, title, subtitle, showClose, inline, open, onExited, closeRef, accessibilityLabel }: BodyProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const navigation = useNavigation();

  // Where the panel sits: 0 at rest, its height when fully off screen, negative when pulled up.
  const ty = useSharedValue(reduced ? 0 : Dimensions.get('window').height);
  // Reduce Motion only: the cross-fade.
  const fade = useSharedValue(reduced ? 0 : 1);
  // The panel's visible height, once measured.
  const height = useSharedValue(0);
  // True while sliding away; the reaction below finishes the close when it gets there.
  const exiting = useSharedValue(false);
  const dragStart = useSharedValue(0);

  // A navigation or the parent closing the sheet can't be grabbed back.
  const [locked, setLocked] = useState(false);
  const closed = useRef(false);
  const leaving = useRef(false);
  const onCloseRef = useRef(onClose);
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onCloseRef.current = onClose;
    onExitedRef.current = onExited;
  });

  const closeByUser = useCallback(() => {
    closed.current = true;
    leaving.current = true;
    onCloseRef.current();
  }, []);
  const finish = useRef<() => void>(closeByUser);
  const runFinish = useCallback(() => {
    const f = finish.current;
    finish.current = closeByUser;
    f();
  }, [closeByUser]);

  useAnimatedReaction(
    () => exiting.get() && (reduced ? fade.get() <= 0.001 : height.get() === 0 || ty.get() >= height.get() - 1),
    (done, was) => {
      if (done && !was) {
        exiting.set(false);
        scheduleOnRN(runFinish);
      }
    },
  );

  const animateIn = useCallback(() => {
    exiting.set(false);
    if (reduced) {
      ty.set(0);
      fade.set(withTiming(1, FADE));
    } else {
      ty.set(withSpring(0, SLIDE));
    }
  }, [reduced, exiting, fade, ty]);

  const animateOut = useCallback(
    (then: () => void) => {
      finish.current = then;
      exiting.set(true);
      if (reduced) fade.set(withTiming(0, FADE));
      else ty.set(withSpring(height.get(), SLIDE));
    },
    [reduced, exiting, fade, height, ty],
  );

  /** Scrim, close button, Android back, VoiceOver escape. */
  const requestClose = useCallback(() => {
    if (exiting.get() || closed.current) return;
    animateOut(closeByUser);
  }, [animateOut, closeByUser, exiting]);

  useEffect(() => {
    if (!closeRef) return;
    closeRef.current = requestClose;
    return () => {
      if (closeRef.current === requestClose) closeRef.current = null;
    };
  }, [closeRef, requestClose]);

  // A modal sheet: the parent turned `visible` off (or back on mid-exit).
  useEffect(() => {
    if (inline) return;
    if (open) {
      if (closed.current || exiting.get()) {
        closed.current = false;
        leaving.current = false;
        finish.current = closeByUser;
        setLocked(false);
        if (height.get() > 0) animateIn();
      }
      return;
    }
    if (closed.current && !exiting.get()) {
      onExitedRef.current?.();
      return;
    }
    closed.current = true;
    setLocked(true);
    animateOut(() => onExitedRef.current?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // An inline route sheet: any way the route is removed (router.back, dismissAll, Android back)
  // slides the sheet away first, then carries on with the navigation.
  useEffect(() => {
    if (!inline) return;
    return navigation.addListener('beforeRemove', (e) => {
      if (leaving.current) return;
      e.preventDefault();
      leaving.current = true;
      closed.current = true;
      setLocked(true);
      animateOut(() => navigation.dispatch(e.data.action));
    });
  }, [inline, navigation, animateOut]);

  // Android back on a route sheet: slide away first (the navigation listener above would too, this is just earlier).
  useEffect(() => {
    if (!inline || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [inline, requestClose]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.max(0, e.nativeEvent.layout.height - OVERDRAG);
    const first = height.get() === 0;
    height.set(h);
    if (!first || !open) return;
    if (!reduced) ty.set(h);
    animateIn();
  };

  const pan = Gesture.Pan()
    .enabled(!locked)
    // Without a title the grabber alone is small; reach a little below it.
    .hitSlop({ bottom: title ? 0 : space.s5 })
    .onBegin(() => {
      // Catch the sheet wherever it is, even mid-animation.
      cancelAnimation(ty);
      cancelAnimation(fade);
      exiting.set(false);
      const y = ty.get();
      // Undo the rubber band, so a stretched sheet keeps tracking the finger.
      dragStart.set(y >= 0 ? y : -((OVERDRAG / RUBBER) * (1 / (1 + y / OVERDRAG) - 1)));
    })
    .onUpdate((e) => {
      const raw = dragStart.get() + e.translationY;
      ty.set(raw >= 0 ? raw : -(1 - 1 / ((-raw * RUBBER) / OVERDRAG + 1)) * OVERDRAG);
    })
    .onFinalize((e, activated) => {
      const h = height.get();
      // A close was asked for during the touch (the close button): let it run.
      if (!h || exiting.get()) return;
      const v = activated ? e.velocityY : 0;
      const projected = ty.get() + ((v / 1000) * DECELERATION) / (1 - DECELERATION);
      if (projected > h / 2) {
        exiting.set(true);
        if (reduced) fade.set(withTiming(0, FADE));
        else ty.set(withSpring(h, { ...SLIDE, velocity: v }));
      } else {
        if (reduced) {
          ty.set(withTiming(0, FADE));
          fade.set(withTiming(1, FADE));
        } else {
          ty.set(withSpring(0, { ...SETTLE, velocity: v }));
        }
      }
    });

  const scrimStyle = useAnimatedStyle(() => {
    const h = height.get();
    if (reduced) return { opacity: SCRIM * fade.get() };
    if (!h) return { opacity: 0 };
    return { opacity: SCRIM * (1 - Math.min(1, Math.max(0, ty.get() / h))) };
  });
  const panelStyle = useAnimatedStyle(() => ({
    opacity: reduced ? fade.get() : height.get() ? 1 : 0,
    transform: [{ translateY: ty.get() }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={locked}
          onPress={requestClose}
          style={styles.fill}
        />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          onAccessibilityEscape={requestClose}
          onLayout={onLayout}
          style={[
            styles.panel,
            { paddingBottom: Math.max(space.s6 + space.s2, insets.bottom + space.s3) + OVERDRAG },
            panelStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.handle}>
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
                  {showClose ? <CloseButton onPress={requestClose} /> : null}
                </View>
              ) : null}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The cross in a 44pt hit area, as the Import prototype draws it. */
export function CloseButton({ onPress, label = 'Close' }: { onPress: () => void; label?: string }) {
  const styles = useStyles();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.closeHit}>
      <Icon name="close" size={size.iconSm + 2} />
    </Tap>
  );
}

const useStyles = makeStyles((color) => ({
  fill: { flex: 1 },
  // A scrim darkens in both appearances, so it keeps the light palette's near-black ink.
  scrim: { backgroundColor: palette.light.ink },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    marginBottom: -OVERDRAG,
    paddingHorizontal: space.section,
    gap: space.s4,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    backgroundColor: color.surfaceRaised,
  },
  handle: { paddingTop: space.cozy, gap: space.s4 },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_W,
    height: GRABBER_H,
    borderRadius: GRABBER_H,
    backgroundColor: color.checkBorder,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  title: { flex: 1, gap: space.tight },
  closeHit: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -space.s1,
    marginTop: -space.s1,
  },
}));
