import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ActionPill } from '@/components/ActionPill';
import { Field, FilterPills, Switch, SyncNotice, UndoBar, useRowLayout } from '@/components/Controls';
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
import { count, dateIn, PLACES, daysUntil, hasSome, isDueSoon, doneAtOpen, joinAnd, shortDate, sinceOpen, sortToBuy, syncedLabel, toBuyProgress } from '@/data/helpers';
import { useStore, useUndo } from '@/data/store';
import type { Item, Place } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { makeStyles, useColors, radius, shadow, size, space, type ColorName } from '@/theme';

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

/** Offered on every item; units the kitchen already uses (carton, or one added with Other) join them. */
const UNITS = ['g', 'kg', 'lb', 'oz', 'ml', 'L', 'cup'];

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
  const { state, actions, sync } = useStore();
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
  const ago = syncedLabel(state.kitchen);
  const synced = ago ? `synced ${ago}` : '';
  const statusLine = others.length
    ? [`Shared with ${joinAnd(others)}`, synced].filter(Boolean).join(' · ')
    : synced && `Synced ${ago}`;

  const q = query.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);

  const pick = (t: Tab) => {
    if (t !== tab) haptics.select();
    setTab(t);
    setOpen(null);
    setQuery('');
  };

  const placeholder = tab === 'tobuy' ? 'Search your list' : `Search the ${tab}`;
  const unsorted = state.items.filter((i) => i.unsorted && hasSome(i));
  // While a Just bought row is held: the place under the finger (null over none). Undefined when nothing is held.
  const [dragOver, setDragOver] = useState<Place | null | undefined>(undefined);
  // The place tabs, for dropping a Just bought row on one.
  const tabRefs = useRef<Partial<Record<Tab, View | null>>>({});
  const dropTargets = () =>
    Promise.all(
      PLACES.map(
        (p) =>
          new Promise<DropTarget | null>((done) => {
            const tabView = tabRefs.current[p];
            if (!tabView) return done(null);
            tabView.measureInWindow((x, y, w, h) => done({ place: p, x, y, w, h }));
          }),
      ),
    ).then((all) => all.filter((t): t is DropTarget => !!t));

  return (
    <View style={styles.root}>
      <Screen
        island
        top="tab"
        raised={!!undo}
        overlay={undo ? <UndoBar text={undo.text} onUndo={actions.undo} onDismiss={() => actions.clearUndo(undo.scope)} /> : null}
      >
        <GreetingHeader line={statusLine} title="Your Kitchen" onAccount={() => router.push('/account')} />

        <SyncNotice problem={sync.problem} onRetry={sync.retry} />

        <SearchField placeholder={placeholder} value={query} onChangeText={setQuery} />

        <KitchenTabs tab={tab} onPick={pick} tabRefs={tabRefs} dragOver={dragOver} />

        {unsorted.length ? <JustBought items={unsorted} onSort={actions.sortItem} dropTargets={dropTargets} onDrag={setDragOver} /> : null}

        <Animated.View key={tab} entering={LIST_FADE}>
          {tab === 'tobuy' ? (
            <ToBuyTab matches={matches} others={others} query={query.trim()} clearQuery={() => setQuery('')} />
          ) : (
            <StockTab
              place={tab}
              query={query.trim()}
              clearQuery={() => setQuery('')}
              items={state.items.filter((i) => i.place === tab && !i.unsorted && matches(i.name))}
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
function KitchenTabs({
  tab,
  onPick,
  tabRefs,
  dragOver,
}: {
  tab: Tab;
  onPick: (t: Tab) => void;
  tabRefs: React.RefObject<Partial<Record<Tab, View | null>>>;
  /** Set while a Just bought row is held: the place tabs show they take a drop, the one under the finger fills. */
  dragOver?: Place | null;
}) {
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
      {measured && dragOver !== undefined
        ? PLACES.map((p) => (
            <View
              key={`drop-${p}`}
              pointerEvents="none"
              style={[
                styles.dropZone,
                { left: layouts[p]!.x, width: layouts[p]!.width },
                dragOver === p && [styles.dropZoneOver, { backgroundColor: color[PAPER[p]] }],
              ]}
            />
          ))
        : null}
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Tap
            key={t.id}
            ref={(v: View | null) => {
              tabRefs.current[t.id] = v;
            }}
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

type DropTarget = { place: Place; x: number; y: number; w: number; h: number };
/** A drop this close above or below a tab still counts, since the finger covers it. */
const DROP_SLOP = 16;
const LIFT = { duration: 150, reduceMotion: ReduceMotion.System } as const;

/**
 * Food ticked off To Buy or scanned, not put away yet. Tap where each one goes, or hold a row
 * and drag it onto the Fridge, Pantry or Freezer tab.
 */
function JustBought({
  items,
  onSort,
  dropTargets,
  onDrag,
}: {
  items: Item[];
  onSort: (id: string, place: Place) => void;
  dropTargets: () => Promise<DropTarget[]>;
  onDrag: (over: Place | null | undefined) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.justBought}>
      <View>
        <SectionHeader title="Just bought" meta={count(items.length, 'item')} />
        <Text variant="caption" color="inkMuted">
          Drag each one by its handle onto Fridge, Pantry or Freezer.
        </Text>
      </View>
      <View>
        {items.map((i) => (
          <BoughtRow key={i.id} item={i} onSort={(p) => onSort(i.id, p)} dropTargets={dropTargets} onDrag={onDrag} />
        ))}
      </View>
    </View>
  );
}

function BoughtRow({
  item,
  onSort,
  dropTargets,
  onDrag,
}: {
  item: Item;
  onSort: (place: Place) => void;
  dropTargets: () => Promise<DropTarget[]>;
  onDrag: (over: Place | null | undefined) => void;
}) {
  const color = useColors();
  const styles = useStyles();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const targets = useSharedValue<DropTarget[]>([]);
  const over = useSharedValue<Place | null>(null);
  const hitAt = (ax: number, ay: number) =>
    targets.get().find((t) => ax >= t.x && ax <= t.x + t.w && ay >= t.y - DROP_SLOP && ay <= t.y + t.h + DROP_SLOP)?.place ?? null;
  const [lifted, setLifted] = useState(false);
  const settle = () => {
    setLifted(false);
    onDrag(undefined);
    x.set(withSpring(0, SPRING));
    y.set(withSpring(0, SPRING));
    lift.set(withTiming(0, LIFT));
  };
  // Held by the handle, it lifts at once; no long press to discover.
  const drag = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onStart(() => {
      haptics.select();
      setLifted(true);
      over.set(null);
      onDrag(null);
      lift.set(withTiming(1, LIFT));
      dropTargets().then((t) => targets.set(t));
    })
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY);
      const hit = hitAt(e.absoluteX, e.absoluteY);
      if (hit !== over.get()) {
        over.set(hit);
        onDrag(hit);
        if (hit) haptics.select();
      }
    })
    .onEnd((e) => {
      const hit = hitAt(e.absoluteX, e.absoluteY);
      if (hit) {
        haptics.success();
        onSort(hit);
      }
      settle();
    })
    .onFinalize(settle);
  const moving = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: 1 + lift.get() * 0.03 }],
    zIndex: lift.get() > 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      // Dragging isn't open to VoiceOver, so the row offers each place as an action instead.
      accessible
      accessibilityLabel={`${item.name}, ${item.meta}`}
      accessibilityHint="Swipe up or down to pick where it goes"
      accessibilityActions={PLACES.map((p) => ({ name: p, label: `Put in the ${p}` }))}
      onAccessibilityAction={(e) => onSort(e.nativeEvent.actionName as Place)}
      style={[styles.boughtRow, lifted && styles.boughtLifted, moving]}
    >
      <View style={styles.boughtName}>
        <Text>{item.name}</Text>
        <Text variant="caption" color="inkMuted">
          {item.meta}
        </Text>
      </View>
      <GestureDetector gesture={drag}>
        <View style={[styles.handle, lifted && { backgroundColor: color.surfaceSunken }]}>
          <Icon name="drag" size={size.iconSm} color={lifted ? 'sageInk' : 'inkMuted'} />
        </View>
      </GestureDetector>
    </Animated.View>
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
  startQty: Record<string, number | undefined>;
}) {
  const color = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { state, actions } = useStore();
  const copy = PLACE_COPY[place];
  const rowLayout = useRowLayout();
  // iOS: the item whose use-by date is being picked in the sheet, and the date so far.
  const [picking, setPicking] = useState<Item | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());
  // The item whose amount is being typed in the sheet, and the two fields so far.
  const [amountFor, setAmountFor] = useState<Item | null>(null);
  const [amountOpen, setAmountOpen] = useState(false);
  const [qtyText, setQtyText] = useState('');
  const [unitText, setUnitText] = useState('');
  const qtyValue = qtyText.trim() ? Number(qtyText.trim().replace(',', '.')) : undefined;
  const qtyBad = qtyValue !== undefined && (!Number.isFinite(qtyValue) || qtyValue <= 0);
  const unitAlone = qtyValue === undefined && !!unitText.trim();

  const openAmount = (i: Item) => {
    setAmountFor(i);
    setQtyText(i.qty ? String(i.qty) : '');
    setUnitText(i.qty ? i.unit : '');
    setAmountOpen(true);
  };
  const saveAmount = () => {
    if (amountFor) actions.setAmount(amountFor.id, qtyValue, unitText);
    setAmountOpen(false);
  };

  const setBestBy = (id: string, days: number) => actions.setBestBy(id, days);
  // The item getting a measurement of its own (Other), and what's typed so far.
  const [unitFor, setUnitFor] = useState<Item | null>(null);
  const [unitDraft, setUnitDraft] = useState('');
  const units = [...new Set([...UNITS, ...state.items.map((i) => i.unit).filter(Boolean)])].map((u) => ({ value: u, label: u }));

  // Optional: with none picked it counts (× 3); tapping the picked one goes back to counting.
  const measure = (i: Item) => (
    <FilterPills
      options={units}
      value={i.unit || null}
      onChange={(u) => actions.setUnit(i.id, u ?? '')}
      action={{
        label: 'Other',
        icon: 'add',
        onPress: () => {
          setUnitDraft('');
          setUnitFor(i);
        },
      }}
    />
  );

  const openDate = (i: Item) => {
    const value = dateIn(i.daysLeft);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'date', minimumDate: new Date(), onValueChange: (_e, d) => setBestBy(i.id, daysUntil(d)) });
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
      <Animated.View key={i.id} layout={rowLayout}>
      <KitchenRow
        item={i}
        startQty={startQty[i.id]}
        soon={inSoon && copy.soonIsDate}
        open={open === i.id}
        onToggleOpen={() => setOpen(open === i.id ? null : i.id)}
        actionLabel={recipeAction ? 'Find a recipe that uses it' : onList(i) ? 'On your To Buy list' : 'Add to To Buy'}
        onAction={() => (recipeAction ? findRecipe(i.name) : actions.addItemToBuy(i.id))}
        onQty={(qty) => actions.setQty(i.id, qty, 'kitchen')}
        onEditAmount={() => openAmount(i)}
        onUseUp={() => actions.setQty(i.id, 0, 'kitchen')}
        extra={
          <>
            {measure(i)}
            {copy.soonIsDate ? dateControls(i) : null}
          </>
        }
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

      <Animated.View layout={rowLayout} style={styles.list}>
        <SectionHeader
          title={copy.restTitle}
          meta={count(rest.length, 'item')}
          right={
            rest.length < 2 ? undefined : (
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
            )
          }
        />
        {rest.map((i) => row(i, false))}
        <Animated.View layout={rowLayout}>
          <AddRow placeholder={copy.add} label={copy.add.replace('…', '')} onSubmit={(name) => actions.addItem(name, place)} />
        </Animated.View>
      </Animated.View>

      <Sheet visible={!!unitFor} onClose={() => setUnitFor(null)} title={`Measure ${unitFor?.name ?? 'it'} in`}>
        <Field
          label="Measurement"
          placeholder="tbsp, bag, slice…"
          value={unitDraft}
          onChangeText={setUnitDraft}
          autoFocus
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (unitFor && unitDraft.trim()) actions.setUnit(unitFor.id, unitDraft);
            setUnitFor(null);
          }}
        />
        <ActionPill
          label="Done"
          variant="primary"
          height="bottom"
          disabled={!unitDraft.trim()}
          onPress={() => {
            if (unitFor) actions.setUnit(unitFor.id, unitDraft);
            setUnitFor(null);
          }}
        />
      </Sheet>

      <Sheet visible={amountOpen} onClose={() => setAmountOpen(false)} title={amountFor ? `How much ${amountFor.name}?` : 'How much?'}>
        <Field
          label="How many (optional)"
          value={qtyText}
          onChangeText={setQtyText}
          keyboardType="decimal-pad"
          autoFocus
          error={qtyBad ? 'Use a number above 0, or leave it empty.' : undefined}
        />
        <Field
          label="Unit (optional)"
          placeholder="carton, g, cups"
          value={unitText}
          onChangeText={setUnitText}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => !qtyBad && !unitAlone && saveAmount()}
          error={unitAlone ? 'Add how many first, or clear the unit.' : undefined}
        />
        <ActionPill label="Save" variant="primary" height="bottom" disabled={qtyBad || unitAlone} onPress={saveAmount} />
        {amountFor?.qty !== undefined || amountFor?.amountText ? (
          <TextLink
            label="No amount"
            variant="button"
            align="center"
            onPress={() => {
              if (amountFor) actions.setAmount(amountFor.id, undefined, '');
              setAmountOpen(false);
            }}
          />
        ) : null}
      </Sheet>

      {Platform.OS === 'ios' ? (
        <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={`Use ${picking?.name ?? 'it'} by`}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            minimumDate={new Date()}
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
  // Leaving To Buy (another tab or screen) clears what you ticked off; while you're here it stays, crossed out.
  const latest = useRef(state.toBuy);
  useEffect(() => {
    latest.current = state.toBuy;
  });
  const [hidden, setHidden] = useState(() => doneAtOpen(state.toBuy));
  useFocusEffect(useCallback(() => setHidden(doneAtOpen(latest.current)), []));
  const progress = toBuyProgress(state.toBuy, hidden);
  const list = sortToBuy(sinceOpen(state.toBuy, hidden).filter((t) => matches(t.name)));
  const scanLine = 'Scan your receipt after shopping and we’ll tick things off for you.';
  const helper = others.length ? `${joinAnd(others)} sees this list too. ${scanLine}` : scanLine;

  const left = sortToBuy(state.toBuy).filter((t) => !t.done);
  const share = async () => {
    try {
      await Share.share({ message: ['To Buy', ...left.map((t) => `• ${t.name}`)].join('\n') });
    } catch {
      // The share sheet isn't available (some browsers) or closed with an error; nothing to undo.
    }
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
        right={left.length ? <TextLink label="Share" onPress={share} accessibilityLabel="Share list" /> : undefined}
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
  // Above the lists after it, so a dragged row passes over them.
  justBought: { gap: space.s2, zIndex: 1 },
  boughtRow: {
    minHeight: size.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingVertical: space.s2,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
    backgroundColor: color.surface,
  },
  boughtLifted: { ...shadow.island, borderRadius: radius.field },
  boughtName: { flex: 1 },
  handle: {
    width: size.targetMin,
    height: size.targetMin,
    marginRight: -space.s2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Held: each place tab gets a dashed sage-ink ring; the one under the finger fills with its paper.
  dropZone: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill, borderWidth: 2, borderStyle: 'dashed', borderColor: color.sageInk },
  dropZoneOver: { borderStyle: 'solid' },
}));
