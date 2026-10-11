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
import type { Person } from '@/data/types';
import { color, radius, size, space, type ColorName } from '@/theme';

const PAPERS: ColorName[] = ['papaya', 'beige', 'cornsilk'];

/** Rename, People (remove with an inline confirm and undo), the invite link, Leave this kitchen. */
export default function Household() {
  const router = useRouter();
  const { state, actions } = useStore();
  const removed = useUndo('household');
  const [confirming, setConfirming] = useState<Person | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(state.kitchen.name);
  const [leaving, setLeaving] = useState(false);

  const kitchen = state.kitchen;
  const others = kitchen.people.filter((p) => p.id !== state.user.id);
  const link = `cooked.app/join/${kitchen.inviteCode}`;

  const share = () => Share.share({ message: `Join ${kitchen.name} on Cooked: https://${link}` });

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
                  <TextLink label="Remove" color="inkMuted" accessibilityLabel={`Remove ${p.name}`} onPress={() => setConfirming(p)} />
                )
              }
            />
          );
        })}
        {confirming ? (
          <View accessibilityRole="alert" style={styles.confirm}>
            <Text variant="caption">
              Remove {confirming.name}? They’ll lose access right away. Anything they added stays in the kitchen.
            </Text>
            <View style={styles.confirmButtons}>
              <Tap
                accessibilityRole="button"
                onPress={() => {
                  actions.removePerson(confirming.id);
                  setConfirming(null);
                }}
                style={styles.removeBtn}
              >
                <Text variant="link" color="errorInk">
                  Remove {confirming.name}
                </Text>
              </Tap>
              <TextLink label="Keep" onPress={() => setConfirming(null)} />
            </View>
          </View>
        ) : null}
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
        <TextLink label="Make a new link" align="center" onPress={actions.newInviteLink} />
      </View>

      <View style={styles.leave}>
        <TextLink label="Leave this kitchen" color="errorInk" variant="button" align="center" onPress={() => setLeaving(true)} />
        <Text variant="micro" weight="regular" color="inkMuted" style={styles.center}>
          {others.length ? `${joinAnd(others.map((p) => p.name))} keeps the kitchen. ` : ''}You’ll start a new, empty one.
        </Text>
      </View>

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
  confirm: { marginTop: space.s2 + 2, padding: space.s3 + 2, gap: space.s2 + 2, borderRadius: radius.control, backgroundColor: color.surfaceSunken },
  confirmButtons: { flexDirection: 'row', gap: space.s2, alignItems: 'center' },
  removeBtn: {
    height: size.targetMin,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  removed: { minHeight: size.controlHeight + space.s1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { gap: space.s3 },
  link: {
    height: size.controlHeight + space.s3 - 2,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
  },
  leave: { gap: 2, paddingTop: space.s2, alignItems: 'center' },
});
