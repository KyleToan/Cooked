import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { PushedHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { CheckItemRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { joinAnd, scanFlow } from '@/data/helpers';
import { lastScan } from '@/data/ocr';
import { useStore } from '@/data/store';
import type { ScanLine } from '@/data/types';
import { haptics } from '@/hooks/haptics';
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
  // What the scan read, kept so edits can be told apart from it.
  const [read] = useState(lastScan.lines);
  const [lines, setLines] = useState<ScanLine[]>(read);
  const [open, setOpen] = useState<string | null>(null);

  // Leaving (back arrow, Retake photo, Android back) throws the edits away, so ask once if
  // anything was renamed, moved or recounted. Adding the items leaves without asking.
  const navigation = useNavigation();
  const edited = lines.some((l, i) => {
    const o = read[i];
    return !o || l.id !== o.id || l.name !== o.name || l.place !== o.place || l.qty !== o.qty;
  });
  const guard = useRef({ edited, leaving: false });
  useEffect(() => {
    guard.current.edited = edited;
  }, [edited]);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!guard.current.edited || guard.current.leaving) return;
        e.preventDefault();
        const leave = () => {
          guard.current.leaving = true;
          navigation.dispatch(e.data.action);
        };
        if (Platform.OS === 'web') {
          // React Native Web has no Alert.
          if (window.confirm('Discard your changes?')) leave();
          return;
        }
        Alert.alert('Discard your changes?', 'The names, places and amounts you changed won’t be kept.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: leave },
        ]);
      }),
    [navigation],
  );

  const keep = lines.filter((l) => l.place !== 'skip');
  // Things on the To Buy list that this receipt covers (only shown in the app, not onboarding).
  const onList =
    flow === 'app'
      ? state.toBuy.filter((t) => keep.some((l) => l.name.trim().toLowerCase() === t.name.toLowerCase())).map((t) => t.name)
      : [];

  const add = () => {
    guard.current.leaving = true;
    // In the app, Home shows "Added N items to your kitchen" with Undo; onboarding moves on to the next step.
    actions.addScanned(lines, { undo: flow === 'app' });
    haptics.success();
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
      {/* Retake photo (under the button) goes back to the camera; the arrow leaves the scan altogether. */}
      <PushedHeader title={`We found ${lines.length} items`} onBack={() => router.dismiss(2)} backLabel="Close scan" />
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
