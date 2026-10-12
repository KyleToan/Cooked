import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine } from '@/components/Controls';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/Settings';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { failText, type Failure } from '@/data/errors';
import { parseClock } from '@/data/helpers';
import { failure, saveNotifications } from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import type { NotificationKey } from '@/data/types';
import { color, radius, size, space } from '@/theme';

const ROWS: { key: NotificationKey; title: string; sub: string; time?: boolean }[] = [
  { key: 'toBuy', title: 'To Buy changes', sub: 'When someone adds to To Buy while you’re out. Grouped, so you get one buzz, not five.' },
  { key: 'useSoon', title: 'Use-soon nudge', sub: 'Once a day, only if something needs using in the next two days.', time: true },
  { key: 'joins', title: 'Someone joins your kitchen', sub: 'When an invite link is used.' },
  { key: 'weekly', title: 'Weekly kitchen summary', sub: 'Sundays: what got used, what got thrown out.' },
];

/** The web has no time picker or notification permission; there the time steps through these. */
const WEB_TIMES = ['8:00 am', '12:00 pm', '5:00 pm', '7:00 pm'];
const APP_MARK = 36;

/** What iOS or Android allows. `unsupported` is the web, where the switches are only saved settings. */
type Permission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

function toPermission(p: Notifications.NotificationPermissionsStatus): Permission {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** "7:30 pm" -> a Date today at 19:30. Falls back to 5:00 pm if the string doesn't parse. */
function parseTime(text: string): Date {
  const d = new Date();
  d.setHours(...parseClock(text), 0, 0);
  return d;
}

/** A Date -> "7:30 pm", the format the store has always kept. */
function formatTime(d: Date): string {
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Four switches, the nudge's send time, and a preview. Switching one on asks the system for permission. */
export default function NotificationsScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const n = state.notifications;
  const [permission, setPermission] = useState<Permission>(native ? 'undetermined' : 'unsupported');
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(n.useSoonTime));
  const [saveFailed, setSaveFailed] = useState<Failure | null>(null);

  // Save every change to the profile (stored only; nothing is sent). Skips the settings as the screen opened with.
  const opened = useRef(n);
  useEffect(() => {
    if (!hasBackend || n === opened.current) return;
    saveNotifications(n).then((r) => setSaveFailed(failure(r)));
  }, [n]);

  // Read the permission on open, and again when coming back from the Settings app.
  const refresh = useCallback(() => {
    if (!native) return;
    Notifications.getPermissionsAsync()
      .then((p) => setPermission(toPermission(p)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // A switch only shows on if the system will actually let Cooked notify.
  const allowed = permission === 'granted' || permission === 'unsupported';
  const isOn = (key: NotificationKey) => allowed && n[key];

  const toggle = async (key: NotificationKey, on: boolean) => {
    if (!on || allowed) {
      actions.setNotification(key, on);
      return;
    }
    if (permission === 'denied') return; // The line under the list says where to turn them on.
    try {
      // Android 13+ only shows the prompt once a channel exists.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Cooked',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const next = toPermission(await Notifications.requestPermissionsAsync());
      setPermission(next === 'undetermined' ? 'denied' : next);
      if (next === 'granted') actions.setNotification(key, true);
    } catch {
      setPermission('denied');
    }
  };

  const openTime = () => {
    const value = parseTime(n.useSoonTime);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        onValueChange: (_e, d) => actions.setUseSoonTime(formatTime(d)),
      });
    } else if (Platform.OS === 'ios') {
      setDraft(value);
      setPicking(true);
    } else {
      const i = WEB_TIMES.indexOf(n.useSoonTime);
      actions.setUseSoonTime(WEB_TIMES[(i + 1) % WEB_TIMES.length]);
    }
  };

  const preview = isOn('toBuy')
    ? 'Sam added tomatoes, feta and 1 more to To Buy.'
    : isOn('useSoon')
      ? 'Spinach and chicken thighs need using by tomorrow.'
      : 'Notifications are off. Cooked will stay quiet.';

  return (
    <Screen>
      <PushedHeader
        title="Notifications"
        onBack={() => router.back()}
        backLabel="Back to account"
        below={
          <Text variant="caption" color="inkMuted">
            Cooked only buzzes for things you can act on. Everything else waits in the app.
          </Text>
        }
      />

      <View>
        {ROWS.map((r) => (
          <SwitchRow key={r.key} title={r.title} description={r.sub} value={isOn(r.key)} onChange={(on) => toggle(r.key, on)}>
            {r.time ? (
              <View style={styles.time}>
                <Text variant="caption" color="inkMuted">
                  Send it at
                </Text>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`Send it at ${n.useSoonTime}`}
                  accessibilityHint="Opens a time picker"
                  onPress={openTime}
                  style={styles.timePill}
                >
                  <Text variant="button" weight="semibold">
                    {n.useSoonTime}
                  </Text>
                </Tap>
              </View>
            ) : null}
          </SwitchRow>
        ))}
        {permission === 'denied' ? (
          <View accessibilityRole="alert" style={styles.blocked}>
            <Text variant="caption" color="inkMuted" style={styles.grow}>
              Notifications are off for Cooked in Settings.
            </Text>
            <TextLink label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />
          </View>
        ) : null}
        {saveFailed ? <ErrorLine text={failText('save that', saveFailed)} /> : null}
        <Text variant="caption" color="inkMuted" style={styles.honest}>
          To Buy changes and joins start once your kitchen syncs. Until then, those two are only saved.
        </Text>
      </View>

      <View style={styles.preview}>
        <SectionHeader title="What it looks like" />
        <View style={styles.card}>
          <View style={styles.mark}>
            <Text variant="sectionTitle">C</Text>
          </View>
          <View style={styles.grow}>
            <View style={styles.cardTop}>
              <Text variant="link">Cooked</Text>
              <Text variant="micro" weight="regular" color="inkMuted">
                now
              </Text>
            </View>
            <Text variant="caption">{preview}</Text>
          </View>
        </View>
      </View>

      {Platform.OS === 'ios' ? (
        <Sheet visible={picking} onClose={() => setPicking(false)} title="Send the nudge at">
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            themeVariant="light"
            textColor={color.ink}
            onValueChange={(_e, d) => setDraft(d)}
            style={styles.picker}
          />
          <ActionPill
            label="Done"
            variant="primary"
            height="bottom"
            onPress={() => {
              actions.setUseSoonTime(formatTime(draft));
              setPicking(false);
            }}
          />
        </Sheet>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, gap: 2 },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: {
    minHeight: size.targetMin,
    paddingVertical: space.s1,
    paddingHorizontal: space.s3 + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
    justifyContent: 'center',
  },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingTop: space.s2 },
  honest: { paddingTop: space.s2 },
  picker: { alignSelf: 'stretch' },
  preview: { gap: space.s2 + 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingHorizontal: space.s3 + 2,
    borderRadius: radius.field + 2,
    backgroundColor: color.surfaceSunken,
  },
  mark: { width: APP_MARK, height: APP_MARK, borderRadius: radius.check + 2, backgroundColor: color.sage, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
