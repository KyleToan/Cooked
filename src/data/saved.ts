// The copy of the kitchen kept on the phone between launches, in
// `localStorage` (expo-sqlite's on iOS and Android, the browser's on web).
// Items are kept with a best-by date, so "2 days left" counts down.

import { bestByFromDays, daysFromBestBy } from './helpers';
import { EMPTY_RANKS } from './ranking';
import type { Synced } from './remote';
import type { State } from './store';
import type { Item } from './types';

export type Saved = Pick<State, 'session' | 'user' | 'kitchen' | 'items' | 'toBuy' | 'recipes' | 'notifications' | 'ranks'>;

type SavedItem = Omit<Item, 'daysLeft'> & { bestBy: string };

/** Bump when the saved shape changes; a copy with another version is dropped. */
export const SAVE_VERSION = 1;
const KEY = 'cooked.state';
const SERVER_KEY = 'cooked.server';

export function toSaved(s: State, today: Date): string {
  const { session, user, kitchen, toBuy, recipes, notifications, ranks } = s;
  const items: SavedItem[] = s.items.map(({ daysLeft, ...rest }) => ({ ...rest, bestBy: bestByFromDays(daysLeft, today) }));
  return JSON.stringify({ version: SAVE_VERSION, session, user, kitchen, items, toBuy, recipes, notifications, ranks });
}

/** The saved kitchen, or null when there's none, it's another version or it can't be read. */
export function fromSaved(text: string | null, today: Date): Saved | null {
  if (!text) return null;
  try {
    const { version, items, ...rest } = JSON.parse(text);
    if (version !== SAVE_VERSION || !Array.isArray(items)) return null;
    return {
      // Copies saved before ranking have none.
      ranks: EMPTY_RANKS,
      ...rest,
      items: (items as SavedItem[]).map(({ bestBy, ...item }) => ({ ...item, daysLeft: daysFromBestBy(bestBy, today) })),
    };
  } catch {
    return null;
  }
}

// localStorage is missing in tests, and a storage error must never stop the app opening.
export function loadSaved(): Saved | null {
  try {
    return fromSaved(globalThis.localStorage?.getItem(KEY) ?? null, new Date());
  } catch {
    return null;
  }
}

export function save(s: State) {
  try {
    globalThis.localStorage?.setItem(KEY, toSaved(s, new Date()));
  } catch {
    // Nothing to do: the next change tries again.
  }
}

export function clearSaved() {
  try {
    globalThis.localStorage?.removeItem(KEY);
    globalThis.localStorage?.removeItem(SERVER_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * What the server held when it last confirmed a write. Kept so changes made offline still go up
 * after the app is closed: on the next launch the difference from this copy is sent.
 */
export function saveServerCopy(c: Synced | null) {
  try {
    if (!c) return globalThis.localStorage?.removeItem(SERVER_KEY);
    const items: SavedItem[] = c.items.map(({ daysLeft, ...rest }) => ({ ...rest, bestBy: bestByFromDays(daysLeft, new Date()) }));
    globalThis.localStorage?.setItem(SERVER_KEY, JSON.stringify({ version: SAVE_VERSION, ...c, items }));
  } catch {
    // Nothing to do: the next confirmed write tries again.
  }
}

/** The server's last confirmed copy, or null. */
export function loadServerCopy(): Synced | null {
  try {
    const text = globalThis.localStorage?.getItem(SERVER_KEY);
    if (!text) return null;
    const { version, items, kitchen, toBuy, recipes } = JSON.parse(text);
    if (version !== SAVE_VERSION || !Array.isArray(items)) return null;
    const today = new Date();
    return {
      kitchen,
      toBuy,
      recipes,
      items: (items as SavedItem[]).map(({ bestBy, ...item }) => ({ ...item, daysLeft: daysFromBestBy(bestBy, today) })),
    };
  } catch {
    return null;
  }
}
