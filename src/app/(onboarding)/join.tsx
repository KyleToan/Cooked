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
import * as api from '@/data/kitchenApi';
import { SEED_ITEMS, SEED_KITCHEN, SEED_TO_BUY, SAM } from '@/data/seed';
import { useStore } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import { space } from '@/theme';

/** The code at the end of an invite link (cooked.app/join/<code>), or the code itself. */
const codeOf = (v: string) => v.trim().replace(/\/+$/, '').split('/').pop()?.toLowerCase() ?? '';

/** How long typing has to pause before an unknown code counts as finished. */
const SETTLE_MS = 600;

/** What the server said about a code, beyond "not found". */
const FAILED: Partial<Record<api.Result, string>> = {
  used: 'This link was already used. Ask for a new one.',
  expired: 'This link ran out. Ask for a new one.',
  network: 'We couldn’t check that code. Check your connection and try again.',
};

/**
 * Paste the invite link or type the code. With a backend the server checks it;
 * without one the only kitchen to join is the sample Rivera kitchen.
 */
export default function Join() {
  const router = useRouter();
  const { actions, reload } = useStore();
  const [value, setValue] = useState('');
  // The server's answer for the code that was last tried; cleared when the code changes.
  const [failed, setFailed] = useState<{ code: string; result: api.Result } | null>(null);
  const [busy, setBusy] = useState(false);
  // The value we've decided is finished: pasted, submitted, or not typed into for a moment.
  // "Couldn't find a kitchen" only shows for that, never while someone is still typing.
  const [checked, setChecked] = useState('');

  const code = codeOf(value);
  // Without a backend only the sample code is known, so it shows the kitchen before joining.
  const found = !hasBackend && code === SEED_KITCHEN.inviteCode;
  const result = failed?.code === code ? failed.result : null;
  const failText = result ? FAILED[result] : undefined;
  const notFound = hasBackend ? result === 'not_found' : !!value.trim() && !found && checked === value;

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

  const join = async () => {
    setChecked(value);
    if (hasBackend) {
      if (!code || busy) return;
      setBusy(true);
      let r = await api.joinKitchen(code);
      if (r === 'ok') r = await api.finishOnboarding();
      if (r === 'ok') await reload();
      setBusy(false);
      if (r !== 'ok') return setFailed({ code, result: r });
      actions.finishOnboarding();
      return;
    }
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
      {failText ? <ErrorLine text={failText} /> : null}
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
        disabled={hasBackend ? !code || busy : !found}
      />
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  note: { paddingTop: space.s4, gap: space.s1 + 2 },
});
