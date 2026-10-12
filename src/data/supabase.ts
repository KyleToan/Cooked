import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Without the env vars there is no backend: supabase is null and the app runs in its local fake mode (code 481726).
export const supabase = url && key
  ? createClient(url, key, {
      auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;

export const hasBackend = supabase !== null;

// Refresh the session only while the app is in the foreground, as Supabase's React Native guide does.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
