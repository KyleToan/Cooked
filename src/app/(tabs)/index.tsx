import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill, PillRow } from '@/components/ActionPill';
import { Chevron } from '@/components/Chevron';
import { UndoBar } from '@/components/Controls';
import { SectionHeader, TopBar } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { BigNote, KitchenNote, NOTE_TILT, PAPER } from '@/components/StickyNote';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { AddRow, TodoList } from '@/components/TodoList';
import { count, doneAtOpen, inStock, isUseSoon, PLACE_LABEL, PLACES, sortToBuy, syncedLabel, toBuyProgress } from '@/data/helpers';
import { useStore, useUndo } from '@/data/store';
import type { ToBuyItem } from '@/data/types';
import { color, size, space } from '@/theme';

/** Home shows the first three things still to get; the full list is the To Buy tab. */
const HOME_TO_BUY = 3;

function snapshot(list: ToBuyItem[]) {
  return {
    all: new Set(list.map((t) => t.id)),
    shown: new Set(list.filter((t) => !t.done).slice(0, HOME_TO_BUY).map((t) => t.id)),
    done: doneAtOpen(list),
  };
}

export default function Home() {
  const router = useRouter();
  const { state, actions } = useStore();
  const undo = useUndo('home');
  const [query, setQuery] = useState('');

  const stock = inStock(state.items);
  const emptyKitchen = stock.length === 0;

  // Keep the rows that were on screen when Home opened, so a ticked row stays
  // (crossed out, at the bottom) instead of vanishing. Rows added here show too.
  const [opened, setOpened] = useState(() => snapshot(state.toBuy));
  const latest = useRef(state.toBuy);
  useEffect(() => {
    latest.current = state.toBuy;
  });
  useFocusEffect(useCallback(() => setOpened(snapshot(latest.current)), []));
  const shown = sortToBuy(state.toBuy.filter((t) => opened.shown.has(t.id) || !opened.all.has(t.id)));
  const progress = toBuyProgress(state.toBuy, opened.done);
  const synced = syncedLabel(state.kitchen);
  const shared = state.kitchen.people.length > 1;

  const notes = useMemo(() => {
    const soon = PLACES.map((p) => stock.filter((i) => i.place === p && isUseSoon(i)).length);
    const most = Math.max(...soon);
    // At most one flag per row of notes: on the place with the most to use soon.
    const flagged = most > 0 ? soon.indexOf(most) : -1;
    return PLACES.map((p, i) => ({
      place: p,
      count: count(stock.filter((s) => s.place === p).length, 'item'),
      flag: i === flagged ? `${most} use soon` : undefined,
    }));
  }, [stock]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return [
      ...stock.filter((i) => i.name.toLowerCase().includes(q)).map((i) => ({ key: i.id, name: i.name, where: PLACE_LABEL[i.place], open: () => router.navigate({ pathname: '/kitchen', params: { tab: i.place } }) })),
      // Still to get (not ticked off): opens the To Buy tab.
      ...state.toBuy.filter((t) => !t.done && t.name.toLowerCase().includes(q)).map((t) => ({ key: t.id, name: t.name, where: 'To Buy', open: () => router.navigate({ pathname: '/kitchen', params: { tab: 'tobuy' } }) })),
      ...state.recipes.filter((r) => r.title.toLowerCase().includes(q)).map((r) => ({ key: r.id, name: r.title, where: 'Recipe', open: () => router.push({ pathname: '/recipe/[id]', params: { id: r.id } }) })),
    ];
  }, [query, stock, state.toBuy, state.recipes, router]);

  const openKitchen = (tab: string) => router.navigate({ pathname: '/kitchen', params: { tab } });

  const toBuyList = (
    <TodoList
      items={shown}
      done={progress.done}
      total={progress.total}
      onToggle={(id) => actions.toggleToBuy(id, 'home')}
      onAdd={actions.addToBuy}
      right={progress.total > 0 ? <TextLink label={`See all ${progress.total}`} onPress={() => openKitchen('tobuy')} /> : undefined}
    />
  );

  const toBuySection =
    state.toBuy.length === 0 ? (
      <View style={styles.emptyToBuy}>
        <SectionHeader title="To Buy" />
        <Text variant="caption" color="inkMuted">
          {shared
            ? 'Your shared list is empty. Add the first thing you’re out of, and everyone in your kitchen will see it.'
            : 'Your list is empty. Add the first thing you’re out of.'}
        </Text>
        <AddRow placeholder="Add an item…" label="Add an item" onSubmit={actions.addToBuy} />
      </View>
    ) : (
      toBuyList
    );

  return (
    <Screen
      island
      raised={!!undo}
      top="tab"
      overlay={undo ? <UndoBar text={undo.text} onUndo={actions.undo} onDismiss={() => actions.clearUndo(undo.scope)} /> : null}
    >
      <TopBar
        title="Cooked"
        onScan={() => router.push('/scan')}
        onAccount={() => router.push('/account')}
      />

      {emptyKitchen ? null : (
        <SearchField placeholder="Search your kitchen and recipes" value={query} onChangeText={setQuery} />
      )}

      {results ? (
        <View>
          {results.map((r) => (
            <Tap key={r.key} accessibilityRole="link" onPress={r.open} style={styles.result}>
              <Text style={styles.grow}>{r.name}</Text>
              <Text variant="caption" color="inkMuted">
                {r.where}
              </Text>
              <Chevron direction="right" />
            </Tap>
          ))}
          {results.length === 0 ? (
            <View style={styles.noMatch}>
              <Text variant="caption" color="inkMuted">
                Nothing matches “{query.trim()}”.
              </Text>
              <TextLink
                label={`Add ${query.trim()} to To Buy`}
                onPress={() => {
                  actions.addToBuy(query.trim());
                  setQuery('');
                }}
              />
            </View>
          ) : null}
        </View>
      ) : emptyKitchen ? (
        <>
          <View style={styles.kitchen}>
            <SectionHeader title="Your Kitchen" />
            <BigNote paper="cornsilk" tilt={-1} style={styles.emptyNote}>
              <Text variant="noteTitle" color="noteInk">
                Nothing here yet
              </Text>
              <Text variant="button" weight="regular" color="noteInkSoft">
                Scan your next grocery receipt and Cooked puts each item in the fridge, pantry or freezer for you.
              </Text>
              <ActionPill label="Scan a receipt" variant="primary" icon="scan" height="header" onPress={() => router.push('/scan')} />
              <TextLink label="Or add items by hand" onPress={() => openKitchen('fridge')} />
            </BigNote>
          </View>
          {toBuySection}
        </>
      ) : (
        <>
          {/* Scan is the round button in the top bar, so Import is the only pill here. */}
          <PillRow>
            <ActionPill label="Import recipe" icon="import" fill onPress={() => router.push('/import')} />
          </PillRow>

          <View style={styles.kitchen}>
            <View style={styles.kitchenHead}>
              <SectionHeader title="Your Kitchen" />
              {synced ? (
                <View style={styles.sync}>
                  <Icon name="syncing" size={size.iconSm} color="inkMuted" />
                  <Text variant="caption" color="inkMuted">
                    Synced {synced} from a receipt
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.notes}>
              {notes.map((n) => (
                <KitchenNote
                  key={n.place}
                  label={PLACE_LABEL[n.place]}
                  count={n.count}
                  flag={n.flag}
                  paper={PAPER[n.place]}
                  tilt={NOTE_TILT[n.place]}
                  onPress={() => openKitchen(n.place)}
                />
              ))}
            </View>
          </View>

          {toBuySection}
        </>
      )}
    </Screen>
  );

}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  result: { minHeight: size.rowHeight, flexDirection: 'row', alignItems: 'center', gap: space.s3, borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  noMatch: { gap: space.s1, paddingTop: space.s4 },
  kitchen: { gap: space.roomy },
  kitchenHead: { gap: space.s1 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  notes: { flexDirection: 'row', gap: space.s3, paddingTop: space.cozy, paddingHorizontal: 2, paddingBottom: space.s1 },
  emptyNote: { marginHorizontal: space.s1, gap: space.cozy, paddingTop: space.s5 + 2, paddingHorizontal: space.s5 },
  emptyToBuy: { gap: space.s3 },
});
