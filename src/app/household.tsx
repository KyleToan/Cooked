import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field } from '@/components/Controls';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { PersonRow } from '@/components/Settings';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { joinAnd } from '@/data/helpers';
import { failText } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { useStore, useUndo } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import { haptics } from '@/hooks/haptics';
import type { Person } from '@/data/types';
import { color, radius, size, space, type ColorName } from '@/theme';

const PAPERS: ColorName[] = ['papaya', 'beige', 'cornsilk'];

/** Rename, People (remove asks first in a sheet, then offers undo), the invite link, Leave this kitchen. */
export default function Household() {
  const router = useRouter();
  const { state, actions, reload } = useStore();
  const removed = useUndo('household');
  // Who the remove sheet is about. Kept after the sheet closes so its title doesn't blank mid-exit.
  const [removing, setRemoving] = useState<Person | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(state.kitchen.name);
  const [leaving, setLeaving] = useState(false);
  const [relinking, setRelinking] = useState(false);
  // With a backend: the last failed call and the section it shows under, and whether a new link was made here.
  const [error, setError] = useState<{ at: 'people' | 'invite' | 'leave'; text: string } | null>(null);
  const [madeLink, setMadeLink] = useState(false);

  const kitchen = state.kitchen;
  const others = kitchen.people.filter((p) => p.id !== state.user.id);
  const link = `cooked.app/join/${kitchen.inviteCode}`;
  // Only the person who made the kitchen can remove people (the server checks too).
  // shortcut: reads the creator from the 'Made this kitchen' note, switch to kitchens.created_by once the store exposes it.
  const canRemove = !hasBackend || kitchen.people.some((p) => p.id === state.user.id && p.note === 'Made this kitchen');
  const kitchenId = kitchen.id ?? '';

  /** Runs a server call; on success reloads the kitchen, on failure shows "We couldn’t <what>…" under the section. */
  const call = async (at: 'people' | 'invite' | 'leave', what: string, run: () => Promise<api.Result>) => {
    setError(null);
    const r = await run();
    const why = api.failure(r);
    if (why) {
      setError({ at, text: failText(what, why) });
      return false;
    }
    await reload();
    return true;
  };
  const failLine = (at: 'people' | 'invite' | 'leave') => (error?.at === at ? <ErrorLine text={error.text} /> : null);

  const remove = async (p: Person) => {
    setConfirming(false);
    if (!hasBackend) return actions.removePerson(p.id);
    const r = await api.removeMember(kitchenId, p.id);
    const why = api.failure(r);
    if (why) return setError({ at: 'people', text: failText(`remove ${p.name}`, why) });
    setError(null);
    // Mirror it locally, which also shows the undo bar for a few seconds.
    actions.removePerson(p.id);
  };

  const undoRemove = async () => {
    if (!hasBackend || !removing) return actions.undo();
    const who = removing;
    const r = await api.restoreMember(kitchenId, who.id);
    if (r !== 'ok') {
      const text =
        r === 'in_other_kitchen'
          ? `${who.name} joined another kitchen, so they can’t be added back.`
          : failText(`add ${who.name} back`, api.failure(r) ?? 'server');
      return setError({ at: 'people', text });
    }
    setError(null);
    actions.clearUndo('household');
    await reload();
  };

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
                you || !canRemove ? undefined : (
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
            <TextLink label="Undo" onPress={undoRemove} />
          </View>
        ) : null}
        {failLine('people')}
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
          {kitchen.newLink || madeLink
            ? 'New link made. The old one no longer works.'
            : 'Works for one person and runs out in 7 days. Anyone with it can join, so only send it to people you live with.'}
        </Text>
        <ActionPill label="Share invite link" variant="primary" height="bottom" onPress={share} />
        <TextLink label="Make a new link" align="center" onPress={() => setRelinking(true)} />
        {failLine('invite')}
      </View>

      <View style={styles.leave}>
        <TextLink label="Leave this kitchen" color="errorInk" variant="button" align="center" onPress={() => setLeaving(true)} />
        <Text variant="micro" weight="regular" color="inkMuted" style={styles.center}>
          {others.length ? `${joinAnd(others.map((p) => p.name))} keeps the kitchen. ` : ''}You’ll start a new, empty one.
        </Text>
        {failLine('leave')}
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
          onPress={() => (removing ? remove(removing) : setConfirming(false))}
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
          onPress={async () => {
            setRelinking(false);
            if (!hasBackend) return actions.newInviteLink();
            if (await call('invite', 'make a new link', () => api.newInvite(kitchenId))) {
              setMadeLink(true);
            }
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
          onPress={async () => {
            setLeaving(false);
            if (!hasBackend) return actions.leaveKitchen();
            await call('leave', 'leave the kitchen', api.leaveKitchen);
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
