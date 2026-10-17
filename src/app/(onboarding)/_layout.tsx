import { Stack } from 'expo-router';

import { useColors } from '@/theme';

export default function OnboardingLayout() {
  const color = useColors();
  return (
    <Stack
      initialRouteName="welcome"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surface } }}
    />
  );
}
