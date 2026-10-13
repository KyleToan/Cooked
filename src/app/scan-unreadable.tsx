import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionPill } from '@/components/ActionPill';
import { CornerGuides } from '@/components/Camera';
import { Sheet } from '@/components/Sheet';
import { TextLink } from '@/components/TextLink';
import { scanFlow } from '@/data/helpers';
import { useStore } from '@/data/store';
import { color, space } from '@/theme';

/** The error sheet over the last photo when the receipt can't be read. */
export default function ScanUnreadable() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flow = scanFlow(useLocalSearchParams<{ flow?: string }>().flow);
  const { actions } = useStore();

  const byHand = () => {
    router.dismissAll();
    if (flow === 'app') {
      router.navigate({ pathname: '/kitchen', params: { tab: 'fridge' } });
    } else {
      // In onboarding the kitchen isn't open yet: carry on, and add things from Home later.
      actions.skipFirstScan();
      router.push(flow === 'onb' ? '/invite' : '/ready');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CornerGuides faded style={[styles.guides, { marginTop: insets.top + space.s6 * 2 }]} />
      <Sheet
        inline
        showClose={false}
        onClose={() => router.back()}
        title="Couldn’t read this receipt"
        subtitle="The photo looks blurry or the bottom is cut off. Lay it flat in good light and fit all of it inside the corners."
      >
        <ActionPill label="Retake photo" variant="primary" height="bottom" onPress={() => router.back()} />
        <TextLink label="Add the items by hand" variant="button" align="center" onPress={byHand} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.noteInk },
  guides: { height: 400, marginHorizontal: space.s6 + space.s1 },
});
