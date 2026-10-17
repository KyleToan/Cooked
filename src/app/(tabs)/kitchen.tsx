import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ActionPill } from '@/components/ActionPill';
import { ROW_LAYOUT, Switch, UndoBar } from '@/components/Controls';
import { GreetingHeader, SectionHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { KitchenRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Sheet } from '@/components/Sheet';
import { PAPER } from '@/components/StickyNote';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { AddRow, TodoList } from '@/components/TodoList';
import { count, dateIn, daysUntil, isDueSoon, joinAnd, shortDate, sortToBuy, toBuyProgress } from '@/data/helpers';
import { useStore, useUndo } from '@/data/store';
import type { Item, Place } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { makeStyles, useColors, radius, size, space, type ColorName } from '@/theme';

type Tab = Place | 'tobuy';

const TABS: { id: Tab; label: string; paper: ColorName }[] = [
  { id: 'fridge', label: 'Fridge', paper: PAPER.fridge },
  { id: 'pantry', label: 'Pantry', paper: PAPER.pantry },
  { id: 'freezer', label: 'Freezer', paper: PAPER.freezer },
  // To Buy isn't a place, so it has no paper. Picked, it gets the picker's sage-ink
  // ring on white instead of a sage fill: sage fill is kept for the one action button.
  { id: 'tobuy', label: 'To Buy', paper: 'surface' },
];

/** Above this text size the four tabs no longer fit side by side, so they scroll sideways. */
const TABS_SCROLL_SCALE = 1.35;

/** Per place: what the first section is called and the add row's placeholder. */
const PLACE_COPY: Record<Place, { soonTitle: string; soonIsDate: boolean; restTitle: string; add: string; where: string }> = {
  fridge: { soonTitle: 'Use soon', soonIsDate: true, restTitle: 'In the fridge', add: 'Add to the fridge…', where: 'the fridge' },
  pantry: { soonTitle: 'Running low', soonIsDate: false, restTitle: 'In the pantry', add: 'Add to the pantry…', where: 'the pantry' },
  freezer: { soonTitle: 'Use soon', soonIsDate: true, restTitle: 'In the freezer', add: 'Add to the freezer…', where: 'the freezer' },
};

/** shortcut: the web has no date picker, so there the date steps through these days from today; fine for previews. */
const WEB_DAYS = [1, 3, 7, 14];

/** The same critically damped spring as the other sliding pickers (`Segmented`): about 300ms, no overshoot. */
const SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
/** The list fades across when the tab changes. Reanimated skips it under Reduce Motion. */
const LIST_FADE = FadeIn.duration(150);

const isTab = (t: unknown): t is Tab => t === 'fridge' || t === 'pantry' || t === 'freezer' || t === 'tobuy';

export default function Kitchen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const { state, actions } = useStore();
  const undo = useUndo('kitchen');

  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'fridge');
  // Kitchen is a tab and stays mounted, so a link to one of its tabs (from Home's search) arrives as a new param.
  const [linked, setLinked] = useState(params.tab);
  if (params.tab !== linked) {
    setLinked(params.tab);
    if (isTab(params.tab)) setTab(params.tab);
  }
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
    if (t !== tab) haptics.select();
    setTab(t);
    setOpen(null);
    setQuery('');
  };

  const placeholder = tab === 'tobuy' ? 'Search your list' : `Search the ${tab}`;

  return (
    <View style={styles.root}>
      <Screen
        island
        top="tab"
        raised={!!undo}
        overlay={undo ? <UndoBar text={undo.text} onUndo={actions.undo} onDismiss={() => actions.clearUndo(undo.scope)} /> : null}
      >
        <GreetingHeader line={statusLine} title="Your Kitchen" onAccount={() => router.push('/account')} />

        <SearchField placeholder={placeholder} value={query} onChangeText={setQuery} />

        <KitchenTabs tab={tab} onPick={pick} />

        <Animated.View key={tab} entering={LIST_FADE}>
          {tab === 'tobuy' ? (
            <ToBuyTab matches={matches} others={others} query={query.trim()} clearQuery={() => setQuery('')} />
          ) : (
            <StockTab
              place={tab}
              query={query.trim()}
              clearQuery={() => setQuery('')}
              items={state.items.filter((i) => i.place === tab && matches(i.name))}
              open={open}
              setOpen={setOpen}
              sort={sort}
              toggleSort={() => setSort(sort === 'az' ? 'useby' : 'az')}
              startQty={startQty}
            />
          )}
        </Animated.View>
      </Screen>
    </View>
  );
}

