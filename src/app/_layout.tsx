import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/data/store';
import { color, fontFaces } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontFaces);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Keep the splash screen up until the fonts are ready, so nothing flashes
  // in the system font. If loading fails, carry on with the system font.
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Routes />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

/** Onboarding until it has been finished once, then the app. Scan is shared by both. */
function Routes() {
  const { state } = useStore();
  const onboarded = state.session.onboarded;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surface } }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="kitchen" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="household" />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="import"
          options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
        />
      </Stack.Protected>
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scan-review" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scan-unreadable" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}
