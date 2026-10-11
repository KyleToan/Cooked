// The local store: one reducer holds the kitchen, and every change goes
// through the `actions` object at the bottom. A backend can replace this file
// later without the screens changing.

import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { guessPlace, makeId } from './helpers';
import {
  ALEX,
  NEW_INVITE_CODE,
  SEED_ITEMS,
  SEED_KITCHEN,
  SEED_NOTIFICATIONS,
  SEED_RECIPES,
  SEED_TO_BUY,
  SHAKSHUKA,
  STAPLES,
} from './seed';
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

export type State = {
  session: Session;
  user: Person;
  kitchen: Kitchen;
  items: Item[];
  toBuy: ToBuyItem[];
  recipes: Recipe[];
  notifications: NotificationSettings;
  undo: Undo | null;
};

const DEFAULT_DAYS: Record<Place, number> = { fridge: 7, pantry: 180, freezer: 90 };

export function initialState(): State {
  return {
    session: { onboarded: false, signIn: null, contact: '', path: null, lastScan: { fridge: [], pantry: [], freezer: [] } },
    user: ALEX,
    kitchen: SEED_KITCHEN,
    items: SEED_ITEMS,
    toBuy: SEED_TO_BUY,
    recipes: SEED_RECIPES,
    notifications: SEED_NOTIFICATIONS,
    undo: null,
  };
}

type Action =
  | { type: 'toggleToBuy'; id: string; scope: string }
  | { type: 'addToBuy'; name: string; place?: Place }
  | { type: 'addItem'; name: string; place: Place }
  | { type: 'setQty'; id: string; qty: number; scope: string }
  | { type: 'itemToBuy'; id: string }
  | { type: 'addScanned'; lines: ScanLine[] }
  | { type: 'toggleRecipeToBuy'; id: string }
  | { type: 'madeRecipe'; id: string }
  | { type: 'importRecipe' }
  | { type: 'undo' }
  | { type: 'clearUndo'; scope: string }
  | { type: 'renameKitchen'; name: string }
  | { type: 'removePerson'; id: string }
  | { type: 'newInviteLink' }
  | { type: 'leaveKitchen' }
  | { type: 'setNotification'; key: NotificationKey; on: boolean }
  | { type: 'setUseSoonTime'; time: string }
  | { type: 'signIn'; method: NonNullable<Session['signIn']>; contact?: string }
  | { type: 'setName'; name: string }
  | { type: 'choosePath'; path: KitchenPath }
  | { type: 'skipFirstScan' }
  | { type: 'finishOnboarding' }
  | { type: 'reset' };

const snap = (s: State): Snapshot => ({ items: s.items, toBuy: s.toBuy, kitchen: s.kitchen, recipes: s.recipes });

