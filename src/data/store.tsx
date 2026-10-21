// The store: one reducer holds the kitchen, and every change goes through the
// `actions` object at the bottom. With a backend, StoreProvider loads the kitchen
// from Supabase, writes every change back and listens for other people's changes.

import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAuth } from './auth';
import { guessPlace, kitchenName, makeId, shortDate, USE_SOON_DAYS } from './helpers';
import { checkRecipe, checkRecipes, usedWhenMade } from './match';
import { EMPTY_RANKS, placeAt, pruned, type Band, type Ranks } from './ranking';
import { shelfLifeFor } from './receipt';
import { clearSaved, loadSaved, save, type Saved } from './saved';
import {
  ALEX,
  NEW_INVITE_CODE,
  SEED_ITEMS,
  SEED_KITCHEN,
  SEED_NOTIFICATIONS,
  SEED_RECIPES,
  SEED_TO_BUY,
  STAPLES,
} from './seed';
import { loadAll, markSynced, subscribeKitchen, writeDiff, type Loaded, type Synced } from './remote';
import { hasBackend } from './supabase';
import type {
  Item,
  Kitchen,
  KitchenPath,
  NotificationKey,
  NotificationSettings,
  Person,
  Place,
  Recipe,
  ScanLine,
  Session,
  ToBuyItem,
} from './types';

/** The parts of the state an undo puts back. */
type Snapshot = Pick<State, 'items' | 'toBuy' | 'kitchen' | 'recipes'>;

export type Undo = {
  /** "Bread ticked off", "Spinach used up". */
  text: string;
  /** The screen that shows the undo bar ("home", "kitchen", "recipe:pasta", "household"). */
  scope: string;
  snapshot: Snapshot;
};

/** How long an undo bar stays before it goes away by itself. */
export const UNDO_MS = 6000;

export type State = {
  session: Session;
  user: Person;
  kitchen: Kitchen;
  items: Item[];
  toBuy: ToBuyItem[];
  recipes: Recipe[];
  notifications: NotificationSettings;
  /** Your recipe ranking, kept on this phone only (design/recipe-ranking.md). */
  ranks: Ranks;
  undo: Undo | null;
};

export function initialState(): State {
  return {
    session: { onboarded: false, signIn: null, contact: '', path: null, lastScan: { fridge: [], pantry: [], freezer: [] } },
    user: ALEX,
    kitchen: SEED_KITCHEN,
    items: SEED_ITEMS,
    toBuy: SEED_TO_BUY,
    recipes: SEED_RECIPES,
    notifications: SEED_NOTIFICATIONS,
    ranks: EMPTY_RANKS,
    undo: null,
  };
}

export type Action =
  | { type: 'toggleToBuy'; id: string; scope: string }
  | { type: 'addToBuy'; name: string; place?: Place; amount?: string }
  | { type: 'addItem'; name: string; place: Place }
  | { type: 'setQty'; id: string; qty: number; scope: string }
  | { type: 'itemToBuy'; id: string }
  | { type: 'setUseSoon'; id: string; on: boolean }
  | { type: 'setBestBy'; id: string; daysLeft: number }
  | { type: 'setUnit'; id: string; unit: string }
  | { type: 'sortItem'; id: string; place: Place }
  | { type: 'addScanned'; lines: ScanLine[]; undo?: boolean; at?: string }
  | { type: 'toggleRecipeToBuy'; id: string }
  | { type: 'madeRecipe'; id: string }
  | { type: 'importRecipe'; recipe: Recipe }
  | { type: 'rankRecipe'; id: string; band: Band; index: number }
  | { type: 'undo' }
  | { type: 'clearUndo'; scope: string }
  | { type: 'expireUndo'; undo: Undo }
  | { type: 'renameKitchen'; name: string }
  | { type: 'removePerson'; id: string }
  | { type: 'newInviteLink' }
  | { type: 'leaveKitchen' }
  | { type: 'setNotification'; key: NotificationKey; on: boolean }
  | { type: 'setUseSoonTime'; time: string }
  | { type: 'signIn'; method: NonNullable<Session['signIn']>; contact?: string }
  | { type: 'setName'; name: string; lastName?: string }
  | { type: 'choosePath'; path: KitchenPath }
  | { type: 'skipFirstScan' }
  | { type: 'finishOnboarding' }
  | { type: 'reset' }
  /** Server data replaces the local copy (load, realtime refetch, or rollback after a failed write). */
  | { type: 'hydrate'; data: Partial<Loaded> }
  /** The copy kept on the phone, put back on launch. */
  | { type: 'restore'; saved: Saved };

