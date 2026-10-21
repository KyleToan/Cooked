// Pieces only the camera screens use. The camera is the one place see-through
// dark controls are allowed, because they sit over a live feed.

import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/theme';

// Camera chrome sits on the feed, so it keeps the same dark-glass and white colors in both appearances.
const color = palette.light;

const GLASS = 0.4;
const BLUR = 30;
// Android's BlurView only fakes the blur unless it wraps the camera as a blur target, and on the web it blurs the
// icons it holds, so both keep the flat wash.
const CAN_BLUR = Platform.OS === 'ios';

/** True while Reduce Transparency is on (iOS); the glass then turns flat. iOS only: the web has no such setting. */
function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(setOn)
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/** A dark blurred backing for a control over the camera feed; `on` is a flat white fill. */
export function Glass({ style, children, on }: { style?: StyleProp<ViewStyle>; children?: ReactNode; on?: boolean }) {
  const flat = useReduceTransparency() || !CAN_BLUR;
  return (
    <View style={[styles.glassBox, style]}>
      {on ? (
        <View style={[StyleSheet.absoluteFill, styles.on]} />
      ) : flat ? (
        <View style={[StyleSheet.absoluteFill, styles.glass]} />
      ) : (
        <BlurView tint="dark" intensity={BLUR} style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

const SCRIM = 0.45;

/**
 * An ink wash that fades from one edge, so white text and controls stay
 * readable over a bright feed (a white receipt). Draw it under the controls;
 * it never takes touches.
 */
export function Scrim({ edge, style }: { edge: 'top' | 'bottom'; style?: StyleProp<ViewStyle> }) {
  const id = `scrim-${edge}`;
  const top = edge === 'top';
  return (
    <View pointerEvents="none" style={style}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1={top ? '0' : '1'} x2="0" y2={top ? '1' : '0'}>
            <Stop offset="0" stopColor={color.noteInk} stopOpacity={SCRIM} />
            <Stop offset="0.55" stopColor={color.noteInk} stopOpacity={SCRIM * 0.7} />
            <Stop offset="1" stopColor={color.noteInk} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const CORNER = 40;
const CORNER_W = 3;
const CORNER_R = 12;

/** The four white corner guides the receipt fits inside. */
export function CornerGuides({ style, faded }: { style?: StyleProp<ViewStyle>; faded?: boolean }) {
  return (
    <View pointerEvents="none" style={[style, faded && styles.faded]}>
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glassBox: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  glass: { backgroundColor: color.ink, opacity: GLASS },
  on: { backgroundColor: color.onInk },
  faded: { opacity: 0.35 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: color.onInk },
  tl: { left: 0, top: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: CORNER_R },
  tr: { right: 0, top: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: CORNER_R },
  bl: { left: 0, bottom: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: CORNER_R },
  br: { right: 0, bottom: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: CORNER_R },
});

