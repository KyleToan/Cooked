import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { useStore } from '@/data/store';
import type { KitchenPath } from '@/data/types';
import { color, radius, space } from '@/theme';

const CHOICES: { id: KitchenPath; title: string; sub: string }[] = [
  { id: 'solo', title: 'Just me', sub: 'One kitchen, one list.' },
  {
    id: 'household',
    title: 'Me and my household',
    sub: 'Partner, family or roommates share the fridge and the list. You’ll invite them after your first scan.',
  },
  { id: 'join', title: 'I have an invite', sub: 'Join a kitchen someone already set up.' },
];

const RADIO = 22;

/** Just me / Me and my household / I have an invite. */
export default function Household() {
  const router = useRouter();
  const { actions } = useStore();
  const [picked, setPicked] = useState<KitchenPath>('household');

  const next = () => {
    if (picked === 'join') {
      router.push('/join');
      return;
    }
    actions.choosePath(picked);
    router.push({ pathname: '/first-scan', params: { flow: picked } });
  };

  return (
    <OnbScreen onBack={() => router.back()} title="Who do you cook with?" sub="You can change this later.">
      <View accessibilityRole="radiogroup" accessibilityLabel="Who do you cook with" style={styles.choices}>
        {CHOICES.map((c) => {
          const on = c.id === picked;
          return (
            <Tap
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPicked(c.id)}
              style={[styles.choice, on ? styles.on : styles.off]}
            >
              <View style={styles.text}>
                <Text weight="semibold">{c.title}</Text>
                <Text variant="caption" color="inkMuted">
                  {c.sub}
                </Text>
              </View>
              <View style={[styles.radio, on ? styles.radioOn : styles.radioOff]} />
            </Tap>
          );
        })}
      </View>
      <ActionPill label="Next" variant="primary" height="bottom" onPress={next} />
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  choices: { gap: space.s3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.s3 + 2, padding: space.s4, borderRadius: radius.field },
  on: { backgroundColor: color.beige, borderWidth: 1.5, borderColor: color.sageInk },
  off: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  text: { flex: 1, gap: 3 },
  radio: { width: RADIO, height: RADIO, flexShrink: 0, borderRadius: radius.pill },
  radioOn: { borderWidth: 7, borderColor: color.sageInk },
  radioOff: { borderWidth: 1.5, borderColor: color.controlLine },
});