const snap = (s: State): Snapshot => ({ items: s.items, toBuy: s.toBuy, kitchen: s.kitchen, recipes: s.recipes });

const withUndo = (s: State, text: string, scope: string): Undo => ({ text, scope, snapshot: snap(s) });

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** "José Núñez" → "jose-nunez": accents dropped, anything else becomes one hyphen. */
const slug = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my';

/** Longest the launch screen waits for the first kitchen load before opening on the phone's copy. */
const LOAD_WAIT_MS = 10000;

/** The id a person has on this phone before a backend gives them one. */
const NEW_PERSON_ID = 'me';

/** A new, empty kitchen named after the person: "Rivera kitchen", cooked.app/join/rivera-kitchen. */
const newKitchen = (user: Person): Kitchen => {
  const family = user.lastName || user.name;
  return {
    name: kitchenName(user),
    people: [{ ...user, note: 'Made this kitchen' }],
    inviteCode: `${slug(family)}-kitchen`,
    newLink: false,
    syncedAgo: '',
  };
};

/** Ticked off To Buy: one more of it in the kitchen, or a new one under Just bought. */
function buy(items: Item[], t: ToBuyItem, userId: string): Item[] {
  const have = items.find((i) => sameName(i.name, t.name));
  if (have) return items.map((i) => (i === have ? { ...i, qty: i.qty + 1 } : i));
  const added: Item = {
    id: makeId('i'),
    name: t.name,
    place: t.place,
    qty: 1,
    unit: '',
    meta: 'Just bought',
    daysLeft: shelfLifeFor(t.name, t.place),
    unsorted: true,
    addedBy: userId,
  };
  return [...items, added];
}