type TabLayout = { x: number; width: number };

/**
 * Grey pills, one per tab; the picked one is a paper pill that slides between them on a spring,
 * its color crossing from paper to paper (To Buy: white with a `sage-ink` ring).
 * At large text the row scrolls sideways and keeps the picked tab in view.
 */
function KitchenTabs({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  const color = useColors();
  const styles = useStyles();
  const { fontScale, width: screenW } = useWindowDimensions();
  const scrollTabs = fontScale > TABS_SCROLL_SCALE;
  const reduced = useReducedMotion();
  const index = TABS.findIndex((t) => t.id === tab);
  const [layouts, setLayouts] = useState<Partial<Record<Tab, TabLayout>>>({});
  const at = layouts[tab];
  const measured = TABS.every((t) => layouts[t.id]);

  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const p = useSharedValue(index);
  const placed = useRef(false);

  useEffect(() => {
    if (!at || !measured) return;
    // Later layout changes (the bolder label at large text, a rotation) spring too, so a slide in flight isn't cut short.
    if (reduced || !placed.current) {
      // First layout or Reduce Motion: place the pill without moving it.
      placed.current = true;
      x.set(at.x);
      w.set(at.width);
      p.set(index);
    } else {
      x.set(withSpring(at.x, SPRING));
      w.set(withSpring(at.width, SPRING));
      p.set(withSpring(index, SPRING));
    }
  }, [at, index, measured, reduced, x, w, p]);

  // Keep the picked tab in view when the row scrolls: centered, but never past either end.
  const scroller = useRef<ScrollView>(null);
  const contentW = useRef(0);
  useEffect(() => {
    if (!scrollTabs || !at) return;
    const max = Math.max(0, contentW.current - screenW);
    const to = Math.min(max, Math.max(0, at.x + at.width / 2 - screenW / 2));
    scroller.current?.scrollTo({ x: to, animated: !reduced });
  }, [scrollTabs, at, screenW, reduced]);

  const steps = TABS.map((_, i) => i);
  const papers = TABS.map((t) => color[t.paper]);
  const rings = TABS.map((t) => (t.id === 'tobuy' ? color.sageInk : color.line));
  const ringWidths = TABS.map((t) => (t.id === 'tobuy' ? RING_TOBUY : RING_PAPER));
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    width: w.get(),
    backgroundColor: interpolateColor(p.get(), steps, papers),
    borderColor: interpolateColor(p.get(), steps, rings),
    borderWidth: interpolate(p.get(), steps, ringWidths),
  }));

  const content = (
    <>
      {measured
        ? TABS.map((t) => (
            <View key={t.id} pointerEvents="none" style={[styles.tabTrack, { left: layouts[t.id]!.x, width: layouts[t.id]!.width }]} />
          ))
        : null}
      {measured ? <Animated.View pointerEvents="none" style={[styles.tabPill, pill]} /> : null}
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Tap
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(t.id)}
            onLayout={(e) => {
              const { x: lx, width } = e.nativeEvent.layout;
              setLayouts((prev) => (prev[t.id]?.x === lx && prev[t.id]?.width === width ? prev : { ...prev, [t.id]: { x: lx, width } }));
            }}
            style={[
              styles.tab,
              scrollTabs ? styles.tabScroll : styles.tabFit,
              // Until every tab is measured there's no sliding pill yet, so each tab draws its own fill.
              !measured && (on ? { backgroundColor: color[t.paper] } : styles.tabOff),
            ]}
          >
            <Text variant="button" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'} style={styles.tabLabel}>
              {t.label}
            </Text>
          </Tap>
        );
      })}
    </>
  );

  return scrollTabs ? (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={(cw) => (contentW.current = cw)}
      accessibilityRole="tablist"
      accessibilityLabel="Where"
      style={styles.tabsBleed}
      contentContainerStyle={[styles.tabs, styles.tabsScrollContent]}
    >
      {content}
    </ScrollView>
  ) : (
    <View accessibilityRole="tablist" accessibilityLabel="Where" style={styles.tabs}>
      {content}
    </View>
  );
}