const withUndo = (s: State, text: string, scope: string): Undo => ({ text, scope, snapshot: snap(s) });

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A new, empty kitchen named after the person: "Rivera kitchen", cooked.app/join/rivera-kitchen. */
const newKitchen = (user: Person): Kitchen => {
  const family = user.lastName || user.name;
  return {
    name: `${family} kitchen`,
    people: [{ ...user, note: 'Made this kitchen' }],
    inviteCode: `${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-kitchen`,
    newLink: false,
    syncedAgo: '',
  };
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'toggleToBuy': {
      const item = s.toBuy.find((t) => t.id === a.id);
      if (!item) return s;
      const toBuy = s.toBuy.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t));
      // Ticking off can be undone; unticking is its own undo.
      const undo = item.done ? null : withUndo(s, `${item.name} ticked off`, a.scope);
      return { ...s, toBuy, undo };
    }
    case 'addToBuy': {
      const name = a.name.trim();
      if (!name) return s;
      const item: ToBuyItem = {
        id: makeId('t'),
        name,
        note: `Added by ${s.user.name}`,
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
        daysLeft: DEFAULT_DAYS[a.place],
        addedBy: s.user.id,
      };
      return { ...s, items: [...s.items, item], undo: null };
    }
    case 'setQty': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      const qty = Math.max(0, a.qty);
      const items = s.items.map((i) => (i.id === a.id ? { ...i, qty } : i));
      const undo = qty === 0 && item.qty > 0 ? withUndo(s, `${item.name} used up`, a.scope) : s.undo;
      return { ...s, items, undo };
    }
    case 'itemToBuy': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item || s.toBuy.some((t) => !t.done && sameName(t.name, item.name))) return s;
      const note = item.runningLow ? 'Running low' : `Added by ${s.user.name}`;
      const row: ToBuyItem = { id: makeId('t'), name: item.name, note, place: item.place, done: false, addedBy: s.user.id };
      return { ...s, toBuy: [...s.toBuy, row] };
    }
    case 'addScanned': {
      let items = s.items;
      let toBuy = s.toBuy;
      for (const line of a.lines) {
        if (line.place === 'skip' || !line.name.trim()) continue;
        const place = line.place;
        const existing = items.find((i) => i.place === place && sameName(i.name, line.name));
        if (existing) {
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
              daysLeft: DEFAULT_DAYS[place],
              addedBy: s.user.id,
            },
          ];
        }
        // Bought it, so it comes off To Buy.
        toBuy = toBuy.map((t) => (!t.done && sameName(t.name, line.name) ? { ...t, done: true } : t));
      }
      const kitchen = { ...s.kitchen, syncedAgo: 'just now' };
      const lastScan: Record<Place, string[]> = { fridge: [], pantry: [], freezer: [] };
      for (const l of a.lines) if (l.place !== 'skip' && l.name.trim()) lastScan[l.place].push(l.name.trim());
      const session = { ...s.session, lastScan };
      return { ...s, items, toBuy, kitchen, session, undo: null };
    }
    case 'toggleRecipeToBuy': {
      const recipe = s.recipes.find((r) => r.id === a.id);
      if (!recipe || recipe.missing.length === 0) return s;
      const note = `For ${recipe.title}`;
      let toBuy: ToBuyItem[];
      if (recipe.onToBuy) {
        toBuy = s.toBuy.filter((t) => !(t.note === note && !t.done && recipe.missing.some((m) => sameName(m, t.name))));
      } else {
        const add = recipe.missing
          .filter((m) => !s.toBuy.some((t) => !t.done && sameName(t.name, m)))
          .map<ToBuyItem>((m) => ({
            id: makeId('t'),
            name: m,
            note,
            place: guessPlace(m, s.items),
            done: false,
            addedBy: s.user.id,
          }));
        toBuy = [...s.toBuy, ...add];
      }
      const recipes = s.recipes.map((r) => (r.id === a.id ? { ...r, onToBuy: !r.onToBuy } : r));
      return { ...s, toBuy, recipes };
    }
    case 'madeRecipe': {
      const recipe = s.recipes.find((r) => r.id === a.id);
      if (!recipe) return s;
      const used = recipe.ingredients.filter((g) => g.have && !STAPLES.includes(g.name));
      const items = s.items.map((i) =>
        i.qty > 0 && used.some((g) => g.place === i.place && sameName(g.name, i.name)) ? { ...i, qty: i.qty - 1 } : i,
      );
      return { ...s, items, undo: withUndo(s, `Made ${recipe.title}`, `recipe:${recipe.id}`) };
    }
    case 'importRecipe': {
      if (s.recipes.some((r) => r.id === SHAKSHUKA.id)) return s;
      return { ...s, recipes: [...s.recipes, SHAKSHUKA] };
    }
    case 'undo':
      if (!s.undo) return s;
      return { ...s, ...s.undo.snapshot, undo: null };
    case 'clearUndo':
      return s.undo?.scope === a.scope ? { ...s, undo: null } : s;
    case 'renameKitchen': {
      const name = a.name.trim();
      return name ? { ...s, kitchen: { ...s.kitchen, name } } : s;
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
      return { ...s, kitchen: { ...s.kitchen, inviteCode: fresh, newLink: true } };
    }
    case 'leaveKitchen':
      // The others keep the kitchen; you start a new, empty one.
      return { ...s, kitchen: newKitchen(s.user), items: [], toBuy: [], recipes: [], undo: null };
    case 'setNotification':
      return { ...s, notifications: { ...s.notifications, [a.key]: a.on } };
    case 'setUseSoonTime':
      return { ...s, notifications: { ...s.notifications, useSoonTime: a.time } };
    case 'signIn':
      return { ...s, session: { ...s.session, signIn: a.method, contact: a.contact ?? '' } };
    case 'setName': {
      const user = { ...s.user, name: a.name.trim() || s.user.name };
      const people = s.kitchen.people.map((p) => (p.id === user.id ? user : p));
      return { ...s, user, kitchen: { ...s.kitchen, people } };
    }
    case 'choosePath': {
      const session = { ...s.session, path: a.path };
      if (a.path === 'join') {
        // Until there's a backend, the only kitchen to join is the sample Rivera kitchen.
        const people = [s.user, ...SEED_KITCHEN.people.filter((p) => p.id !== s.user.id)];
        return { ...s, session, kitchen: { ...SEED_KITCHEN, people }, items: SEED_ITEMS, toBuy: SEED_TO_BUY, recipes: SEED_RECIPES };
      }
      // Just me or a household: a new, empty kitchen. The first scan fills it.
      return { ...s, session, kitchen: newKitchen(s.user), items: [], toBuy: [], recipes: [] };
    }
    case 'skipFirstScan':
      // Nothing scanned yet: Home opens as the empty, first-run Home.
      return { ...s, items: [], kitchen: { ...s.kitchen, syncedAgo: '' } };
    case 'finishOnboarding':
      return { ...s, session: { ...s.session, onboarded: true }, undo: null };
    case 'reset':
      return initialState();
  }
}

