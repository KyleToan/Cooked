import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { Avatar } from '@/components/Settings';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { useStore } from '@/data/store';
import { color, radius, size, space } from '@/theme';

const PERSON = 36;

/** The invite link, Share invite link, Skip for now. */
export default function Invite() {
  const router = useRouter();
  const { state } = useStore();
  const [shared, setShared] = useState(false);
  const link = `cooked.app/join/${state.kitchen.inviteCode}`;

  const share = async () => {
    const result = await Share.share({ message: `Join ${state.kitchen.name} on Cooked: https://${link}` });
    if (result.action !== Share.dismissedAction) setShared(true);
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Invite your household"
      sub="Send the link by text or anywhere else. They’ll see the fridge, pantry, freezer and To Buy, and can add to them."
      bottom={
        <>
          <ActionPill label={shared ? 'Share again' : 'Share invite link'} variant="primary" height="bottom" onPress={share} />
          <TextLink label={shared ? 'Done' : 'Skip for now'} variant="button" align="center" onPress={() => router.push('/ready')} />
        </>
      }
    >
      <View style={styles.link}>
        <Text variant="micro" weight="regular" color="inkMuted">
          Invite link
        </Text>
        <Text variant="button" weight="regular">
          {link}
        </Text>
      </View>
      <View style={styles.people}>
        <Text variant="caption" weight="semibold" color="inkMuted">
          In this kitchen
        </Text>
        <View style={styles.person}>
          <Avatar name={state.user.name} paper="papaya" diameter={PERSON} />
          <View>
            <Text variant="button" weight="medium">
              {state.user.name}
            </Text>
            <Text variant="caption" color="inkMuted">
              You
            </Text>
          </View>
        </View>
        <View style={styles.person}>
          <View style={styles.empty} />
          <Text variant="caption" color="inkMuted" style={styles.grow}>
            {shared ? 'Link sent. People show up here when they join.' : 'No one else yet'}
          </Text>
        </View>
      </View>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  link: {
    minHeight: size.controlHeight + space.s3 - 2,
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
  },
  people: { gap: space.s3 },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  empty: { width: PERSON, height: PERSON, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.checkBorder },
});