/** Picked To Buy's `sage-ink` ring is a little heavier than a paper's `line` edge, as on the place picker. */
const RING_TOBUY = 1.5;
const RING_PAPER = 1;

function StockTab({
  place,
  query,
  clearQuery,
  items,
  open,
  setOpen,
  sort,
  toggleSort,
  startQty,
}: {
  place: Place;
  /** The search, trimmed. */
  query: string;
  clearQuery: () => void;
  items: Item[];
  open: string | null;
  setOpen: (id: string | null) => void;
  sort: 'az' | 'useby';
  toggleSort: () => void;
  startQty: Record<string, number>;
}) {
  const color = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { state, actions } = useStore();
  const copy = PLACE_COPY[place];
  // iOS: the item whose use-by date is being picked in the sheet, and the date so far.
  const [picking, setPicking] = useState<Item | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());

  const setBestBy = (id: string, days: number) => actions.setBestBy(id, days);

  const openDate = (i: Item) => {
    const value = dateIn(i.daysLeft);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'date', onValueChange: (_e, d) => setBestBy(i.id, daysUntil(d)) });
    } else if (Platform.OS === 'ios') {
      setDraft(value);
      setPicking(i);
      setPickerOpen(true);
    } else {
      setBestBy(i.id, WEB_DAYS.find((d) => d > i.daysLeft) ?? WEB_DAYS[0]);
    }
  };

  // Fridge and freezer only: the pantry's first section is Running low, not dates.
  const dateControls = (i: Item) => (
    <View style={styles.useBy}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`Use by ${shortDate(i.daysLeft)}`}
        accessibilityHint="Opens a date picker"
        onPress={() => openDate(i)}
        style={styles.useByPart}
      >
        <Text variant="caption" color="inkMuted">
          Use by
        </Text>
        <Text variant="button" weight="semibold">
          {shortDate(i.daysLeft)}
        </Text>
      </Tap>
      {/* The whole pill flips the switch, and VoiceOver reads it as one switch. */}
      <Tap
        accessibilityRole="switch"
        accessibilityLabel={`Use ${i.name} soon`}
        accessibilityState={{ checked: isDueSoon(i) }}
        onPress={() => {
          haptics.select();
          actions.setUseSoon(i.id, !isDueSoon(i));
        }}
        style={styles.useByPart}
      >
        <Text variant="caption" color="inkMuted">
          Use soon
        </Text>
        <View importantForAccessibility="no-hide-descendants">
          <Switch value={isDueSoon(i)} label={`Use ${i.name} soon`} onChange={(on) => actions.setUseSoon(i.id, on)} />
        </View>
      </Tap>
    </View>
  );

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

  // Recipes, filtered to this item: back to the tabs if Kitchen was pushed, else switch.
  const findRecipe = (name: string) => {
    const href = { pathname: '/recipes', params: { q: name } } as const;
    if (router.canDismiss()) router.dismissTo(href);
    else router.navigate(href);
  };

  const onList = (i: Item) => state.toBuy.some((t) => !t.done && t.name.toLowerCase() === i.name.toLowerCase());

  const row = (i: Item, inSoon: boolean) => {
    const recipeAction = inSoon && copy.soonIsDate;
    return (
      <Animated.View key={i.id} layout={ROW_LAYOUT}>
      <KitchenRow
        item={i}
        startQty={startQty[i.id]}
        soon={inSoon && copy.soonIsDate}
        open={open === i.id}
        onToggleOpen={() => setOpen(open === i.id ? null : i.id)}
        actionLabel={recipeAction ? 'Find a recipe that uses it' : onList(i) ? 'On your To Buy list' : 'Add to To Buy'}
        onAction={() => (recipeAction ? findRecipe(i.name) : actions.addItemToBuy(i.id))}
        onQty={(qty) => actions.setQty(i.id, qty, 'kitchen')}
        onUseUp={() => actions.setQty(i.id, 0, 'kitchen')}
        extra={copy.soonIsDate ? dateControls(i) : undefined}
      />
      </Animated.View>
    );
  };

  if (query && items.length === 0) {
    return (
      <View style={styles.noMatch}>
        <Text variant="caption" color="inkMuted">
          No “{query}” in {copy.where}.
        </Text>
        <TextLink
          label={`Add ${query} to ${copy.where}`}
          onPress={() => {
            actions.addItem(query, place);
            clearQuery();
          }}
        />
      </View>
    );
  }

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
              accessibilityLabel={`Sort, ${sort === 'az' ? 'A to Z' : 'by use-by date'}. Changes the order.`}
              onPress={() => {
                haptics.select();
                toggleSort();
              }}
              style={styles.sort}
            >
              <Text variant="link" color="sageInk">
                Sort: {sort === 'az' ? 'A to Z' : 'Use by'}
              </Text>
            </Tap>
          }
        />
        {rest.map((i) => row(i, false))}
        <AddRow placeholder={copy.add} label={copy.add.replace('…', '')} onSubmit={(name) => actions.addItem(name, place)} />
      </View>

      {Platform.OS === 'ios' ? (
        <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={`Use ${picking?.name ?? 'it'} by`}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            accentColor={color.sageInk}
                        textColor={color.ink}
            onValueChange={(_e, d) => setDraft(d)}
            style={styles.picker}
          />
          <ActionPill
            label="Done"
            variant="primary"
            height="bottom"
            onPress={() => {
              if (picking) setBestBy(picking.id, daysUntil(draft));
              setPickerOpen(false);
            }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

function ToBuyTab({
  matches,
  others,
  query,
  clearQuery,
}: {
  matches: (name: string) => boolean;
  others: string[];
  /** The search, trimmed. */
  query: string;
  clearQuery: () => void;
}) {
  const styles = useStyles();
  const { state, actions } = useStore();
  const progress = toBuyProgress(state.toBuy);
  const list = sortToBuy(state.toBuy.filter((t) => matches(t.name)));
  const scanLine = 'Scan your receipt after shopping and we’ll tick things off for you.';
  const helper = others.length ? `${joinAnd(others)} sees this list too. ${scanLine}` : scanLine;

  const share = () => {
    const left = sortToBuy(state.toBuy).filter((t) => !t.done);
    Share.share({ message: ['To Buy', ...left.map((t) => `• ${t.name}`)].join('\n') });
  };

  if (query && list.length === 0) {
    return (
      <View style={styles.noMatch}>
        <Text variant="caption" color="inkMuted">
          No “{query}” on your list.
        </Text>
        <TextLink
          label={`Add ${query} to To Buy`}
          onPress={() => {
            actions.addToBuy(query);
            clearQuery();
          }}
        />
      </View>
    );
  }

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

const useStyles = makeStyles((color) => ({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', gap: space.s2 },
  // Full-bleed so the scrolling tabs slide under the screen edge, not the gutter.
  tabsBleed: { marginHorizontal: -space.s5, flexGrow: 0 },
  tabsScrollContent: { paddingHorizontal: space.s5 },
  tab: {
    minHeight: size.targetMin,
    paddingVertical: space.s2,
    paddingHorizontal: space.s3,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFit: { flex: 1, paddingHorizontal: space.s1 },
  tabScroll: { paddingHorizontal: space.s4 },
  tabLabel: { textAlign: 'center' },
  tabOff: { backgroundColor: color.surfaceSunken },
  tabTrack: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: color.surfaceSunken },
  tabPill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.pill },
  stock: { gap: space.s5 + space.tight, paddingTop: space.s1 },
  list: { gap: space.s1 },
  noMatch: { gap: space.s1, paddingTop: space.s2 },
  sort: { minHeight: size.targetMin, justifyContent: 'center', paddingHorizontal: space.s1, marginRight: -space.s1 },
  toBuy: { paddingTop: space.s1 },
  // Two grey pills that share the row; at large text each takes a full row of its own.
  useBy: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  useByPart: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: size.targetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s2,
    paddingVertical: space.s1,
    paddingHorizontal: space.roomy,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  picker: { alignSelf: 'stretch' },
}));
