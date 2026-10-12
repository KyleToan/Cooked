import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ErrorLine } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { Canceled, signInWithApple, signInWithGoogle } from '@/data/auth';
import { useStore } from '@/data/store';
import { brand, color, radius, size, space } from '@/theme';

const BUTTON_H = size.controlHeight + space.s1;
const LOGO = 20;

/**
 * Apple, Google, or email or phone with a code. Without a backend sign-in is
 * faked: Apple and Google skip straight to Your name.
 */
export default function SignIn() {
  const router = useRouter();
  const { actions } = useStore();
  const [appleButton, setAppleButton] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleButton);
  }, []);

  const provider = async (method: 'apple' | 'google') => {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    try {
      await (method === 'apple' ? signInWithApple() : signInWithGoogle());
      actions.signIn(method);
      router.push('/name');
    } catch (e) {
      if (!(e instanceof Canceled)) setFailed(method);
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      backIcon="close"
      title="Log in or sign up"
      sub="Pick how you want to get in. Your kitchen stays the same whichever you choose."
      bottom={
        <Text variant="caption" color="inkMuted">
          By continuing, you agree to Cooked’s{' '}
          <Text variant="caption" weight="semibold" color="sageInk" accessibilityRole="link" onPress={() => Linking.openURL('https://cooked.app/terms')}>
            Terms
          </Text>{' '}
          and{' '}
          <Text variant="caption" weight="semibold" color="sageInk" accessibilityRole="link" onPress={() => Linking.openURL('https://cooked.app/privacy')}>
            Privacy Policy
          </Text>
          .
        </Text>
      }
    >
      <View style={styles.buttons}>
        {appleButton ? (
          // Apple's own button, so it always matches Apple's rules.
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
            cornerRadius={BUTTON_H / 2}
            style={styles.apple}
            onPress={() => provider('apple')}
          />
        ) : (
          <Outline label="Continue with Apple" logo={<AppleLogo />} onPress={() => provider('apple')} />
        )}
        <Outline label="Continue with Google" logo={<GoogleLogo />} onPress={() => provider('google')} />
        {failed ? (
          <ErrorLine text={`We couldn’t sign you in with ${failed === 'apple' ? 'Apple' : 'Google'}. Try again, or use email or phone.`} />
        ) : null}
        <View style={styles.or}>
          <View style={styles.rule} />
          <Text variant="caption" color="inkMuted">
            or
          </Text>
          <View style={styles.rule} />
        </View>
        <Outline label="Continue with email or phone" onPress={() => router.push('/email')} />
      </View>
    </OnbScreen>
  );
}

function Outline({ label, logo, onPress }: { label: string; logo?: ReactNode; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={styles.outline}>
      {logo}
      <Text weight="medium" style={styles.outlineLabel}>
        {label}
      </Text>
    </Tap>
  );
}

function AppleLogo() {
  return (
    <Svg width={LOGO} height={LOGO} viewBox="0 0 24 24" fill={brand.apple}>
      <Path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2-1.1 2.8-2.3.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.2 5.9c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
    </Svg>
  );
}

/** Google's "G", in Google's colors as its branding guidelines require. */
function GoogleLogo() {
  return (
    <Svg width={LOGO} height={LOGO} viewBox="0 0 24 24">
      <Path fill={brand.googleBlue} d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7z" />
      <Path fill={brand.googleGreen} d="M12 21.5c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5c1.6 3.1 4.8 5.2 8.5 5.2z" />
      <Path fill={brand.googleYellow} d="M6.7 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.7H3.5C2.8 9 2.5 10.5 2.5 12s.3 3 1 4.3l3.2-2.5z" />
      <Path fill={brand.googleRed} d="M12 6.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 3.5 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.5 7.7l3.2 2.5c.7-2.2 2.8-3.9 5.3-3.9z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: space.s3 },
  apple: { height: BUTTON_H, width: '100%' },
  outline: {
    minHeight: BUTTON_H,
    paddingVertical: space.s2,
    paddingHorizontal: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2 + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  outlineLabel: { flexShrink: 1, textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s1 },
  rule: { flex: 1, height: 1, backgroundColor: color.line },
});
