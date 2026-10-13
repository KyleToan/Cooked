import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// One place for every buzz, so the app stays consistent and quiet. Fire these on
// the same frame as the visual change. Web has no haptics; the calls do nothing.
const on = Platform.OS !== 'web';
const run = (p: () => Promise<void>) => {
  if (on) p().catch(() => {});
};

export const haptics = {
  /** Ticking a box, flipping a switch, picking a tab or place, a stepper step. */
  select: () => run(() => Haptics.selectionAsync()),
  /** The shutter. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Something worked that the person waited for: items added, recipe saved. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A wrong code, a link with no recipe. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
