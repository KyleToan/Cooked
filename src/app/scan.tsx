import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CornerGuides, Glass, Scrim } from '@/components/Camera';
import { Icon } from '@/components/Icon';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { scanFlow } from '@/data/helpers';
import { haptics } from '@/hooks/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, radius, size, space } from '@/theme';

/*
 * Only Receipt ships. Fridge, Pantry and Freezer (point at a shelf) need real
 * image reading, and Recipe lives in Import. To bring modes back, add them here
 * and put the mode strip back under the controls (see git history).
 */
type Mode = 'receipt';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'receipt', label: 'Receipt', hint: 'Fit the whole receipt inside the corners.' },
];

const SHUTTER = 78;
const SHUTTER_DOT = 62;
const SIDE_BTN = 48;
const GLYPH = 22;
/** Camera chrome sits over the feed around a fixed-size shutter; cap how far its text grows. */
const CHROME_MAX_SCALE = 1.3;
/** A critically damped spring: the shutter dips and settles without bouncing. */
const PRESS_SPRING = { stiffness: 400, damping: 40, mass: 1 };
const FLASH_IN = 40;
const FLASH_OUT = 80;

/**
 * Full-screen camera with corner guides, Photos and Flash. Reading the receipt
 * isn't built yet: any photo goes to Check your scan with the sample receipt.
 */