/** Unticked: takes back the one `buy` added. */
function unbuy(items: Item[], name: string): Item[] {
  const have = items.find((i) => i.unsorted && sameName(i.name, name)) ?? items.find((i) => i.qty > 0 && sameName(i.name, name));
  if (!have) return items;
  return have.qty <= 1 ? items.filter((i) => i !== have) : items.map((i) => (i === have ? { ...i, qty: i.qty - 1 } : i));
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'toggleToBuy': {
      const item = s.toBuy.find((t) => t.id === a.id);
      if (!item) return s;
      const toBuy = s.toBuy.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t));
      // Ticking off can be undone; unticking is its own undo.
      const undo = item.done ? null : withUndo(s, `${item.name} ticked off`, a.scope);
      return { ...s, toBuy, items: item.done ? unbuy(s.items, item.name) : buy(s.items, item, s.user.id), undo };
    }
    case 'addToBuy': {
      const name = a.name.trim();
      if (!name) return s;
      const item: ToBuyItem = {
        id: makeId('t'),
        name,
        // How much, when they said; otherwise who added it.
        note: a.amount?.trim() || `Added by ${s.user.name}`,
        place: a.place ?? guessPlace(name, s.items),
        done: false,
        addedBy: s.user.id,
      };
      // New things go above the ticked-off ones.
      return { ...s, toBuy: [...s.toBuy, item], undo: null };
    }
    case 'addItem': {
      const name = a.name.trim();
      if (!name) return s;
      const item: Item = {
        id: makeId('i'),
        name,
        place: a.place,
        qty: 1,
        unit: '',
        meta: `Added by ${s.user.name}`,
        daysLeft: shelfLifeFor(name, a.place),
        addedBy: s.user.id,
      };
      return { ...s, items: [...s.items, item], undo: null };
    }
    case 'setQty': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      const qty = Math.max(0, a.qty);
      // Used up leaves the list; the undo bar is the way back.
      const usedUp = qty === 0 && item.qty > 0;
      const items = usedUp ? s.items.filter((i) => i.id !== a.id) : s.items.map((i) => (i.id === a.id ? { ...i, qty } : i));
      const undo = usedUp ? withUndo(s, `${item.name} used up`, a.scope) : null;
      return { ...s, items, undo };
    }
    case 'setUseSoon': {
      // Kept only when it disagrees with the date, so agreeing with it goes back to following the date.
      const items = s.items.map((i) => (i.id === a.id ? { ...i, useSoon: a.on === i.daysLeft <= USE_SOON_DAYS ? undefined : a.on } : i));
      return { ...s, items, undo: null };
    }
    case 'setBestBy': {
      // A new date is the newest word on it: the hand-set Use soon goes back to following the date.
      const items = s.items.map((i) =>
        i.id === a.id ? { ...i, daysLeft: a.daysLeft, useSoon: undefined, meta: `Best by ${shortDate(a.daysLeft)}` } : i,
      );
      return { ...s, items, undo: null };
    }
    case 'sortItem': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      // Already in that place under the same name: one item with both counts.
      const same = s.items.find((i) => i.id !== item.id && !i.unsorted && i.place === a.place && sameName(i.name, item.name));
      if (same) return { ...s, items: s.items.filter((i) => i.id !== item.id).map((i) => (i === same ? { ...i, qty: i.qty + item.qty } : i)), undo: null };
      // Its shelf life was only a guess for the guessed place.
      const daysLeft = item.unsorted ? shelfLifeFor(item.name, a.place) : item.daysLeft;
      return { ...s, items: s.items.map((i) => (i === item ? { ...i, place: a.place, unsorted: undefined, daysLeft } : i)), undo: null };
    }
    case 'setUnit': {
      // A new measurement replaces the imported wording ("About 1 cup"), which no longer matches.
      const items = s.items.map((i) => (i.id === a.id ? { ...i, unit: a.unit.trim(), amountText: undefined } : i));
      return { ...s, items, undo: null };
    }
    case 'itemToBuy': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item || s.toBuy.some((t) => !t.done && sameName(t.name, item.name))) return s;
      const note = item.runningLow ? 'Running low' : `Added by ${s.user.name}`;
      const row: ToBuyItem = { id: makeId('t'), name: item.name, note, place: item.place, done: false, addedBy: s.user.id };
      return { ...s, toBuy: [...s.toBuy, row], undo: null };
    }
    case 'addScanned': {
      let items = s.items;
      let toBuy = s.toBuy;
      // Lines that topped up something already in the kitchen, so the undo bar can say why the counts barely moved.
      let merged = 0;
      for (const line of a.lines) {
        if (line.place === 'skip' || !line.name.trim()) continue;
        const place = line.place;
        const existing = items.find((i) => i.place === place && sameName(i.name, line.name));
        if (existing) {
          merged += 1;
          items = items.map((i) =>
            i.id === existing.id ? { ...i, qty: i.qty + line.qty, amountText: undefined, meta: 'From today’s receipt' } : i,
          );
        } else {
          items = [
            ...items,
            {
              id: makeId('i'),
              name: line.name.trim(),
              place,
              qty: line.qty,
              unit: '',
              meta: 'From today’s receipt',
              daysLeft: shelfLifeFor(line.name, place),
              unsorted: true,
              addedBy: s.user.id,
            },
          ];
        }
        // Bought it, so it comes off To Buy.
        toBuy = toBuy.map((t) => (!t.done && sameName(t.name, line.name) ? { ...t, done: true } : t));
      }
      const kitchen = { ...s.kitchen, syncedAgo: 'just now', syncedAt: a.at };
      const lastScan: Record<Place, string[]> = { fridge: [], pantry: [], freezer: [] };
      for (const l of a.lines) if (l.place !== 'skip' && l.name.trim()) lastScan[l.place].push(l.name.trim());
      const session = { ...s.session, lastScan };
      const added = a.lines.filter((l) => l.place !== 'skip' && l.name.trim()).length;
      const text = merged
        ? `Added ${added} ${added === 1 ? 'item' : 'items'}, ${merged} already in your kitchen`
        : `Added ${added} ${added === 1 ? 'item' : 'items'} to your kitchen`;
      const undo = a.undo && added ? withUndo(s, text, 'home') : null;
      return { ...s, items, toBuy, kitchen, session, undo };
    }
    case 'toggleRecipeToBuy': {
      const saved = s.recipes.find((r) => r.id === a.id);
      const recipe = saved && checkRecipe(saved, s.items);
      if (!recipe || recipe.missing.length === 0) return s;
      // The line under each item is how much the recipe needs. Items from before this said `For <title>`.
      const amountOf = (m: string) => recipe.missingAmounts?.[m] ?? '';
      const fromRecipe = (t: ToBuyItem) => recipe.missing.some((m) => sameName(m, t.name) && (t.note === amountOf(m) || t.note === `For ${recipe.title}`));
      let toBuy: ToBuyItem[];
      if (recipe.onToBuy) {
        toBuy = s.toBuy.filter((t) => t.done || !fromRecipe(t));
      } else {
        const add = recipe.missing
          .filter((m) => !s.toBuy.some((t) => !t.done && sameName(t.name, m)))
          .map<ToBuyItem>((m) => ({
            id: makeId('t'),
            name: m,
            note: amountOf(m),
            place: guessPlace(m, s.items),
            done: false,
            addedBy: s.user.id,
          }));
        toBuy = [...s.toBuy, ...add];
      }
      const recipes = s.recipes.map((r) => (r.id === a.id ? { ...r, onToBuy: !r.onToBuy } : r));
      return { ...s, toBuy, recipes, undo: null };
    }
    case 'madeRecipe': {
      const recipe = s.recipes.find((r) => r.id === a.id);
      if (!recipe) return s;
      const used = usedWhenMade(recipe, s.items, STAPLES);
      const items = s.items.map((i) => (used.includes(i) ? { ...i, qty: i.qty - 1 } : i));
      return { ...s, items, undo: withUndo(s, `Made ${recipe.title}`, `recipe:${recipe.id}`) };
    }
    case 'importRecipe': {
      const r = a.recipe;
      if (s.recipes.some((x) => x.id === r.id || (r.url && x.url === r.url))) return s;
      return { ...s, recipes: [...s.recipes, r] };
    }
    case 'rankRecipe':
      if (!s.recipes.some((r) => r.id === a.id)) return s;
      // Indexes count only recipes that still exist (the sheet compares against pruned ranks too).
      return { ...s, ranks: placeAt(pruned(s.ranks, s.recipes.map((r) => r.id)), a.id, a.band, a.index) };
    case 'undo':
      if (!s.undo) return s;
      return { ...s, ...s.undo.snapshot, undo: null };
    case 'clearUndo':
      return s.undo?.scope === a.scope ? { ...s, undo: null } : s;
    case 'expireUndo':
      // Only the undo that timed out; a newer one keeps its own time.
      return s.undo === a.undo ? { ...s, undo: null } : s;
    case 'renameKitchen': {
      const name = a.name.trim();
      return name ? { ...s, kitchen: { ...s.kitchen, name }, undo: null } : s;
    }
    case 'removePerson': {
      const person = s.kitchen.people.find((p) => p.id === a.id);
      if (!person) return s;
      const kitchen = { ...s.kitchen, people: s.kitchen.people.filter((p) => p.id !== a.id) };
      return { ...s, kitchen, undo: withUndo(s, `${person.name} was removed.`, 'household') };
    }
    case 'newInviteLink': {
      // A fresh code kills the old link. The sample kitchen's next code is the one in the design.
      const family = s.kitchen.inviteCode.replace(/-kitchen$|-[a-z0-9]{4}$/, '');
      const fresh = s.kitchen.inviteCode === SEED_KITCHEN.inviteCode ? NEW_INVITE_CODE : `${family}-${Math.random().toString(36).slice(2, 6)}`;
      return { ...s, kitchen: { ...s.kitchen, inviteCode: fresh, newLink: true }, undo: null };
    }
    case 'leaveKitchen':
      // The others keep the kitchen; you start a new, empty one.
      return { ...s, kitchen: newKitchen(s.user), items: [], toBuy: [], recipes: [], ranks: EMPTY_RANKS, undo: null };
    case 'setNotification':
      return { ...s, notifications: { ...s.notifications, [a.key]: a.on } };
    case 'setUseSoonTime':
      return { ...s, notifications: { ...s.notifications, useSoonTime: a.time } };
    case 'signIn': {
      // Someone new is signing in: they start as themselves, not as the sample Alex Rivera.
      // With a backend, the server's profile replaces this on load.
      const contact = a.contact ?? '';
      const user: Person = { id: NEW_PERSON_ID, name: '', note: '', ...(a.method === 'email' && contact ? { email: contact } : {}) };
      return { ...s, user, session: { ...s.session, signIn: a.method, contact } };
    }
    case 'setName': {
      const user = { ...s.user, name: a.name.trim() || s.user.name };
      if (a.lastName !== undefined) user.lastName = a.lastName.trim();
      const people = s.kitchen.people.map((p) => (p.id === user.id ? user : p));
      return { ...s, user, kitchen: { ...s.kitchen, people }, undo: null };
    }
    case 'choosePath': {
      const session = { ...s.session, path: a.path };
      if (a.path === 'join') {
        // Until there's a backend, the only kitchen to join is the sample Rivera kitchen.
        const people = [s.user, ...SEED_KITCHEN.people.filter((p) => p.id !== s.user.id)];
        return { ...s, session, kitchen: { ...SEED_KITCHEN, people }, items: SEED_ITEMS, toBuy: SEED_TO_BUY, recipes: SEED_RECIPES };
      }
      // Just me or a household: a new, empty kitchen. The first scan fills it.
      return { ...s, session, kitchen: newKitchen(s.user), items: [], toBuy: [], recipes: [], ranks: EMPTY_RANKS };
    }
    case 'skipFirstScan':
      // Nothing scanned yet: Home opens as the empty, first-run Home.
      return { ...s, items: [], kitchen: { ...s.kitchen, syncedAgo: '' } };
    case 'finishOnboarding':
      return { ...s, session: { ...s.session, onboarded: true }, undo: null };
    case 'reset':
      return initialState();
    case 'hydrate': {
      const { onboarded, contact, kitchen, ...rest } = a.data;
      const user = rest.user ?? s.user;
      // "Make a new link" stays said until the kitchen changes.
      const k = kitchen === undefined ? s.kitchen : kitchen ? { ...kitchen, newLink: kitchen.id === s.kitchen.id && s.kitchen.newLink } : newKitchen(user);
      const session = { ...s.session, onboarded: onboarded ?? s.session.onboarded, contact: contact ?? s.session.contact };
      return { ...s, ...rest, kitchen: k, session, undo: null };
    }
    case 'restore':
      return { ...s, ...a.saved, undo: null };
  }
}

