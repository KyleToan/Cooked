import { Stack } from 'expo-router';

import { color } from '@/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      initialRouteName="welcome"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surface } }}
    />
  );
}