export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flow = scanFlow(useLocalSearchParams<{ flow?: string }>().flow);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const reduced = useReducedMotion();
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const press = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.get() }));

  useEffect(() => {
    if (permission && !permission.granted && permission.status === 'undetermined') requestPermission();
  }, [permission, requestPermission]);

  const current = MODES[0];
  const granted = !!permission?.granted;

  const review = () => router.push({ pathname: '/scan-review', params: { flow } });

  const capture = async () => {
    if (busy) return;
    haptics.tap();
    // A quick white flash over the preview says the photo was taken. Reduce Motion keeps just the haptic.
    if (!reduced) flashOpacity.set(withSequence(withTiming(1, { duration: FLASH_IN }), withTiming(0, { duration: FLASH_OUT })));
    setBusy(true);
    try {
      // The photo isn't read yet (no OCR); taking it is still real.
      if (granted)
        await camera.current?.takePictureAsync({
          quality: 0.6,
          skipProcessing: true,
        });
    } catch {
      // A simulator has no camera; carry on to the sample scan.
    } finally {
      setBusy(false);
    }
    review();
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled) review();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {granted ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" flash={flash ? 'on' : 'off'} />
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      <View>
        <Scrim edge="top" style={styles.scrimTop} />
        <View style={[styles.top, { paddingTop: insets.top + space.s2 }]}>
          <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
            <Glass style={styles.round}>
              <Icon name="close" size={20} color="onInk" />
            </Glass>
          </Tap>
          <Text variant="body" weight="semibold" color="onInk" maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Scan
          </Text>
          {__DEV__ ? (
            // Dev only: reach "Couldn't read this receipt" until real OCR exists.
            <Tap
              accessibilityRole="button"
              accessibilityLabel="Developer: show the couldn't read this receipt screen"
              onPress={() => router.push({ pathname: '/scan-unreadable', params: { flow } })}
              style={styles.round}
            >
              <Text variant="micro" color="onInk" style={styles.dev} maxFontSizeMultiplier={1}>
                DEV{'\n'}error
              </Text>
            </Tap>
          ) : (
            <View style={styles.round} />
          )}
        </View>

        <View style={styles.hint}>
          {granted || !permission ? (
            <>
              <Text variant="body" weight="medium" color="onInk" style={styles.center} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                {current.hint}
              </Text>
              <Text variant="caption" color="onInk" style={[styles.center, styles.soft]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                Long receipt? Take it in parts.
              </Text>
            </>
          ) : (
            <PermissionAsk canAsk={permission.canAskAgain} onAsk={requestPermission} />
          )}
        </View>
      </View>

      <CornerGuides style={styles.guides} />

      <View style={{ paddingBottom: Math.max(insets.bottom, space.s4) + space.s5 }}>
        <Scrim edge="bottom" style={styles.scrimBottom} />
        <View style={styles.controls}>
          <Tap accessibilityRole="button" accessibilityLabel="Choose a photo or screenshot" onPress={pickPhoto} style={styles.side}>
            <Glass style={styles.square}>
              <Icon name="photos" size={GLYPH} color="onInk" />
            </Glass>
            <Text variant="micro" color="onInk" maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              Photos
            </Text>
          </Tap>
          {/* A plain Pressable: the shutter scales on press instead of Tap's dim, and dims only while busy. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{ busy }}
            disabled={busy}
            onPressIn={() => {
              press.set(withSpring(0.92, PRESS_SPRING));
            }}
            onPressOut={() => {
              press.set(withSpring(1, PRESS_SPRING));
            }}
            onPress={capture}
          >
            <Animated.View style={[styles.shutter, busy && styles.busy, shutterStyle]}>
              <View style={styles.shutterDot} />
            </Animated.View>
          </Pressable>
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Flash"
            accessibilityState={{ selected: flash }}
            onPress={() => setFlash(!flash)}
            style={styles.side}
          >
            <Glass style={styles.square} on={flash}>
              <Icon name="flash" size={GLYPH} color={flash ? 'ink' : 'onInk'} />
            </Glass>
            <Text variant="micro" color="onInk" maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {flash ? 'Flash on' : 'Flash'}
            </Text>
          </Tap>
        </View>
      </View>
    </View>
  );
}

/** Shown in place of the hint when the camera isn't allowed yet. */
function PermissionAsk({ canAsk, onAsk }: { canAsk: boolean; onAsk: () => void }) {
  return (
    <View style={styles.ask}>
      <Text variant="body" weight="medium" color="onInk" style={styles.center} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
        Cooked needs the camera to scan your receipt.
      </Text>
      <Tap accessibilityRole="button" onPress={canAsk ? onAsk : () => Linking.openSettings()} style={styles.askBtn}>
        <Text variant="button" weight="semibold" maxFontSizeMultiplier={CHROME_MAX_SCALE}>
          {canAsk ? 'Allow camera' : 'Open Settings'}
        </Text>
      </Tap>
      <Text variant="caption" color="onInk" style={[styles.center, styles.soft]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
        Or pick a photo of it from Photos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.noteInk },
  center: { textAlign: 'center' },
  soft: { opacity: 0.85 },
  top: { paddingHorizontal: space.s5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: size.targetMin, height: size.targetMin, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dev: { textAlign: 'center', opacity: 0.7 },
  hint: { marginTop: space.s4, marginHorizontal: space.s5 * 2, gap: space.s1, minHeight: space.s5 * 2 + space.s3 },
  guides: { flex: 1, marginTop: space.s4, marginBottom: space.s6 + space.s1, marginHorizontal: space.s6 + space.s1 },
  flash: { backgroundColor: color.surface },
  // Each wash reaches past its controls so it fades out over the feed, not at a hard edge.
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -space.section * 2 },
  scrimBottom: { position: 'absolute', top: -space.section * 3, left: 0, right: 0, bottom: 0 },
  controls: {
    minHeight: SHUTTER + 2,
    marginHorizontal: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { alignItems: 'center', gap: space.s1 },
  square: { width: SIDE_BTN, height: SIDE_BTN, borderRadius: radius.control },
  busy: { opacity: 0.5 },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: radius.pill,
    borderWidth: space.s1,
    borderColor: color.onInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDot: { width: SHUTTER_DOT, height: SHUTTER_DOT, borderRadius: radius.pill, backgroundColor: color.onInk },
  ask: { alignItems: 'center', gap: space.s3 },
  askBtn: {
    minHeight: size.targetMin,
    paddingVertical: space.s2,
    paddingHorizontal: space.s5,
    borderRadius: radius.pill,
    backgroundColor: color.onInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
