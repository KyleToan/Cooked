import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { failText, type Failure } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import type { KitchenPath } from '@/data/types';
import { makeStyles, radius, space } from '@/theme';

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
  const styles = useStyles();
  const router = useRouter();
  const { state, actions, reload } = useStore();
  const [picked, setPicked] = useState<KitchenPath>('household');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);

  const next = async () => {
    if (picked === 'join') {
      router.push('/join');
      return;
    }
    if (hasBackend) {
      if (busy) return;
      setBusy(true);
      const r = await api.createKitchen(`${state.user.lastName || state.user.name} kitchen`);
      if (r === 'ok') await reload();
      setBusy(false);
      setFailed(api.failure(r));
      if (r !== 'ok') return;
    } else {
      actions.choosePath(picked);
    }
    router.push({ pathname: '/first-scan', params: { flow: picked } });
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Who do you cook with?"
      sub="You can change this later."
      bottom={
        <>
          {failed ? <ErrorLine text={failText('set up your kitchen', failed)} /> : null}
          <ActionPill label="Next" variant="primary" height="bottom" onPress={next} busy={busy} />
        </>
      }
    >
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
    </OnbScreen>
  );
}

const useStyles = makeStyles((color) => ({
  choices: { gap: space.s3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.roomy, padding: space.s4, borderRadius: radius.field },
  on: { backgroundColor: color.beige, borderWidth: 1.5, borderColor: color.sageInk },
  off: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  text: { flex: 1, gap: 3 },
  radio: { width: RADIO, height: RADIO, flexShrink: 0, borderRadius: radius.pill },
  radioOn: { borderWidth: 7, borderColor: color.sageInk },
  radioOff: { borderWidth: 1.5, borderColor: color.controlLine },
}));
