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
import { failText } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { devSeed } from '@/data/devSeed';
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
  offline: failText('check that code', 'offline'),
  server: failText('check that code', 'server'),
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
  // What the server said about the last settled code: its kitchen, or null when there's none.
  const [peek, setPeek] = useState<{ code: string; info: api.InvitePeek | null } | null>(null);

  const code = codeOf(value);
  // Without a backend (development) only the sample code is known, so it shows the kitchen before joining.
  const sample = !hasBackend ? devSeed : null;
  const found = !!sample && code === sample.SEED_KITCHEN.inviteCode;
  const peeked = hasBackend && peek?.code === code ? peek : null;
  const note: api.InvitePeek | null = hasBackend
    ? (peeked?.info ?? null)
    : found && sample
      ? {
          kitchen: sample.SEED_KITCHEN.name,
          invitedBy: sample.SAM.name,
          items: inStock(sample.SEED_ITEMS).length,
          toBuy: sample.SEED_TO_BUY.length,
        }
      : null;
  const result = failed?.code === code ? failed.result : null;
  const failMessage = result ? FAILED[result] : undefined;
  const notFound = hasBackend
    ? result === 'not_found' || (!result && !!peeked && !peeked.info && checked === value)
    : !!value.trim() && !found && checked === value;

  useEffect(() => {
    if (!value.trim()) return;
    const t = setTimeout(() => setChecked(value), SETTLE_MS);
    return () => clearTimeout(t);
  }, [value]);

  // Look a settled code up once; an answer for a code that's since changed is dropped.
  useEffect(() => {
    const c = codeOf(checked);
    if (!hasBackend || !c) return;
    let live = true;
    api.peekInvite(c).then((info) => {
      if (live) setPeek({ code: c, info });
    });
    return () => {
      live = false;
    };
  }, [checked]);

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
      bottom={
        <>
          {failMessage ? <ErrorLine text={failMessage} /> : null}
          <ActionPill
            label={result === 'offline' || result === 'server' ? 'Try again' : note ? `Join ${note.kitchen}` : 'Join'}
            variant="primary"
            height="bottom"
            onPress={join}
            disabled={hasBackend ? !code : !found}
            busy={busy}
          />
        </>
      }
    >
      <Field
        label="Invite link or code"
        value={value}
        onChangeText={setValue}
        placeholder="cooked.app/join/…"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="join"
        onSubmitEditing={join}
      />
      {!value ? <ActionPill label="Paste invite link" height="header" onPress={paste} /> : null}
      {notFound ? <ErrorLine text="We couldn’t find a kitchen with that code. Check the link and try again." /> : null}
      {note ? (
        <BigNote paper="beige" tilt={-1} style={styles.note}>
          <Text variant="noteTitle" color="noteInk" maxFontSizeMultiplier={NOTE_TITLE_MAX}>
            {note.kitchen}
          </Text>
          <Text variant="caption" color="noteInkSoft">
            {note.invitedBy ? `${note.invitedBy} invited you\n` : ''}
            {note.items} {note.items === 1 ? 'thing' : 'things'} in the kitchen · {note.toBuy} on To Buy
          </Text>
        </BigNote>
      ) : null}
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  note: { paddingTop: space.s4, gap: space.tight },
});
