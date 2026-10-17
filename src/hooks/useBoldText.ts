import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// iOS's Bold Text setting. One shared listener, since every Text reads it.
let bold = false;
const listeners = new Set<() => void>();
const set = (on: boolean) => {
  bold = on;
  listeners.forEach((l) => l());
};
AccessibilityInfo.isBoldTextEnabled?.().then(set, () => {});
AccessibilityInfo.addEventListener?.('boldTextChanged', set);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True while Settings › Accessibility › Bold Text is on (always false off iOS). */
export const useBoldText = () => useSyncExternalStore(subscribe, () => bold, () => false);
