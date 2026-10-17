import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { OnbScreen } from '@/components/Onboarding';
import { Avatar, InviteLink } from '@/components/Settings';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { useStore } from '@/data/store';
import { makeStyles, radius, space } from '@/theme';

const PERSON = 36;

/** The invite link, Share invite link, Skip for now. */
export default function Invite() {
  const styles = useStyles();
  const router = useRouter();
  const { state } = useStore();
  const [shared, setShared] = useState(false);
  const link = `cooked.app/join/${state.kitchen.inviteCode}`;

  const share = async () => {
    try {
      const result = await Share.share({ message: `Join ${state.kitchen.name} on Cooked: https://${link}` });
      if (result.action !== Share.dismissedAction) setShared(true);
    } catch {
      // No share sheet here (some browsers), or it closed with an error. The link above can still be copied.
    }
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="Invite your household"
      sub="Send the link by text or anywhere else. They’ll see the fridge, pantry, freezer and To Buy, and can add to them."
      bottom={
        <>
          {/* After sharing, moving on is the main thing; sharing again is the quiet link. */}
          {shared ? (
            <>
              <ActionPill label="Next" variant="primary" height="bottom" onPress={() => router.push('/ready')} />
              <TextLink label="Share again" variant="button" align="center" onPress={share} />
            </>
          ) : (
            <>
              <ActionPill label="Share invite link" variant="primary" height="bottom" onPress={share} />
              <TextLink label="Skip for now" variant="button" align="center" onPress={() => router.push('/ready')} />
            </>
          )}
        </>
      }
    >
      <InviteLink link={link} />
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

const useStyles = makeStyles((color) => ({
  grow: { flex: 1 },
  people: { gap: space.s3 },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  empty: { width: PERSON, height: PERSON, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.checkBorder },
}));
