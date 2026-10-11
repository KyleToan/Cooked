import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PushedHeader, SectionHeader } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/Settings';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { useStore } from '@/data/store';
import type { NotificationKey } from '@/data/types';
import { color, radius, size, space } from '@/theme';

const ROWS: { key: NotificationKey; title: string; sub: string; time?: boolean }[] = [
  { key: 'toBuy', title: 'To Buy changes', sub: 'When someone adds to To Buy while you’re out. Grouped, so you get one buzz, not five.' },
  { key: 'useSoon', title: 'Use-soon nudge', sub: 'Once a day, only if something needs using in the next two days.', time: true },
  { key: 'joins', title: 'Someone joins your kitchen', sub: 'When an invite link is used.' },
  { key: 'weekly', title: 'Weekly kitchen summary', sub: 'Sundays: what got used, what got thrown out.' },
];

/** Tapping the time steps through these. A full time picker can come later. */
const TIMES = ['8:00 am', '12:00 pm', '5:00 pm', '7:00 pm'];
const APP_MARK = 36;

/** Four switches, the nudge's send time, and a preview. Settings only: nothing is sent yet. */
export default function Notifications() {
  const router = useRouter();
  const { state, actions } = useStore();
  const n = state.notifications;

  const preview = n.toBuy
    ? 'Sam added tomatoes, feta and 1 more to To Buy.'
    : n.useSoon
      ? 'Spinach and chicken thighs need using by tomorrow.'
      : 'Notifications are off. Cooked will stay quiet.';

  const nextTime = () => {
    const i = TIMES.indexOf(n.useSoonTime);
    actions.setUseSoonTime(TIMES[(i + 1) % TIMES.length]);
  };

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
          <SwitchRow key={r.key} title={r.title} description={r.sub} value={n[r.key]} onChange={(on) => actions.setNotification(r.key, on)}>
            {r.time ? (
              <View style={styles.time}>
                <Text variant="caption" color="inkMuted">
                  Send it at
                </Text>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`Send it at ${n.useSoonTime}`}
                  accessibilityHint="Changes the time"
                  onPress={nextTime}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, gap: 2 },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: {
    height: size.targetMin - space.s2,
    paddingHorizontal: space.s3 + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
    justifyContent: 'center',
  },
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
