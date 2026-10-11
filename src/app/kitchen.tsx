import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { UndoBar } from '@/components/Controls';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { KitchenRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { PAPER } from '@/components/StickyNote';
import { TabIsland } from '@/components/TabIsland';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { AddRow, TodoList } from '@/components/TodoList';
import { count, isDueSoon, joinAnd, sortToBuy, toBuyProgress } from '@/data/helpers';
import { useStore, useUndo } from '@/data/store';
import type { Item, Place } from '@/data/types';
import { useGoToTab } from '@/hooks/useGoToTab';
import { useLayoutMotion } from '@/hooks/useLayoutMotion';
import { color, radius, size, space, type ColorName } from '@/theme';

type Tab = Place | 'tobuy';

const TABS: { id: Tab; label: string; paper: ColorName }[] = [
  { id: 'fridge', label: 'Fridge', paper: PAPER.fridge },
  { id: 'pantry', label: 'Pantry', paper: PAPER.pantry },
  { id: 'freezer', label: 'Freezer', paper: PAPER.freezer },
  { id: 'tobuy', label: 'To Buy', paper: 'sage' },
];

/** Per place: what the first section is called and the add row's placeholder. */
const PLACE_COPY: Record<Place, { soonTitle: string; soonIsDate: boolean; restTitle: string; add: string }> = {
  fridge: { soonTitle: 'Use soon', soonIsDate: true, restTitle: 'In the fridge', add: 'Add to the fridge…' },
  pantry: { soonTitle: 'Running low', soonIsDate: false, restTitle: 'In the pantry', add: 'Add to the pantry…' },
  freezer: { soonTitle: 'Use soon', soonIsDate: true, restTitle: 'In the freezer', add: 'Add to the freezer…' },
};

const isTab = (t: unknown): t is Tab => t === 'fridge' || t === 'pantry' || t === 'freezer' || t === 'tobuy';

export default function Kitchen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { state, actions } = useStore();
  const undo = useUndo('kitchen');
  const animate = useLayoutMotion();

  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'fridge');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<'az' | 'useby'>('az');
  // What each row started with, so "About 1 cup" shows until the count changes.
  const [startQty] = useState(() => Object.fromEntries(state.items.map((i) => [i.id, i.qty])));

  const others = state.kitchen.people.filter((p) => p.id !== state.user.id).map((p) => p.name);
  const synced = state.kitchen.syncedAgo ? `synced ${state.kitchen.syncedAgo}` : '';
  const statusLine = others.length
    ? [`Shared with ${joinAnd(others)}`, synced].filter(Boolean).join(' · ')
    : synced && `Synced ${state.kitchen.syncedAgo}`;

  const q = query.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);

  const pick = (t: Tab) => {
    setTab(t);
    setOpen(null);
    setQuery('');
    actions.clearUndo('kitchen');
  };

  const placeholder = tab === 'tobuy' ? 'Search your list' : `Search the ${tab}`;

  return (
    <View style={styles.root}>
      <Screen
        island
        gap={space.s5}
        overlay={
          <>
            {undo ? <UndoBar text={undo.text} onUndo={actions.undo} /> : null}
            <TabIsland active="home" />
          </>
        }
      >
        <PushedHeader
          title="Your Kitchen"
          onBack={() => router.back()}
          backLabel="Back to home"
          below={
            statusLine ? (
              <View style={styles.sync}>
                <Icon name="syncing" size={13} color="inkMuted" />
                <Text variant="caption" color="inkMuted">
                  {statusLine}
                </Text>
              </View>
            ) : null
          }
        />

        <SearchField placeholder={placeholder} value={query} onChangeText={setQuery} />

        <View accessibilityRole="tablist" accessibilityLabel="Where" style={styles.tabs}>
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <Tap
                key={t.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => pick(t.id)}
                style={[styles.tab, on ? [styles.tabOn, { backgroundColor: color[t.paper] }] : styles.tabOff]}
              >
                <Text variant="button" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'}>
                  {t.label}
                </Text>
              </Tap>
            );
          })}
        </View>

        {tab === 'tobuy' ? (
          <ToBuyTab matches={matches} others={others} />
        ) : (
          <StockTab
            place={tab}
            items={state.items.filter((i) => i.place === tab && matches(i.name))}
            open={open}
            setOpen={(id) => {
              animate();
              setOpen(id);
            }}
            sort={sort}
            toggleSort={() => setSort(sort === 'az' ? 'useby' : 'az')}
            startQty={startQty}
          />
        )}
      </Screen>
    </View>
  );
}