type Store = {
  state: State;
  actions: ReturnType<typeof makeActions>;
  /** Re-fetches everything for the signed-in person. Does nothing without a backend or a session. */
  reload: () => Promise<void>;
  /** False while a signed-in person's first load is running. */
  ready: boolean;
};

const StoreContext = createContext<Store | null>(null);

function makeActions(dispatch: (a: Action) => void) {
  return {
    toggleToBuy: (id: string, scope: string) => dispatch({ type: 'toggleToBuy', id, scope }),
    /** `amount` is optional: "2 L", "a bunch". */
    addToBuy: (name: string, amount?: string) => dispatch({ type: 'addToBuy', name, amount }),
    addItem: (name: string, place: Place) => dispatch({ type: 'addItem', name, place }),
    setQty: (id: string, qty: number, scope: string) => dispatch({ type: 'setQty', id, qty, scope }),
    addItemToBuy: (id: string) => dispatch({ type: 'itemToBuy', id }),
    /** Use soon by hand, on or off. Matching the date clears the override. */
    setUseSoon: (id: string, on: boolean) => dispatch({ type: 'setUseSoon', id, on }),
    /** A new use-by date, `daysLeft` from today. */
    setBestBy: (id: string, daysLeft: number) => dispatch({ type: 'setBestBy', id, daysLeft }),
    /** What the amount counts in ("g", "cup"); empty counts with × n. */
    setUnit: (id: string, unit: string) => dispatch({ type: 'setUnit', id, unit }),
    /** Puts something from Just bought (or anywhere) away in a place. */
    sortItem: (id: string, place: Place) => dispatch({ type: 'sortItem', id, place }),
    /** With `undo: true`, Home shows "Added N items to your kitchen" with Undo. */
    addScanned: (lines: ScanLine[], opts?: { undo?: boolean }) =>
      dispatch({ type: 'addScanned', lines, undo: opts?.undo, at: new Date().toISOString() }),
    toggleRecipeToBuy: (id: string) => dispatch({ type: 'toggleRecipeToBuy', id }),
    madeRecipe: (id: string) => dispatch({ type: 'madeRecipe', id }),
    importRecipe: (recipe: Recipe) => dispatch({ type: 'importRecipe', recipe }),
    /** Puts the recipe at `index` (best first) in `band`, out of wherever it was. */
    rankRecipe: (id: string, band: Band, index: number) => dispatch({ type: 'rankRecipe', id, band, index }),
    undo: () => dispatch({ type: 'undo' }),
    clearUndo: (scope: string) => dispatch({ type: 'clearUndo', scope }),
    renameKitchen: (name: string) => dispatch({ type: 'renameKitchen', name }),
    removePerson: (id: string) => dispatch({ type: 'removePerson', id }),
    newInviteLink: () => dispatch({ type: 'newInviteLink' }),
    leaveKitchen: () => dispatch({ type: 'leaveKitchen' }),
    setNotification: (key: NotificationKey, on: boolean) => dispatch({ type: 'setNotification', key, on }),
    setUseSoonTime: (time: string) => dispatch({ type: 'setUseSoonTime', time }),
    signIn: (method: NonNullable<Session['signIn']>, contact?: string) => dispatch({ type: 'signIn', method, contact }),
    /** Pass `last` to set the last name too; an empty string clears it. */
    setName: (first: string, last?: string) => dispatch({ type: 'setName', name: first, lastName: last }),
    choosePath: (path: KitchenPath) => dispatch({ type: 'choosePath', path }),
    skipFirstScan: () => dispatch({ type: 'skipFirstScan' }),
    finishOnboarding: () => dispatch({ type: 'finishOnboarding' }),
    /** Log out or delete the account: back to Welcome with the sample data, and the saved copy cleared. */
    reset: () => dispatch({ type: 'reset' }),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // The copy kept on the phone, loaded on the first render before the splash hides, so a
  // signed-in person opens to their kitchen (even offline) and onboarding doesn't flash.
  const [cached] = useState(loadSaved);
  const [state, dispatch] = useReducer(reducer, cached, (c) => (c ? reducer(initialState(), { type: 'restore', saved: c }) : initialState()));
  const { session, ready: authReady } = useAuth();
  // With a backend, whose kitchen the phone's copy is; the server's load still wins.
  const cachedFor = hasBackend ? cached?.user.id : undefined;
  // The person whose first load has finished, so the loader shows once per sign-in.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // What the server is known to hold (`synced`), the last write it confirmed (`confirmed`),
  // and how many writes are still on their way.
  // The restored copy is the baseline, like a hydrate, so it is never written back as local edits.
  const restored: Synced | null =
    hasBackend && cached ? { kitchen: state.kitchen, items: state.items, toBuy: state.toBuy, recipes: state.recipes } : null;
  const synced = useRef<Synced | null>(restored);
  const confirmed = useRef<Synced | null>(restored);
  const chain = useRef(Promise.resolve());
  const pending = useRef(0);
  const writes = useRef(0);
  const reloadAfterWrites = useRef(false);
  const sessionRef = useRef(session);
  const kitchenId = useRef(state.kitchen.id);
  // Declared before the load effect, so reload sees this render's session.
  useEffect(() => {
    sessionRef.current = session;
    kitchenId.current = state.kitchen.id;
  });

  const reload = useCallback(async () => {
    const s = sessionRef.current;
    if (!hasBackend || !s) return;
    const startedAt = writes.current;
    const data = await loadAll(s.user.id, { email: s.user.email, phone: s.user.phone });
    // A local change happened meanwhile: this load may miss it, so load again once it's written.
    if (pending.current || writes.current !== startedAt) {
      reloadAfterWrites.current = true;
      return;
    }
    const snapshot: Synced = { kitchen: data.kitchen, items: data.items, toBuy: data.toBuy, recipes: data.recipes };
    // Set before dispatching, so the write effect sees no difference and nothing echoes back.
    synced.current = snapshot;
    confirmed.current = snapshot;
    dispatch({ type: 'hydrate', data });
  }, []);

  const userId = session?.user.id;
  // The phone's copy belongs to someone else (or nobody is signed in any more): drop it.
  useEffect(() => {
    if (!authReady || !cachedFor || cachedFor === userId || state.user.id !== cachedFor) return;
    synced.current = confirmed.current = null;
    dispatch({ type: 'reset' });
  }, [authReady, userId, cachedFor, state.user.id]);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      synced.current = confirmed.current = null;
      return;
    }
    // shortcut: a failed first load (offline) opens the app on local data, add a retry screen if testers hit it.
    // A stalled load opens it on local data too after a wait; the load still lands when it answers.
    const waited = setTimeout(() => setLoadedFor(userId), LOAD_WAIT_MS);
    reload()
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(waited);
        setLoadedFor(userId);
      });
    return () => clearTimeout(waited);
  }, [authReady, userId, reload]);

  // Saved after every change, without the undo. Not signed in (or, with a backend, not this
  // person's kitchen yet): nothing to keep, and log out clears the copy.
  useEffect(() => {
    if (!authReady) return;
    const mine = hasBackend ? !!userId && state.user.id === userId : !!state.session.signIn;
    if (mine) save(state);
    else clearSaved();
  }, [state, authReady, userId]);

  // Write-through: whatever changed since the server last matched goes up.
  useEffect(() => {
    const prev = synced.current;
    const id = state.kitchen.id;
    if (!hasBackend || !id || !prev || prev.kitchen?.id !== id) return;
    if (prev.items === state.items && prev.toBuy === state.toBuy && prev.recipes === state.recipes && prev.kitchen?.name === state.kitchen.name) return;
    const next: Synced = { kitchen: state.kitchen, items: state.items, toBuy: state.toBuy, recipes: state.recipes };
    synced.current = next;
    pending.current++;
    writes.current++;
    // One write at a time, in order, each against the one before it.
    chain.current = chain.current
      .then(() => writeDiff(id, prev, next, new Date()))
      .then(
        () => {
          confirmed.current = next;
        },
        () => {
          // shortcut: no offline queue, writes need a connection; add a queue if testers hit it.
          const back = confirmed.current;
          synced.current = back;
          if (back) dispatch({ type: 'hydrate', data: back });
          reloadAfterWrites.current = true;
        },
      )
      .finally(() => {
        pending.current--;
        if (!pending.current && reloadAfterWrites.current) {
          reloadAfterWrites.current = false;
          reload().catch(() => undefined);
        }
      });
  }, [state.kitchen, state.items, state.toBuy, state.recipes, reload]);

  // Other people's changes. shortcut: whole refetch on any event, fine for household-sized kitchens.
  const liveId = state.kitchen.id;
  useEffect(() => {
    if (!hasBackend || !liveId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeKitchen(liveId, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending.current) reloadAfterWrites.current = true;
        else reload().catch(() => undefined);
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [liveId, reload]);

  const actions = useMemo(() => {
    const base = makeActions(dispatch);
    return {
      ...base,
      addScanned: (lines: ScanLine[], opts?: { undo?: boolean }) => {
        base.addScanned(lines, opts);
        if (hasBackend && kitchenId.current) markSynced(kitchenId.current).catch(() => undefined);
      },
    };
  }, []);
  // Screens see recipes checked against the kitchen, with Tonight's pick marked.
  const recipes = useMemo(() => checkRecipes(state.recipes, state.items), [state.recipes, state.items]);
  // Undo bars go away by themselves after a few seconds, unless a newer one replaced them.
  // Not with a screen reader on: finding the bar takes longer than that, so it stays until the next change.
  const undo = state.undo;
  const reader = useScreenReader();
  useEffect(() => {
    if (!undo || reader) return;
    const timer = setTimeout(() => dispatch({ type: 'expireUndo', undo }), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo, reader]);
  const ready = authReady && (!userId || loadedFor === userId || (cachedFor === userId && state.user.id === userId));
  const value = useMemo(() => ({ state: { ...state, recipes }, actions, reload, ready }), [state, recipes, actions, reload, ready]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** True while VoiceOver or TalkBack is on. */
function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => live && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/** The undo for one screen, or null. It goes away when you leave the screen. */
export function useUndo(scope: string): Undo | null {
  const { state, actions } = useStore();
  useFocusEffect(useCallback(() => () => actions.clearUndo(scope), [actions, scope]));
  return state.undo?.scope === scope ? state.undo : null;
}

