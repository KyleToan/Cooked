import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { NOTE_TILT, PAPER, PaperNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { PLACE_LABEL, PLACES } from '@/data/helpers';
import { useStore } from '@/data/store';
import { space } from '@/theme';

/** What the first scan put away, To Buy empty, Go to my kitchen. */
export default function Ready() {
  const { state, actions } = useStore();
  const scan = state.session.lastScan;
  const count = PLACES.reduce((n, p) => n + scan[p].length, 0);

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
      bottom={<ActionPill label="Go to my kitchen" variant="primary" height="bottom" onPress={actions.finishOnboarding} />}
    >
      {count ? (
        <View style={styles.notes}>
          {PLACES.map((p) => (
            <PaperNote
              key={p}
              label={PLACE_LABEL[p]}
              body={scan[p].map((n) => n.toLowerCase()).join(', ')}
              paper={PAPER[p]}
              tilt={NOTE_TILT[p]}
            />
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
  notes: { flexDirection: 'row', gap: space.s3, paddingTop: space.s2 + 2, paddingHorizontal: 2, paddingBottom: space.s1, marginVertical: space.s2 },
});
