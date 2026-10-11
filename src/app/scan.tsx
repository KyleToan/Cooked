import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CornerGuides, FlashGlyph, Glass, PhotosGlyph } from '@/components/Camera';
import { Icon } from '@/components/Icon';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { scanFlow } from '@/data/helpers';
import { color, radius, size, space } from '@/theme';

type Mode = 'receipt' | 'fridge' | 'pantry' | 'freezer' | 'recipe';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'receipt', label: 'Receipt', hint: 'Fit the whole receipt inside the corners.' },
  { id: 'fridge', label: 'Fridge', hint: 'Point at an open shelf. We’ll add what we see to the fridge.' },
  { id: 'pantry', label: 'Pantry', hint: 'Point at a shelf. We’ll add what we see to the pantry.' },
  { id: 'freezer', label: 'Freezer', hint: 'Point at a drawer. We’ll add what we see to the freezer.' },
  { id: 'recipe', label: 'Recipe', hint: 'Fit the recipe page inside the corners to save it.' },
];

const SHUTTER = 78;
const SHUTTER_DOT = 62;
const SIDE_BTN = 48;
const STRIP = 56;

/**
 * Full-screen camera with corner guides, a mode strip, Photos and Flash.
 * Reading the receipt isn't built yet: any photo goes to Check your scan with
 * the sample receipt.
 */
export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flow = scanFlow(useLocalSearchParams<{ flow?: string }>().flow);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>('receipt');
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.status === 'undetermined') requestPermission();
  }, [permission, requestPermission]);

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const granted = !!permission?.granted;

  const review = () => router.push({ pathname: '/scan-review', params: { flow } });

  const capture = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // The photo isn't read yet (no OCR); taking it is still real.
      if (granted) await camera.current?.takePictureAsync({ quality: 0.6, skipProcessing: true });
    } catch {
      // A simulator has no camera; carry on to the sample scan.
    } finally {
      setBusy(false);
    }
    review();
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) review();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {granted ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" flash={flash ? 'on' : 'off'} />
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + space.s2 }]}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
          <Glass style={styles.round}>
            <Icon name="close" size={20} color="onInk" />
          </Glass>
        </Tap>
        <Text variant="body" weight="semibold" color="onInk">
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
            <Text variant="micro" color="onInk" style={styles.dev}>
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
            <Text variant="body" weight="medium" color="onInk" style={styles.center}>
              {current.hint}
            </Text>
            {mode === 'receipt' ? (
              <Text variant="caption" color="onInk" style={[styles.center, styles.soft]}>
                Long receipt? Take it in parts.
              </Text>
            ) : null}
          </>
        ) : (
          <PermissionAsk canAsk={permission.canAskAgain} onAsk={requestPermission} />
        )}
      </View>

      <CornerGuides style={styles.guides} />

      <View style={styles.controls}>
        <Tap accessibilityRole="button" accessibilityLabel="Choose a photo or screenshot" onPress={pickPhoto} style={styles.side}>
          <Glass style={styles.square}>
            <PhotosGlyph />
          </Glass>
          <Text variant="micro" color="onInk">
            Photos
          </Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ busy }}
          onPress={capture}
          style={styles.shutter}
        >
          <View style={styles.shutterDot} />
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Flash"
          accessibilityState={{ selected: flash }}
          onPress={() => setFlash(!flash)}
          style={styles.side}
        >
          <Glass style={styles.square} on={flash}>
            <FlashGlyph tint={flash ? color.ink : color.onInk} />
          </Glass>
          <Text variant="micro" color="onInk">
            {flash ? 'Flash on' : 'Flash'}
          </Text>
        </Tap>
      </View>

      <Glass style={[styles.strip, { marginBottom: Math.max(insets.bottom, space.s4) + space.s3 }]}>
        <View accessibilityRole="tablist" accessibilityLabel="Scan mode" style={styles.modes}>
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <Tap
                key={m.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setMode(m.id)}
                style={[styles.mode, on && styles.modeOn]}
              >
                <Text variant="caption" weight="medium" color={on ? 'ink' : 'onInk'}>
                  {m.label}
                </Text>
              </Tap>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

/** Shown in place of the hint when the camera isn't allowed yet. */
function PermissionAsk({ canAsk, onAsk }: { canAsk: boolean; onAsk: () => void }) {
  return (
    <View style={styles.ask}>
      <Text variant="body" weight="medium" color="onInk" style={styles.center}>
        Cooked needs the camera to scan your receipt.
      </Text>
      <Tap accessibilityRole="button" onPress={canAsk ? onAsk : () => Linking.openSettings()} style={styles.askBtn}>
        <Text variant="button" weight="semibold">
          {canAsk ? 'Allow camera' : 'Open Settings'}
        </Text>
      </Tap>
      <Text variant="caption" color="onInk" style={[styles.center, styles.soft]}>
        Or pick a photo of it from Photos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.noteInk },
  center: { textAlign: 'center' },
  soft: { opacity: 0.85 },
  top: {
    paddingHorizontal: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { width: size.targetMin, height: size.targetMin, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dev: { textAlign: 'center', opacity: 0.7 },
  hint: { marginTop: space.s4, marginHorizontal: space.s5 * 2, gap: space.s1, minHeight: space.s5 * 2 + space.s3 },
  guides: { flex: 1, marginTop: space.s4, marginBottom: space.s6 + space.s1, marginHorizontal: space.s6 + space.s1 },
  controls: {
    height: SHUTTER + 2,
    marginHorizontal: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { alignItems: 'center', gap: space.s1 },
  square: { width: SIDE_BTN, height: SIDE_BTN, borderRadius: radius.control },
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
  strip: { height: STRIP, marginTop: space.section + space.s3, marginHorizontal: space.s5, borderRadius: radius.pill },
  modes: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: space.s1 + 2, flexDirection: 'row', gap: space.s1 },
  mode: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: color.onInk },
  ask: { alignItems: 'center', gap: space.s3 },
  askBtn: {
    height: size.targetMin,
    paddingHorizontal: space.s5,
    borderRadius: radius.pill,
    backgroundColor: color.onInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
