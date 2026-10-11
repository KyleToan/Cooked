import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ErrorLine } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { useStore } from '@/data/store';
import { color, radius, size, space, type } from '@/theme';

/** Sign-in is faked: this is the only code that works. */
const CODE = '481726';
const LENGTH = 6;
const FIRST_WAIT = 24;
const RESEND_WAIT = 30;
const CARET_H = 24;

/** Six boxes, "Sent to … · Change", the resend timer, and the wrong-code state. */
export default function Code() {
  const router = useRouter();
  const { state } = useStore();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [secs, setSecs] = useState(FIRST_WAIT);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const contact = state.session.contact || 'alex.rivera@gmail.com';
  const byText = state.session.signIn === 'phone';

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length) setWrong(false);
    if (digits.length === LENGTH) {
      if (digits === CODE) {
        router.push('/name');
      } else {
        setWrong(true);
        setCode('');
      }
    }
  };

  const resend = () => {
    setSecs(RESEND_WAIT);
    setWrong(false);
    setCode('');
    input.current?.focus();
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Enter the code"
      bottom={
        <View style={styles.timer}>
          {secs > 0 && !wrong ? (
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
          style={styles.boxes}
        >
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
                  <Text variant="sectionTitle" style={styles.digit}>
                    {code[i]}
                  </Text>
                ) : current && !wrong ? (
                  <View style={styles.caret} />
                ) : null}
              </View>
            );
          })}
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
        <View style={styles.sent}>
          <Text variant="caption" color="inkMuted">
            Sent to {contact} ·{' '}
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

const styles = StyleSheet.create({
  group: { gap: space.s2 + 2 },
  boxes: { flexDirection: 'row', gap: space.s2 + 2 },
  box: {
    flex: 1,
    height: size.controlHeight + space.s3 - 2,
    borderRadius: radius.check + space.s1 + 1,
    borderWidth: 1,
    borderColor: color.line,
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
});
