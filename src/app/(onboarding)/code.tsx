import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ErrorLine } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { failText, failureOf, type Failure } from '@/data/errors';
import { useStore } from '@/data/store';
import { supabase } from '@/data/supabase';
import { haptics } from '@/hooks/haptics';
import { makeStyles, radius, size, space, type } from '@/theme';

/** Without a backend sign-in is faked: this is the only code that works. */
const CODE = '481726';
const LENGTH = 6;
const FIRST_WAIT = 24;
const RESEND_WAIT = 30;
const CARET_H = 24;
/** Box height at the default text size; the boxes grow taller with larger text. */
const BOX_H = size.controlHeight + space.s3 - 2;
/** Six boxes share the width, so the digits grow with Dynamic Type only as far as a box can hold them. */
const DIGIT_MAX_SCALE = 1.4;
/** A wrong code shakes the boxes: three short side-to-side cycles. */
const SHAKE = 6;
const SHAKE_STEP = 45;

/** Six boxes, "Sent to … · Change", the resend timer, and the wrong-code state. */
export default function Code() {
  const styles = useStyles();
  const router = useRouter();
  const { state } = useStore();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [trouble, setTrouble] = useState<Failure | null>(null);
  const [checking, setChecking] = useState(false);
  const [secs, setSecs] = useState(FIRST_WAIT);
  const [focused, setFocused] = useState(true);
  const reduced = useReducedMotion();
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const shake = () => {
    if (reduced) return;
    const step = (to: number) => withTiming(to, { duration: SHAKE_STEP, easing: Easing.inOut(Easing.quad) });
    shakeX.set(withSequence(step(-SHAKE), step(SHAKE), step(-SHAKE), step(SHAKE), step(-SHAKE / 2), step(SHAKE / 2), step(0)));
  };

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const contact = state.session.contact;
  const byText = state.session.signIn === 'phone';
  // The store keeps the phone number as shown ("+1 555…"); Supabase wants E.164.
  const phone = `+${contact.replace(/\D/g, '')}`;

  const failed = (why: 'wrong' | Failure) => {
    const isWrong = why === 'wrong';
    setWrong(isWrong);
    setTrouble(isWrong ? null : why);
    setCode('');
    haptics.error();
    if (isWrong) shake();
  };

  const check = async (digits: string) => {
    if (!supabase) return digits === CODE ? router.push('/name') : failed('wrong');
    setChecking(true);
    // A thrown call (no network at all) counts as offline, so the boxes never stay locked.
    const { error } = await supabase.auth
      .verifyOtp(byText ? { phone, token: digits, type: 'sms' } : { email: contact, token: digits, type: 'email' })
      .catch(() => ({ error: { status: undefined } }));
    setChecking(false);
    if (!error) return router.push('/name');
    // A 4xx means the code was wrong or expired; no status is the network, a 5xx is the server.
    failed(error.status && error.status < 500 ? 'wrong' : failureOf(error.status));
  };

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, LENGTH);
    if (checking) return;
    setCode(digits);
    if (digits.length) {
      setWrong(false);
      setTrouble(null);
    }
    if (digits.length === LENGTH) check(digits);
  };

  const resend = () => {
    supabase?.auth.signInWithOtp(byText ? { phone } : { email: contact }).then(({ error }) => error && setTrouble(failureOf(error.status)));
    setSecs(RESEND_WAIT);
    setWrong(false);
    setTrouble(null);
    setCode('');
    input.current?.focus();
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Enter the code"
      bottom={
        <View style={styles.timer}>
          {secs > 0 ? (
            <Text variant="caption" color="inkMuted" accessibilityLiveRegion="polite">
              Send a new code in 0:{String(secs).padStart(2, '0')}
            </Text>
          ) : (
            <TextLink label="Send a new code" align="center" onPress={resend} />
          )}
        </View>
      }
    >
      <View style={styles.group}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`6-digit code, ${code.length} entered`}
          onPress={() => input.current?.focus()}
        >
          <Animated.View style={[styles.boxes, shakeStyle]}>
            {Array.from({ length: LENGTH }, (_, i) => {
              const current = focused && i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    wrong ? styles.boxWrong : current ? styles.boxCurrent : null,
                  ]}
                >
                  {code[i] ? (
                    <Text variant="sectionTitle" style={styles.digit} maxFontSizeMultiplier={DIGIT_MAX_SCALE}>
                      {code[i]}
                    </Text>
                  ) : current && !wrong ? (
                    <View style={styles.caret} />
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        </Pressable>
        {/* The real input: the system number pad, with iOS offering the code from Mail or Messages. */}
        <TextInput
          ref={input}
          value={code}
          onChangeText={onChange}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          caretHidden
          style={styles.hidden}
          accessibilityLabel="6-digit code"
        />
        {wrong ? <ErrorLine text={`That code didn’t work. Use the newest ${byText ? 'text' : 'email'}.`} /> : null}
        {trouble ? <ErrorLine text={failText('check the code', trouble)} /> : null}
        <View style={styles.sent}>
          <Text variant="caption" color="inkMuted">
            Sent to {contact || (byText ? 'your phone' : 'your email')} ·{' '}
          </Text>
          <Tap accessibilityRole="link" accessibilityLabel={`Change ${byText ? 'number' : 'email'}`} onPress={() => router.back()} style={styles.change}>
            <Text variant="caption" weight="semibold" color="sageInk">
              Change
            </Text>
          </Tap>
        </View>
      </View>
    </OnbScreen>
  );
}

const useStyles = makeStyles((color) => ({
  group: { gap: space.cozy },
  boxes: { flexDirection: 'row', gap: space.cozy },
  box: {
    flex: 1,
    minHeight: BOX_H,
    paddingVertical: space.s1,
    borderRadius: radius.check + space.s1 + 1,
    borderWidth: 1,
    borderColor: color.controlLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxCurrent: { borderWidth: 1.5, borderColor: color.sageInk },
  boxWrong: { borderWidth: 1.5, borderColor: color.errorInk },
  digit: { fontFamily: type.link.fontFamily, fontVariant: ['tabular-nums'] },
  caret: { width: 2, height: CARET_H, backgroundColor: color.ink },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  sent: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  change: { minHeight: size.targetMin, justifyContent: 'center' },
  timer: { minHeight: size.targetMin, alignItems: 'center', justifyContent: 'center' },
}));
