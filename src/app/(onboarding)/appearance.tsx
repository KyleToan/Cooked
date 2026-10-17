import { useRouter } from 'expo-router';

import { ActionPill } from '@/components/ActionPill';
import { ChoiceCards, OnbScreen, type Choice } from '@/components/Onboarding';
import { setAppearance, useAppearance, type AppearancePref } from '@/theme';

const CHOICES: Choice<AppearancePref>[] = [
  { id: 'system', title: 'Match my phone', sub: 'Light or dark, the same as your phone’s setting.' },
  { id: 'light', title: 'Light', sub: 'White pages and bright paper notes.' },
  { id: 'dark', title: 'Dark', sub: 'Easier on the eyes in the evening.' },
];

/** Light, dark or match the phone. Picking one changes the app straight away, so the person sees it. */
export default function AppearanceStep() {
  const router = useRouter();
  const picked = useAppearance();

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Light or dark?"
      sub="You can change this later in Account."
      bottom={<ActionPill label="Next" variant="primary" height="bottom" onPress={() => router.push('/household')} />}
    >
      <ChoiceCards label="Light or dark" choices={CHOICES} value={picked} onChange={setAppearance} />
    </OnbScreen>
  );
}
