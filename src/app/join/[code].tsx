import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { rememberInvite } from '@/data/pendingInvite';
import { useStore } from '@/data/store';
import { useColors } from '@/theme';

/**
 * An invite link opened on the phone. Before onboarding, the code waits for Who do you cook with,
 * which then starts on I have an invite with the code filled in. Already in a kitchen, it opens Home:
 * switching kitchens from a link isn't designed yet.
 */
export default function InviteLink() {
  const router = useRouter();
  const color = useColors();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { state } = useStore();
  const onboarded = state.session.onboarded;

  useEffect(() => {
    if (!onboarded && code) rememberInvite(code);
    // Before onboarding, Home is behind the guard, so start at Welcome.
    router.replace(onboarded ? '/' : '/welcome');
  }, [code, onboarded, router]);

  return <View style={{ flex: 1, backgroundColor: color.surface }} />;
}
