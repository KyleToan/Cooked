// Light, dark or match the phone: a setting for this phone, not the account, so it stays through log out.
// Saved in `localStorage` (expo-sqlite's on iOS and Android, the browser's on web).

import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

export type AppearancePref = 'system' | 'light' | 'dark';

const KEY = 'cooked.appearance';
const listeners = new Set<() => void>();
let pref: AppearancePref | null = null;

/** Also tells iOS and Android, so system pieces (keyboard, date pickers, alerts) match the app. */
function apply(p: AppearancePref) {
  if (Platform.OS !== 'web') Appearance.setColorScheme(p === 'system' ? 'unspecified' : p);
}

function current(): AppearancePref {
  if (pref === null) {
    // localStorage is missing in tests, and a storage error must never stop the app opening.
    let saved: string | null = null;
    try {
      saved = globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {}
    pref = saved === 'light' || saved === 'dark' ? saved : 'system';
    if (pref !== 'system') apply(pref);
  }
  return pref;
}

export function setAppearance(p: AppearancePref) {
  pref = p;
  apply(p);
  try {
    globalThis.localStorage?.setItem(KEY, p);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The person's choice in Account or onboarding. `system` follows the phone. */
export function useAppearance(): AppearancePref {
  return useSyncExternalStore(subscribe, current, current);
}