type Store = { state: State; actions: ReturnType<typeof makeActions> };

const StoreContext = createContext<Store | null>(null);

function makeActions(dispatch: (a: Action) => void) {
  return {
    toggleToBuy: (id: string, scope: string) => dispatch({ type: 'toggleToBuy', id, scope }),
    addToBuy: (name: string, place?: Place) => dispatch({ type: 'addToBuy', name, place }),
    addItem: (name: string, place: Place) => dispatch({ type: 'addItem', name, place }),
    setQty: (id: string, qty: number, scope: string) => dispatch({ type: 'setQty', id, qty, scope }),
    addItemToBuy: (id: string) => dispatch({ type: 'itemToBuy', id }),
    addScanned: (lines: ScanLine[]) => dispatch({ type: 'addScanned', lines }),
    toggleRecipeToBuy: (id: string) => dispatch({ type: 'toggleRecipeToBuy', id }),
    madeRecipe: (id: string) => dispatch({ type: 'madeRecipe', id }),
    importRecipe: () => dispatch({ type: 'importRecipe' }),
    undo: () => dispatch({ type: 'undo' }),
    clearUndo: (scope: string) => dispatch({ type: 'clearUndo', scope }),
    renameKitchen: (name: string) => dispatch({ type: 'renameKitchen', name }),
    removePerson: (id: string) => dispatch({ type: 'removePerson', id }),
    newInviteLink: () => dispatch({ type: 'newInviteLink' }),
    leaveKitchen: () => dispatch({ type: 'leaveKitchen' }),
    setNotification: (key: NotificationKey, on: boolean) => dispatch({ type: 'setNotification', key, on }),
    setUseSoonTime: (time: string) => dispatch({ type: 'setUseSoonTime', time }),
    signIn: (method: NonNullable<Session['signIn']>, contact?: string) => dispatch({ type: 'signIn', method, contact }),
    setName: (name: string) => dispatch({ type: 'setName', name }),
    choosePath: (path: KitchenPath) => dispatch({ type: 'choosePath', path }),
    skipFirstScan: () => dispatch({ type: 'skipFirstScan' }),
    finishOnboarding: () => dispatch({ type: 'finishOnboarding' }),
    /** Log out or delete the account: back to Welcome with the sample data. */
    reset: () => dispatch({ type: 'reset' }),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const actions = useMemo(() => makeActions(dispatch), []);
  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
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

