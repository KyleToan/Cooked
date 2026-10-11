import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { Field } from '@/components/Controls';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { PersonRow } from '@/components/Settings';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { joinAnd } from '@/data/helpers';
import { useStore, useUndo } from '@/data/store';
import { haptics } from '@/hooks/haptics';
import type { Person } from '@/data/types';
import { color, radius, size, space, type ColorName } from '@/theme';

const PAPERS: ColorName[] = ['papaya', 'beige', 'cornsilk'];

/** Rename, People (remove asks first in a sheet, then offers undo), the invite link, Leave this kitchen. */
export default function Household() {
  const router = useRouter();
  const { state, actions } = useStore();
  const removed = useUndo('household');
  // Who the remove sheet is about. Kept after the sheet closes so its title doesn't blank mid-exit.
  const [removing, setRemoving] = useState<Person | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(state.kitchen.name);
  const [leaving, setLeaving] = useState(false);
  const [relinking, setRelinking] = useState(false);

  const kitchen = state.kitchen;
  const others = kitchen.people.filter((p) => p.id !== state.user.id);
  const link = `cooked.app/join/${kitchen.inviteCode}`;

  const share = async () => {
    try {
      const result = await Share.share({ message: `Join ${kitchen.name} on Cooked: https://${link}` });
      if (result.action === Share.sharedAction) haptics.success();
    } catch {
      // The share sheet closed or isn't available; nothing to undo.
    }
  };

  return (
    <Screen>
      <PushedHeader
        title={kitchen.name}
        onBack={() => router.back()}
        backLabel="Back to account"
        right={
          <Tap accessibilityRole="button" onPress={() => {
              setName(kitchen.name);
              setRenaming(true);
            }} style={styles.rename}>
            <Text variant="link" color="sageInk">
              Rename
            </Text>
          </Tap>
        }
        below={
          <Text variant="caption" color="inkMuted">
            Everyone here shares the fridge, pantry, freezer, To Buy and recipes.
          </Text>
        }
      />

      <View>
        <SectionHeader title="People" />
        {kitchen.people.map((p, i) => {
          const you = p.id === state.user.id;
          return (
            <PersonRow
              key={p.id}
              name={you ? `${p.name} (you)` : p.name}
              note={p.note}
              paper={PAPERS[i % PAPERS.length]}
              right={
                you ? undefined : (
                  <TextLink
                    label="Remove"
                    color="inkMuted"
                    accessibilityLabel={`Remove ${p.name}`}
                    onPress={() => {
                      setRemoving(p);
                      setConfirming(true);
                    }}
                  />
                )
              }
            />
          );
        })}
        {removed ? (
          <View accessibilityRole="alert" style={styles.removed}>
            <Text variant="caption" color="inkMuted">
              {removed.text}
            </Text>
            <TextLink label="Undo" onPress={actions.undo} />
          </View>
        ) : null}
      </View>

      <View style={styles.invite}>
        <SectionHeader title="Invite" />
        <View style={styles.link}>
          <Text variant="micro" weight="regular" color="inkMuted">
            Invite link
          </Text>
          <Text variant="button" weight="regular">
            {link}
          </Text>
        </View>
        <Text variant="caption" color="inkMuted">
          {kitchen.newLink
            ? 'New link made. The old one no longer works.'
            : 'Works for one person and runs out in 7 days. Anyone with it can join, so only send it to people you live with.'}
        </Text>
        <ActionPill label="Share invite link" variant="primary" height="bottom" onPress={share} />
        <TextLink label="Make a new link" align="center" onPress={() => setRelinking(true)} />
      </View>

      <View style={styles.leave}>
        <TextLink label="Leave this kitchen" color="errorInk" variant="button" align="center" onPress={() => setLeaving(true)} />
        <Text variant="micro" weight="regular" color="inkMuted" style={styles.center}>
          {others.length ? `${joinAnd(others.map((p) => p.name))} keeps the kitchen. ` : ''}You’ll start a new, empty one.
        </Text>
      </View>

      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        showClose={false}
        title={`Remove ${removing?.name ?? ''}?`}
      >
        <Text variant="button" weight="regular" color="inkMuted">
          They’ll lose access right away. Anything they added stays in the kitchen.
        </Text>
        <ActionPill
          label={`Keep ${removing?.name ?? ''}`}
          variant="primary"
          height="bottom"
          onPress={() => setConfirming(false)}
        />
        <TextLink
          label={`Remove ${removing?.name ?? ''}`}
          color="errorInk"
          variant="button"
          align="center"
          onPress={() => {
            if (removing) actions.removePerson(removing.id);
            setConfirming(false);
          }}
        />
      </Sheet>

      <Sheet visible={relinking} onClose={() => setRelinking(false)} showClose={false} title="Make a new link?">
        <Text variant="button" weight="regular" color="inkMuted">
          The old link stops working right away. Anyone who hasn’t joined yet will need the new one.
        </Text>
        <ActionPill label="Keep this link" variant="primary" height="bottom" onPress={() => setRelinking(false)} />
        <TextLink
          label="Make a new link"
          color="inkMuted"
          variant="button"
          align="center"
          onPress={() => {
            actions.newInviteLink();
            setRelinking(false);
          }}
        />
      </Sheet>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title="Rename the kitchen">
        <Field label="Kitchen name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
        <ActionPill
          label="Save"
          variant="primary"
          height="bottom"
          disabled={!name.trim()}
          onPress={() => {
            actions.renameKitchen(name);
            setRenaming(false);
          }}
        />
      </Sheet>

      <Sheet visible={leaving} onClose={() => setLeaving(false)} showClose={false} title={`Leave ${kitchen.name}?`}>
        <Text variant="button" weight="regular" color="inkMuted">
          {others.length ? `${joinAnd(others.map((p) => p.name))} keeps the kitchen. ` : ''}You’ll start a new, empty one.
        </Text>
        <ActionPill label="Stay in this kitchen" variant="primary" height="bottom" onPress={() => setLeaving(false)} />
        <TextLink
          label="Leave this kitchen"
          color="errorInk"
          variant="button"
          align="center"
          onPress={() => {
            actions.leaveKitchen();
            setLeaving(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  rename: { minHeight: size.targetMin, justifyContent: 'center', paddingHorizontal: space.s1 },
  removed: { minHeight: size.controlHeight + space.s1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { gap: space.s3 },
  link: {
    minHeight: size.controlHeight + space.s3 - 2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
  },
  leave: { gap: 2, paddingTop: space.s2, alignItems: 'center' },
});
