import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine } from '@/components/Controls';
import { ChoiceCards, OnbScreen, type Choice } from '@/components/Onboarding';
import { failText, type Failure } from '@/data/errors';
import { kitchenName } from '@/data/helpers';
import * as api from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { pendingInvite } from '@/data/pendingInvite';
import { hasBackend } from '@/data/supabase';
import type { KitchenPath } from '@/data/types';

const CHOICES: Choice<KitchenPath>[] = [
  { id: 'solo', title: 'Just me', sub: 'One kitchen, one list.' },
  {
    id: 'household',
    title: 'Me and my household',
    sub: 'Partner, family or roommates share the fridge and the list. You’ll invite them after your first scan.',
  },
  { id: 'join', title: 'I have an invite', sub: 'Join a kitchen someone already set up.' },
];

/** Just me / Me and my household / I have an invite. */
export default function Household() {
  const router = useRouter();
  const { state, actions, reload } = useStore();
  // Opened from an invite link: joining is what they came for.
  const [picked, setPicked] = useState<KitchenPath>(() => (pendingInvite() ? 'join' : 'household'));
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
      // Safe to repeat after coming back to this step: the server answers a second call with the same kitchen.
      const r = await api.createKitchen(kitchenName(state.user));
      if (r === 'ok') await reload().catch(() => undefined);
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
      <ChoiceCards label="Who do you cook with" choices={CHOICES} value={picked} onChange={setPicked} />
    </OnbScreen>
  );
}
