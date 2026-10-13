import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useReducedMotion, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { NOTE_TILT, PAPER, PaperNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { PLACE_LABEL, PLACES } from '@/data/helpers';
import { failText, type Failure } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import { haptics } from '@/hooks/haptics';
import { space } from '@/theme';

/** The notes drop onto the door in turn: from 24pt up, a slightly soft spring, 60ms apart. */
const DROP = { duration: 400, dampingRatio: 0.8, reduceMotion: ReduceMotion.System } as const;
const DROP_FROM = -24;
const STAGGER = 60;
const FADE = 200;
/** When the last note has landed (its delay plus most of the spring). */
const LANDED = STAGGER * 2 + 300;

const drop = (delay: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: DROP_FROM }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: FADE })),
      transform: [{ translateY: withDelay(delay, withSpring(0, DROP)) }],
    },
  };
};

/** What the first scan put away, To Buy empty, Go to my kitchen. */
export default function Ready() {
  const { state, actions } = useStore();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const scan = state.session.lastScan;
  const count = PLACES.reduce((n, p) => n + scan[p].length, 0);
  const reduced = useReducedMotion();

  // One buzz as the last note lands; with Reduce Motion the notes are already there.
  useEffect(() => {
    if (!count) return;
    const t = setTimeout(haptics.success, reduced ? 0 : LANDED);
    return () => clearTimeout(t);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    if (hasBackend) {
      if (busy) return;
      setBusy(true);
      const r = await api.finishOnboarding();
      setBusy(false);
      setFailed(api.failure(r));
      if (r !== 'ok') return;
    }
    actions.finishOnboarding();
  };

  return (
    <OnbScreen
      topSpace={space.section * 3}
      title={`Your kitchen is ready, ${state.user.name}`}
      sub={
        count
          ? `We put away ${count} things from your receipt. You can move anything later from Your Kitchen.`
          : 'Scan your next grocery receipt and Cooked puts each item in the fridge, pantry or freezer for you.'
      }
      // Finishing onboarding opens Home.
      bottom={
        <>
          {failed ? <ErrorLine text={failText('finish setting up', failed)} /> : null}
          <ActionPill label="Go to my kitchen" variant="primary" height="bottom" onPress={finish} busy={busy} />
        </>
      }
    >
      {count ? (
        <View style={styles.notes}>
          {PLACES.map((p, i) => (
            <Animated.View key={p} entering={reduced ? undefined : drop(i * STAGGER)} style={styles.drop}>
              <PaperNote
                label={PLACE_LABEL[p]}
                body={scan[p].map((n) => n.toLowerCase()).join(', ')}
                paper={PAPER[p]}
                tilt={NOTE_TILT[p]}
              />
            </Animated.View>
          ))}
        </View>
      ) : null}
      <Text variant="button" weight="regular" color="inkMuted">
        To Buy is empty for now. Add the first thing you run out of from Home.
      </Text>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  drop: { flex: 1 },
  notes: { flexDirection: 'row', gap: space.s3, paddingTop: space.cozy, paddingHorizontal: 2, paddingBottom: space.s1, marginVertical: space.s2 },
});
