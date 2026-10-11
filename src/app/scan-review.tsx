import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { PushedHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { CheckItemRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { joinAnd, scanFlow } from '@/data/helpers';
import { SAMPLE_SCAN } from '@/data/seed';
import { useStore } from '@/data/store';
import type { ScanLine } from '@/data/types';
import { useGoToTab } from '@/hooks/useGoToTab';
import { useLayoutMotion } from '@/hooks/useLayoutMotion';
import { color, radius, size, space } from '@/theme';

/** "We found 7 items": fix names, move things, change amounts, then put it all away. */
export default function ScanReview() {
  const router = useRouter();
  const goToTab = useGoToTab();
  const animate = useLayoutMotion();
  const flow = scanFlow(useLocalSearchParams<{ flow?: string }>().flow);
  const { state, actions } = useStore();
  const [lines, setLines] = useState<ScanLine[]>(SAMPLE_SCAN);
  const [open, setOpen] = useState<string | null>(null);

  const keep = lines.filter((l) => l.place !== 'skip');
  // Things on the To Buy list that this receipt covers (only shown in the app, not onboarding).
  const onList =
    flow === 'app'
      ? state.toBuy.filter((t) => keep.some((l) => l.name.trim().toLowerCase() === t.name.toLowerCase())).map((t) => t.name)
      : [];

  const add = () => {
    actions.addScanned(lines);
    if (flow === 'app') {
      goToTab('/');
    } else {
      // Back to onboarding, then on to the next step.
      router.dismissAll();
      router.push(flow === 'onb' ? '/invite' : '/ready');
    }
  };

  return (
    <Screen
      gap={space.s4 + 2}
      footer={
        <>
          <ActionPill label={`Add ${keep.length} items to your kitchen`} variant="primary" height="bottom" onPress={add} />
          <TextLink label="Retake photo" align="center" onPress={() => router.back()} />
        </>
      }
    >
      <PushedHeader title={`We found ${lines.length} items`} onBack={() => router.back()} backLabel="Back to camera" />
      <Text variant="button" weight="regular" color="inkMuted">
        Corner Market · today, 6:42 pm. Tap a name to fix it, or a place to move it.
      </Text>

      {onList.length ? (
        <View style={styles.note}>
          <Icon name="check" size={size.iconSm} color="sageInk" />
          <Text variant="caption" style={styles.grow}>
            {onList.length === 1
              ? `${onList[0]} was on your To Buy list. We’ll tick it off.`
              : `${joinAnd(onList)} were on your To Buy list. We’ll tick them off.`}
          </Text>
        </View>
      ) : null}

      <View>
        {lines.map((line) => (
          <CheckItemRow
            key={line.id}
            line={line}
            open={open === line.id}
            onToggleOpen={() => {
              animate();
              setOpen(open === line.id ? null : line.id);
            }}
            onChange={(next) => setLines((ls) => ls.map((l) => (l.id === next.id ? next : l)))}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2 + 2,
    paddingVertical: space.s3,
    paddingHorizontal: space.s3 + 2,
    borderRadius: radius.control,
    backgroundColor: color.surfaceSunken,
  },
});
