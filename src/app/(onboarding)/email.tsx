import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field, Segmented } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Text } from '@/components/Text';
import { useStore } from '@/data/store';
import { supabase } from '@/data/supabase';
import { color, radius, size, space } from '@/theme';

type Mode = 'email' | 'phone';

const looksLikeEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
const looksLikePhone = (v: string) => v.replace(/\D/g, '').length >= 7;

/** Email or phone, one field, Send code. No password. */
export default function Email() {
  const router = useRouter();
  const { actions } = useStore();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = mode === 'email' ? looksLikeEmail(email) : looksLikePhone(phone);
  const send = async () => {
    if (!ready || sending) return;
    if (supabase) {
      setSending(true);
      setFailed(false);
      const { error } = await supabase.auth.signInWithOtp(
        mode === 'email' ? { email: email.trim() } : { phone: `+1${phone.replace(/\D/g, '')}` },
      );
      setSending(false);
      if (error) return setFailed(true);
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
          <View style={styles.country} accessibilityLabel="Country code, plus 1">
            <Text>+1</Text>
          </View>
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

      {failed ? <ErrorLine text="We couldn’t send the code. Check your connection and try again." /> : null}

      <ActionPill label="Send code" variant="primary" height="bottom" onPress={send} disabled={!ready || sending} />
    </OnbScreen>
  );
}

const COUNTRY_W = 92;

const styles = StyleSheet.create({
  phone: { flexDirection: 'row', gap: space.s2 + 2 },
  grow: { flex: 1 },
  country: {
    width: COUNTRY_W,
    // Grows with the phone field beside it at large text sizes.
    minHeight: size.controlHeight + space.s3 - 2,
    paddingVertical: space.s1,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.controlLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
