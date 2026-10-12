import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field } from '@/components/Controls';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { AccountEnding, Avatar, SettingsRow } from '@/components/Settings';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { joinAnd } from '@/data/helpers';
import { failText, type Failure } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { hasBackend, supabase } from '@/data/supabase';
import { size, space } from '@/theme';

const SIGN_IN = { email: 'Email code', phone: 'Text code', apple: 'Apple', google: 'Google' } as const;
const SIGNED_IN_WITH = { email: 'email', phone: 'phone', apple: 'Apple', google: 'Google' } as const;
const PROFILE = size.controlHeight + space.s2;

/** Profile, Kitchen, Your details, Help and privacy, Log out, Delete account. */
export default function Account() {
  const router = useRouter();
  const { state, actions } = useStore();
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(state.user.name);
  const [lastName, setLastName] = useState(state.user.lastName ?? '');
  const [busy, setBusy] = useState(false);
  // Which sheet's server call failed, so its error line shows.
  const [failed, setFailed] = useState<{ at: 'delete' | 'name'; why: Failure } | null>(null);

  const user = state.user;
  const method = state.session.signIn ?? 'email';
  const email = user.email ?? state.session.contact;
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ');
  const others = state.kitchen.people.filter((p) => p.id !== user.id).map((p) => p.name);
  const version = (Constants.expoConfig?.version ?? '1.0').split('.').slice(0, 2).join('.');

  // Logging out or deleting the account goes back to Welcome (the onboarding guard takes over).
  // Without a backend everything only lives on this phone, so both clear the kitchen and ask first.
  const leave = () => actions.reset();
  // Sign out locally even if the network call fails, so the person always gets out.
  const logOut = () => (supabase ? supabase.auth.signOut().catch(() => {}).finally(leave) : leave());

  /** Runs a server call with the sheet's button disabled; returns whether it worked and shows the error line if not. */
  const tryCall = async (which: 'delete' | 'name', run: () => Promise<api.Result>) => {
    if (!hasBackend) return true;
    setBusy(true);
    const r = await run();
    setBusy(false);
    const why = api.failure(r);
    setFailed(why ? { at: which, why } : null);
    return r === 'ok';
  };

  const deleteAccount = async () => {
    if (await tryCall('delete', api.deleteAccount)) logOut();
  };

  const saveName = async () => {
    if (!(await tryCall('name', () => api.saveProfile({ name: name.trim(), last_name: lastName.trim() || null })))) return;
    actions.setName(name, lastName.trim());
    setEditingName(false);
  };

  return (
    <Screen>
      <PushedHeader title="Account" onBack={() => router.back()} backLabel="Back" />

      <View style={styles.profile}>
        <Avatar name={user.name} paper="papaya" diameter={PROFILE} />
        <View style={styles.grow}>
          <Text variant="body" weight="semibold">
            {fullName}
          </Text>
          <Text variant="caption" color="inkMuted">
            {email}
          </Text>
        </View>
      </View>

      <View>
        <SectionHeader title="Kitchen" />
        <SettingsRow
          label={state.kitchen.name}
          description={others.length ? `You and ${joinAnd(others)} · invite, remove, leave` : 'Just you · invite, leave'}
          onPress={() => router.push('/household')}
        />
        <SettingsRow
          label="Notifications"
          description="To Buy changes and a daily use-soon nudge"
          onPress={() => router.push('/notifications')}
        />
      </View>

      <View>
        <SectionHeader title="Your details" />
        <SettingsRow label="Name" value={fullName} onPress={() => {
            setName(user.name);
            setLastName(user.lastName ?? '');
            setFailed(null);
            setEditingName(true);
          }} />
        <SettingsRow label="Email" value={email} />
        <SettingsRow label="Sign-in" value={SIGN_IN[method]} />
      </View>

      <View>
        <SectionHeader title="Help and privacy" />
        <SettingsRow label="Help and feedback" onPress={() => Linking.openURL('https://cooked.app/help')} />
        <SettingsRow label="Privacy policy" onPress={() => Linking.openURL('https://cooked.app/privacy')} />
        <SettingsRow label="Terms" onPress={() => Linking.openURL('https://cooked.app/terms')} />
      </View>

      <AccountEnding
        onLogOut={() => setLoggingOut(true)}
        onDelete={() => {
          setFailed(null);
          setDeleting(true);
        }}
        version={`Cooked ${version} · signed in with ${SIGNED_IN_WITH[method]}`}
      />

      <Sheet visible={deleting} onClose={() => setDeleting(false)} showClose={false} title="Delete your account?">
        <Text variant="button" weight="regular" color="inkMuted">
          Your sign-in and name are removed for good.{' '}
          {others.length
            ? `${state.kitchen.name} stays for ${joinAnd(others)}, with everything in it. `
            : ''}
          This can’t be undone.
        </Text>
        <ActionPill label="Keep my account" variant="primary" height="bottom" onPress={() => setDeleting(false)} />
        {failed?.at === 'delete' ? <ErrorLine text={failText('delete your account', failed.why)} /> : null}
        <TextLink label="Delete account" color="errorInk" variant="button" align="center" onPress={deleteAccount} disabled={busy} />
      </Sheet>

      <Sheet visible={loggingOut} onClose={() => setLoggingOut(false)} showClose={false} title="Log out?">
        <Text variant="button" weight="regular" color="inkMuted">
          {hasBackend
            ? 'Your kitchen stays saved to your account. Log back in to see it again.'
            : 'Your kitchen is only saved on this phone for now, so logging out clears it: every item, list and recipe.'}
        </Text>
        <ActionPill label="Stay logged in" variant="primary" height="bottom" onPress={() => setLoggingOut(false)} />
        {/* Red only when logging out clears this phone (no backend); with one, nothing is lost. */}
        <TextLink label="Log out" color={hasBackend ? 'ink' : 'errorInk'} variant="button" align="center" onPress={logOut} />
      </Sheet>

      <Sheet visible={editingName} onClose={() => setEditingName(false)} title="Your name">
        <Field label="First name" value={name} onChangeText={setName} autoFocus textContentType="givenName" autoCapitalize="words" />
        <Field
          label="Last name (optional)"
          value={lastName}
          onChangeText={setLastName}
          textContentType="familyName"
          autoCapitalize="words"
        />
        {failed?.at === 'name' ? <ErrorLine text={failText('save your name', failed.why)} /> : null}
        <ActionPill label="Save" variant="primary" height="bottom" disabled={!name.trim()} busy={busy} onPress={saveName} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.roomy },
});
