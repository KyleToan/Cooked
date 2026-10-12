import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { PaperNote } from '@/components/StickyNote';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { size, space } from '@/theme';

/**
 * Four notes on a fridge door, "Cooked", one line, Get started. The notes and
 * copy scroll and the buttons stay pinned, so large text never pushes Get
 * started off screen.
 */
export default function Welcome() {
  const router = useRouter();
  const next = () => router.push('/sign-in');

  return (
    <OnbScreen
      topSpace={space.section + space.s4}
      bottom={
        <>
          <ActionPill label="Get started" variant="primary" height="bottom" onPress={next} />
          <View style={styles.login}>
            <Text variant="button" weight="regular" color="inkMuted">
              Already cooking with us?{' '}
            </Text>
            <Tap accessibilityRole="link" onPress={next} style={styles.loginLink}>
              <Text variant="button" weight="semibold" color="sageInk">
                Log in
              </Text>
            </Tap>
          </View>
        </>
      }
    >
      {/* Two rows of two notes, staggered like a fridge door. They share the width, so they fit any iPhone. */}
      <View style={styles.notes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.row, styles.row1]}>
          <PaperNote label="Milk" body="2% · use by Fri" paper="cornsilk" tilt={-2} style={[styles.note, styles.lower]} />
          <PaperNote label="Eggs" body="6 left" paper="papaya" tilt={2} style={styles.note} />
        </View>
        <View style={[styles.row, styles.row2]}>
          <PaperNote label="Basil" body="for pesto!" paper="beige" tilt={1.5} style={[styles.note, styles.lower]} />
          <PaperNote label="Spinach" flag="use by tomorrow" paper="sage" tilt={-1.5} style={styles.note} />
        </View>
      </View>

      <View style={styles.copy}>
        <Text variant="titleXl" accessibilityRole="header">
          Cooked
        </Text>
        <Text color="inkMuted">Know what’s in your fridge, pantry and freezer, and shop with the people you live with.</Text>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  notes: { gap: space.section + space.s4, paddingTop: space.s2 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  // The top pair sits wide apart; the bottom pair is nudged right and closer together.
  row1: { gap: space.section + space.s2, paddingHorizontal: space.s2 },
  row2: { gap: space.s2, paddingLeft: space.s6 + 2 },
  note: { justifyContent: 'space-between' },
  /** The left note of each pair hangs a little lower than its neighbour. */
  lower: { marginTop: space.roomy },
  copy: { gap: space.s3, marginTop: space.section },
  login: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  loginLink: { minHeight: size.targetMin, justifyContent: 'center' },
});
