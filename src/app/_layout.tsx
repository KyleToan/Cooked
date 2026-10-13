// localStorage on iOS and Android, backed by SQLite; the store loads the saved kitchen from it.
import 'expo-sqlite/localStorage/install';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CookingLoader } from '@/components/Loader';
import { Text } from '@/components/Text';
import { StoreProvider, useStore } from '@/data/store';
import { useLocalNotifications } from '@/hooks/useLocalNotifications';
import { color, fontFaces, space } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Native builds bundle the fonts (expo-font plugin in app.json), so this is already loaded there;
  // it only loads them in Expo Go and on web.
  const [loaded, error] = useFonts(fontFaces);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Keep the splash screen up until the fonts are ready, so nothing flashes
  // in the system font. If loading fails, carry on with the system font.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Routes />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Onboarding until it has been finished once, then the app. Scan is shared by both. */
function Routes() {
  const { state, ready } = useStore();
  const onboarded = state.session.onboarded;
  useLocalNotifications(state);

  // Restoring the saved Supabase session and loading its kitchen on launch; instant without a backend.
  if (!ready) {
    return (
      <View style={styles.loading} accessibilityLabel="Loading">
        <CookingLoader />
        <Text color="inkMuted">Opening your kitchen…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.surface } }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="household" />
        <Stack.Screen name="notifications" />
        {/* The Sheet slides itself in and out (and holds the route until it has slid away), so the
            screen transition stays off and nothing pops. */}
        <Stack.Screen
          name="import"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Protected>
      {/* Invite links: stores the code for onboarding's Join, then redirects. */}
      <Stack.Screen name="join/[code]" />
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scan-review" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scan-unreadable" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s4, backgroundColor: color.surface },
});
