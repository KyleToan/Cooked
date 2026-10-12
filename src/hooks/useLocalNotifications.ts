import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { nextAt, nudgeText, weeklyText } from '@/data/helpers';
import type { State } from '@/data/store';
import type { Item, NotificationSettings, ToBuyItem } from '@/data/types';

/** When the Sunday summary goes out (Decisions.md #97). */
const WEEKLY_TIME = '10:00 am';
const SUNDAY = 0;

const native = Platform.OS === 'ios' || Platform.OS === 'android';

if (native) {
  // Show the nudge even if Cooked happens to be open when it fires.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Runs one at a time, so a quick run of kitchen changes can't leave two nudges scheduled. */
let queue = Promise.resolve();

async function reschedule(items: Item[], toBuy: ToBuyItem[], n: NotificationSettings, onboarded: boolean) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const p = await Notifications.getPermissionsAsync();
  const allowed = p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!allowed || !onboarded) return;
  const soon = nudgeText(items);
  if (n.useSoon && soon) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Cooked', body: soon },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextAt(n.useSoonTime) },
    });
  }
  if (n.weekly) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Cooked', body: weeklyText(items, toBuy) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextAt(WEEKLY_TIME, new Date(), SUNDAY) },
    });
  }
}

/**
 * Keeps the use-soon nudge and the Sunday summary scheduled on the phone, from the kitchen as it is
 * now: on open, on going to the background, and whenever the kitchen or the settings change.
 * To Buy changes and joins need a server, so they aren't sent yet. Does nothing on the web.
 */
export function useLocalNotifications({ items, toBuy, notifications, session }: State) {
  const onboarded = session.onboarded;

  useEffect(() => {
    if (!native) return;
    const run = () => {
      queue = queue.then(() => reschedule(items, toBuy, notifications, onboarded)).catch(() => {});
    };
    run();
    const sub = AppState.addEventListener('change', (a) => {
      if (a === 'background') run();
    });
    return () => sub.remove();
  }, [items, toBuy, notifications, onboarded]);
}
