import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { BigNote, NOTE_TITLE_MAX } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { inStock } from '@/data/helpers';
import { SEED_ITEMS, SEED_KITCHEN, SEED_TO_BUY, SAM } from '@/data/seed';
import { useStore } from '@/data/store';
import { space } from '@/theme';

/** The code at the end of an invite link (cooked.app/join/<code>), or the code itself. */
const codeOf = (v: string) => v.trim().replace(/\/+$/, '').split('/').pop()?.toLowerCase() ?? '';

/** How long typing has to pause before an unknown code counts as finished. */
const SETTLE_MS = 600;

/**
 * Paste the invite link or type the code. Until there's a backend the only
 * kitchen to join is the sample Rivera kitchen.
 */
export default function Join() {
  const router = useRouter();
  const { actions } = useStore();
  const [value, setValue] = useState('');
  // The value we've decided is finished: pasted, submitted, or not typed into for a moment.
  // "Couldn't find a kitchen" only shows for that, never while someone is still typing.
  const [checked, setChecked] = useState('');

  const code = codeOf(value);
  const found = code === SEED_KITCHEN.inviteCode;
  const notFound = !!value.trim() && !found && checked === value;

  useEffect(() => {
    if (!value.trim()) return;
    const t = setTimeout(() => setChecked(value), SETTLE_MS);
    return () => clearTimeout(t);
  }, [value]);

  const paste = async () => {
    const clip = (await Clipboard.getStringAsync()).trim();
    if (clip) {
      setValue(clip);
      setChecked(clip);
    }
  };

  const join = () => {
    setChecked(value);
    if (!found) return;
    actions.choosePath('join');
    actions.finishOnboarding();
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Join a kitchen"
      sub="Paste the invite link someone sent you, or type the code at the end of it."
    >
      <Field
        label="Invite link or code"
        value={value}
        onChangeText={setValue}
        placeholder="rivera-kitchen"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="join"
        onSubmitEditing={join}
      />
      {!value ? <ActionPill label="Paste invite link" height="header" onPress={paste} /> : null}
      {notFound ? <ErrorLine text="We couldn’t find a kitchen with that code. Check the link and try again." /> : null}
      {found ? (
        <BigNote paper="beige" tilt={-1} style={styles.note}>
          <Text variant="noteTitle" color="noteInk" maxFontSizeMultiplier={NOTE_TITLE_MAX}>
            {SEED_KITCHEN.name}
          </Text>
          <Text variant="caption" color="noteInkSoft">
            {SAM.name} invited you{'\n'}
            {inStock(SEED_ITEMS).length} things in the kitchen · {SEED_TO_BUY.length} on To Buy
          </Text>
        </BigNote>
      ) : null}
      <ActionPill
        label={found ? `Join ${SEED_KITCHEN.name}` : 'Join'}
        variant="primary"
        height="bottom"
        onPress={join}
        disabled={!found}
      />
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  note: { paddingTop: space.s4, gap: space.s1 + 2 },
});
