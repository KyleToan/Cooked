import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field, Segmented } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Text } from '@/components/Text';
import { failText, failureOf, type Failure } from '@/data/errors';
import { useStore } from '@/data/store';
import { supabase } from '@/data/supabase';
import { space } from '@/theme';

type Mode = 'email' | 'phone';

const looksLikeEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
// US numbers only for now, so exactly ten digits.
const looksLikePhone = (v: string) => v.replace(/\D/g, '').length === 10;

/** How long typing has to pause before we say what's missing. */
const SETTLE_MS = 600;

/** Email or phone, one field, Send code. No password. */
export default function Email() {
  const router = useRouter();
  const { actions } = useStore();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);

  const value = mode === 'email' ? email : phone;
  const ready = mode === 'email' ? looksLikeEmail(email) : looksLikePhone(phone);
  // The value typing last paused on; the hint only shows for that, never mid-word.
  const [settled, setSettled] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), SETTLE_MS);
    return () => clearTimeout(t);
  }, [value]);
  const hint = !ready && !!value.trim() && settled === value;
  const send = async () => {
    if (!ready || sending) return;
    if (supabase) {
      setSending(true);
      setFailed(null);
      // A thrown call (no network at all) counts as offline, so the button never spins forever.
      const { error } = await supabase.auth
        .signInWithOtp(mode === 'email' ? { email: email.trim() } : { phone: `+1${phone.replace(/\D/g, '')}` })
        .catch(() => ({ error: { status: undefined } }));
      setSending(false);
      if (error) return setFailed(failureOf(error.status));
    }
    actions.signIn(mode, mode === 'email' ? email.trim() : `+1 ${phone.trim()}`);
    router.push('/code');
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title={mode === 'email' ? 'What’s your email?' : 'What’s your number?'}
      sub={
        mode === 'email'
          ? 'We’ll send a code to make sure it’s you. No password needed.'
          : 'We’ll text you a code to make sure it’s you. No password needed.'
      }
      bottom={
        <>
          {failed ? <ErrorLine text={failText('send the code', failed)} /> : null}
          <ActionPill label="Send code" variant="primary" height="bottom" onPress={send} disabled={!ready} busy={sending} />
        </>
      }
    >
      <Segmented
        accessibilityLabel="Sign in with"
        options={[
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'email' ? (
        <Field
          key="email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoFocus
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={send}
        />
      ) : (
        <View style={styles.phone}>
          {/* Only US numbers for now; picking a country comes later. */}
          <Text accessible accessibilityLabel="Country code, plus 1">
            +1
          </Text>
          <View style={styles.grow}>
            <Field
              key="phone"
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 014-2290"
              autoFocus
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel-national"
              returnKeyType="send"
              onSubmitEditing={send}
            />
          </View>
        </View>
      )}

      {hint ? (
        <Text variant="caption" color="inkMuted" accessibilityLiveRegion="polite">
          {mode === 'email' ? 'Enter a full email address' : 'Enter a 10-digit number'}
        </Text>
      ) : null}
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  phone: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  grow: { flex: 1 },
});
