import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ActionPill } from '@/components/ActionPill';
import { Icon } from '@/components/Icon';
import { useRowLayout } from '@/components/Controls';
import { CheckItemRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { count, joinAnd, scanFlow } from '@/data/helpers';
import { lastScan } from '@/data/ocr';
import { useStore } from '@/data/store';
import type { ScanLine } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { useGoToTab } from '@/hooks/useGoToTab';
import { makeStyles, radius, size, space, type } from '@/theme';

/** "6:42 pm", as Notifications writes times. */
function formatTime(d: Date): string {
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "7 items to put away": fix names, move things, change amounts, then put it all away. */
export default function ScanReview() {
  const styles = useStyles();
  const rowLayout = useRowLayout();
  const router = useRouter();
  const goToTab = useGoToTab();
  const flow = scanFlow(useLocalSearchParams<{ flow?: string }>().flow);
  const { state, actions } = useStore();
  // What the scan read, kept so edits can be told apart from it.
  const [read] = useState(lastScan.lines);
  const [{ store, at }] = useState(lastScan);
  const [lines, setLines] = useState<ScanLine[]>(read);
  const [open, setOpen] = useState<string | null>(null);

  // Leaving (close cross, Retake photo, Android back) throws the edits away, so ask once if
  // anything was renamed, moved or recounted. Adding the items leaves without asking.
  const navigation = useNavigation();
  const [discarding, setDiscarding] = useState(false);
  const pending = useRef<{ type: string } | null>(null);
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
        // Held until the sheet's Discard changes, then sent on.
        pending.current = e.data.action;
        setDiscarding(true);
      }),
    [navigation],
  );

  const discard = () => {
    const action = pending.current;
    if (!action) return;
    guard.current.leaving = true;
    setDiscarding(false);
    navigation.dispatch(action);
  };

  const keep = lines.filter((l) => l.place !== 'skip');
  const skipped = lines.length - keep.length;
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

  // Opened without a scan (an app reload or a link): back to the camera.
  if (!read.length) return <Redirect href={{ pathname: '/scan', params: { flow } }} />;

  return (
    <Screen
      gap={space.s4 + 2}
      footer={
        <>
          <ActionPill
            label={keep.length ? `Add ${count(keep.length, 'item')} to your kitchen` : 'Nothing to add'}
            variant="primary"
            height="bottom"
            onPress={add}
            disabled={!keep.length}
          />
          <TextLink label="Retake photo" align="center" onPress={() => router.back()} />
        </>
      }
    >
      {/* Retake photo (under the button) goes back to the camera; the cross leaves the scan altogether. */}
      <View style={styles.titleRow}>
        <Tap accessibilityRole="button" accessibilityLabel="Close scan" onPress={() => router.dismiss(2)} style={styles.close}>
          <Icon name="close" />
        </Tap>
        <Text variant="titleLg" accessibilityRole="header" style={styles.title}>
          {`${count(keep.length, 'item')} to put away`}
        </Text>
      </View>
      <View style={styles.captions}>
        <Text variant="button" weight="regular" color="inkMuted">
          {store ? `${store} · today, ${formatTime(at)}` : `Today, ${formatTime(at)}`}. Tap a name to fix it, or a place to move it.
        </Text>
        {skipped ? (
          <Text variant="caption" color="inkMuted">
            {count(skipped, 'line')} skipped
          </Text>
        ) : null}
      </View>

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
          <Animated.View key={line.id} layout={rowLayout}>
            <CheckItemRow
              line={line}
              open={open === line.id}
              onToggleOpen={() => setOpen(open === line.id ? null : line.id)}
              onChange={(next) => setLines((ls) => ls.map((l) => (l.id === next.id ? next : l)))}
            />
          </Animated.View>
        ))}
      </View>

      <Sheet visible={discarding} onClose={() => setDiscarding(false)} showClose={false} title="Discard your changes?">
        <Text variant="button" weight="regular" color="inkMuted">
          The names, places and amounts you changed won’t be kept.
        </Text>
        <ActionPill label="Keep editing" variant="primary" height="bottom" onPress={() => setDiscarding(false)} />
        <TextLink label="Discard changes" color="errorInk" variant="button" align="center" onPress={discard} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((color) => ({
  grow: { flex: 1 },
  // The pushed header's title line, with a close cross in the back arrow's place.
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s1, marginLeft: -space.s3 },
  close: { width: size.targetMin, height: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, paddingTop: (size.targetMin - type.titleLg.lineHeight) / 2 },
  captions: { gap: space.s1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.cozy,
    paddingVertical: space.s3,
    paddingHorizontal: space.roomy,
    borderRadius: radius.control,
    backgroundColor: color.surfaceSunken,
  },
}));
