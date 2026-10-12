import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { useStore } from '@/data/store';
import { color, radius, shadow, space } from '@/theme';

const RECEIPT: [string, string][] = [
  ['Milk 2%', '3.49'],
  ['Eggs, dozen', '4.29'],
  ['Basil', '2.99'],
  ['Spaghetti', '1.89'],
  ['Frozen peas', '2.49'],
];

const ART_H = 330;
const RECEIPT_W = 200;
const GUIDE = 30;
/** The receipt is a fixed-size drawing (hidden from VoiceOver), so its text barely grows. */
const ART_TEXT_MAX = 1.2;
/** The corner guides draw in once: from 90% and clear, critically damped. */
const GUIDE_IN = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
const GUIDE_FROM = 0.9;

/** Scan your first receipt, or skip it. */
export default function FirstScan() {
  const router = useRouter();
  const { actions } = useStore();
  const solo = useLocalSearchParams<{ flow?: string }>().flow === 'solo';
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.set(withSpring(1, GUIDE_IN));
  }, [shown]);
  const guideIn = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ scale: GUIDE_FROM + (1 - GUIDE_FROM) * shown.get() }],
  }));

  const later = () => {
    actions.skipFirstScan();
    router.push(solo ? '/ready' : '/invite');
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Scan your first receipt"
      sub="Cooked reads each item and puts it in the fridge, pantry or freezer. You can fix anything after."
      bottom={
        <>
          <ActionPill
            label="Scan a receipt"
            variant="primary"
            icon="scan"
            height="bottom"
            onPress={() => router.push({ pathname: '/scan', params: { flow: solo ? 'onbsolo' : 'onb' } })}
          />
          <TextLink label="I’ll do it later" variant="button" align="center" onPress={later} />
        </>
      }
    >
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.receipt}>
          <Text variant="micro" maxFontSizeMultiplier={ART_TEXT_MAX} weight="semibold">
            Corner Market
          </Text>
          {RECEIPT.map(([name, price]) => (
            <View key={name} style={styles.line}>
              <Text variant="micro" maxFontSizeMultiplier={ART_TEXT_MAX} weight="regular" color="inkMuted">
                {name}
              </Text>
              <Text variant="micro" maxFontSizeMultiplier={ART_TEXT_MAX} weight="regular" color="inkMuted">
                {price}
              </Text>
            </View>
          ))}
          <View style={[styles.line, styles.total]}>
            <Text variant="micro" maxFontSizeMultiplier={ART_TEXT_MAX} weight="semibold">
              Total
            </Text>
            <Text variant="micro" maxFontSizeMultiplier={ART_TEXT_MAX} weight="semibold">
              15.15
            </Text>
          </View>
        </View>
        <Animated.View style={[styles.guide, styles.tl, guideIn]} />
        <Animated.View style={[styles.guide, styles.tr, guideIn]} />
        <Animated.View style={[styles.guide, styles.bl, guideIn]} />
        <Animated.View style={[styles.guide, styles.br, guideIn]} />
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  art: { height: ART_H, alignSelf: 'center', width: RECEIPT_W + 2 * (space.s5 + 1) + 2 },
  receipt: {
    position: 'absolute',
    left: space.s5 + 1,
    top: space.s6 + 2,
    width: RECEIPT_W,
    paddingVertical: space.s5 + 2,
    paddingHorizontal: space.s5,
    gap: space.s2,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: space.s1,
    transform: [{ rotate: '-3deg' }],
    ...shadow.note,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { paddingTop: space.tight, borderTopWidth: 1, borderTopColor: color.line },
  guide: { position: 'absolute', width: GUIDE, height: GUIDE, borderColor: color.sageInk },
  tl: { left: 0, top: space.s2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.check + 3 },
  tr: { right: 0, top: space.s2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.check + 3 },
  bl: { left: 0, bottom: space.s5, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.check + 3 },
  br: { right: 0, bottom: space.s5, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.check + 3 },
});
