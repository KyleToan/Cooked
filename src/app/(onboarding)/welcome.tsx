import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionPill } from '@/components/ActionPill';
import { ONB_GUTTER } from '@/components/Onboarding';
import { PaperNote } from '@/components/StickyNote';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { size, space } from '@/theme';

/** Four notes on a fridge door, "Cooked", one line, Get started. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const next = () => router.push('/sign-in');

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.section + space.s5 }]}>
      <View style={styles.notes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PaperNote label="Milk" body="2% · use by Fri" paper="cornsilk" tilt={-2} style={[styles.note, styles.n1]} />
        <PaperNote label="Eggs" body="6 left" paper="papaya" tilt={2} style={[styles.note, styles.n2]} />
        <PaperNote label="Basil" body="for pesto!" paper="beige" tilt={1.5} style={[styles.note, styles.n3]} />
        <PaperNote label="Spinach" flag="use by tomorrow" paper="sage" tilt={-1.5} style={[styles.note, styles.n4]} />
      </View>

      <View style={styles.copy}>
        <Text variant="titleXl" accessibilityRole="header">
          Cooked
        </Text>
        <Text color="inkMuted">Know what’s in your fridge, pantry and freezer, and shop with the people you live with.</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.s4) + space.s3 }]}>
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
      </View>
    </View>
  );
}

const NOTE_W = 146;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: ONB_GUTTER },
  notes: { height: 330 },
  note: { position: 'absolute', flex: 0, width: NOTE_W, height: size.noteHeight, justifyContent: 'space-between' },
  n1: { left: space.s2, top: space.s4 + 2 },
  n2: { left: 186, top: space.s1 },
  n3: { left: space.s6 + 2, top: 178 },
  n4: { left: 182, top: 166 },
  copy: { gap: space.s3, marginTop: space.section * 2 + 2 },
  bottom: { marginTop: 'auto', gap: space.s3 },
  login: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLink: { minHeight: size.targetMin, justifyContent: 'center' },
});