function StockTab({
  place,
  items,
  open,
  setOpen,
  sort,
  toggleSort,
  startQty,
}: {
  place: Place;
  items: Item[];
  open: string | null;
  setOpen: (id: string | null) => void;
  sort: 'az' | 'useby';
  toggleSort: () => void;
  startQty: Record<string, number>;
}) {
  const goToTab = useGoToTab();
  const { state, actions } = useStore();
  const copy = PLACE_COPY[place];

  const isSoon = (i: Item) => (copy.soonIsDate ? isDueSoon(i) : !!i.runningLow);
  const soon = items.filter(isSoon);
  const rest = useMemo(
    () =>
      items
        .filter((i) => !isSoon(i))
        .sort(sort === 'az' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.daysLeft - b.daysLeft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, sort],
  );

  const onList = (i: Item) => state.toBuy.some((t) => !t.done && t.name.toLowerCase() === i.name.toLowerCase());

  const row = (i: Item, inSoon: boolean) => {
    const findRecipe = inSoon && copy.soonIsDate;
    return (
      <KitchenRow
        key={i.id}
        item={i}
        startQty={startQty[i.id]}
        soon={inSoon && copy.soonIsDate}
        open={open === i.id}
        onToggleOpen={() => setOpen(open === i.id ? null : i.id)}
        actionLabel={findRecipe ? 'Find a recipe that uses it' : onList(i) ? 'On your To Buy list' : 'Add to To Buy'}
        onAction={() => (findRecipe ? goToTab('/recipes') : actions.addItemToBuy(i.id))}
        onQty={(qty) => actions.setQty(i.id, qty, 'kitchen')}
      />
    );
  };

  return (
    <View style={styles.stock}>
      {soon.length ? (
        <View style={styles.list}>
          <SectionHeader
            title={copy.soonTitle}
            icon={copy.soonIsDate ? <Icon name="use-soon" size={size.iconSm} color="bronzeInk" /> : undefined}
          />
          {soon.map((i) => row(i, true))}
        </View>
      ) : null}

      <View style={styles.list}>
        <SectionHeader
          title={copy.restTitle}
          meta={count(rest.length, 'item')}
          right={
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Sorted ${sort === 'az' ? 'A to Z' : 'by use-by date'}. Tap to change.`}
              onPress={toggleSort}
              style={styles.sort}
            >
              <Text variant="link" color="sageInk">
                {sort === 'az' ? 'A–Z' : 'Use by'}
              </Text>
            </Tap>
          }
        />
        {rest.map((i) => row(i, false))}
        <AddRow placeholder={copy.add} label={copy.add.replace('…', '')} onSubmit={(name) => actions.addItem(name, place)} />
      </View>
    </View>
  );
}

function ToBuyTab({ matches, others }: { matches: (name: string) => boolean; others: string[] }) {
  const { state, actions } = useStore();
  const progress = toBuyProgress(state.toBuy);
  const list = sortToBuy(state.toBuy.filter((t) => matches(t.name)));
  const scanLine = 'Scan your receipt after shopping and we’ll tick things off for you.';
  const helper = others.length ? `${joinAnd(others)} sees this list too. ${scanLine}` : scanLine;

  const share = () => {
    const left = sortToBuy(state.toBuy).filter((t) => !t.done);
    Share.share({ message: ['To Buy', ...left.map((t) => `– ${t.name}`)].join('\n') });
  };

  return (
    <View style={styles.toBuy}>
      <TodoList
        items={list}
        done={progress.done}
        total={progress.total}
        onToggle={(id) => actions.toggleToBuy(id, 'kitchen')}
        onAdd={actions.addToBuy}
        addLabel="Add an item to To Buy"
        helper={helper}
        right={<ActionPill label="Share" height="header" onPress={share} accessibilityLabel="Share list" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: space.s1 + 2 },
  tabs: { flexDirection: 'row', gap: space.s2 },
  tab: { flex: 1, height: size.targetMin, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { borderWidth: 1, borderColor: color.line },
  tabOff: { backgroundColor: color.surfaceSunken },
  stock: { gap: space.s5 + space.s1 + 2, paddingTop: space.s1 },
  list: { gap: space.s1 },
  sort: { height: size.targetMin, justifyContent: 'center', paddingHorizontal: space.s1, marginRight: -space.s1 },
  toBuy: { paddingTop: space.s1 },
});
