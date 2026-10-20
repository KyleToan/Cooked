// Mapping between the store's types and the Supabase tables (pure, tested), then the
// network calls the store makes: load, write a diff, mark synced, listen for changes.
import { bestByFromDays, daysFromBestBy } from './helpers';
import { supabase } from './supabase';
import type { Item, Kitchen, NotificationSettings, Person, Place, Recipe, ToBuyItem } from './types';

// shortcut: hand-written row types, replace with generated src/data/db.ts once the Supabase project is linked.
// The date math lives in helpers.ts; re-exported so callers and tests can keep importing it from here.
export { bestByFromDays, daysFromBestBy };

export type ItemRow = {
  id: string;
  kitchen_id: string;
  name: string;
  place: Place;
  /** Null when nobody counted it. */
  qty: number | null;
  unit: string;
  amount_text: string | null;
  meta: string;
  /** 'YYYY-MM-DD'. */
  best_by: string;
  running_low: boolean;
  /** Null follows the date; true or false is set by hand. */
  use_soon: boolean | null;
  added_by: string | null;
};

export type ToBuyRow = {
  id: string;
  kitchen_id: string;
  name: string;
  note: string;
  place: Place;
  done: boolean;
  added_by: string | null;
};

/** `have` is saved: for things the kitchen doesn't track it's the only record (see haveIngredient). */
export type IngredientJson = { name: string; place: Place; have: boolean; amount?: string };

export type RecipeRow = {
  id: string;
  kitchen_id: string;
  title: string;
  time: string;
  servings: string | null;
  photo: string | null;
  source_line: string;
  source_link: string;
  url: string | null;
  ingredients: IngredientJson[];
  steps: string[];
  on_to_buy: boolean;
  saved_by: string | null;
};

export type KitchenRow = {
  id: string;
  name: string;
  created_by: string | null;
  synced_at: string | null;
};

export function itemToRow(item: Item, kitchenId: string, today: Date): ItemRow {
  return {
    id: item.id,
    kitchen_id: kitchenId,
    name: item.name,
    place: item.place,
    qty: item.qty ?? null,
    unit: item.unit,
    amount_text: item.amountText ?? null,
    meta: item.meta,
    best_by: bestByFromDays(item.daysLeft, today),
    running_low: item.runningLow ?? false,
    use_soon: item.useSoon ?? null,
    added_by: item.addedBy || null,
  };
}

export function rowToItem(row: ItemRow, today: Date): Item {
  return {
    id: row.id,
    name: row.name,
    place: row.place,
    qty: row.qty ?? undefined,
    unit: row.unit,
    amountText: row.amount_text ?? undefined,
    meta: row.meta,
    daysLeft: daysFromBestBy(row.best_by, today),
    runningLow: row.running_low || undefined,
    useSoon: row.use_soon ?? undefined,
    addedBy: row.added_by ?? '',
  };
}

export function toBuyToRow(t: ToBuyItem, kitchenId: string): ToBuyRow {
  return {
    id: t.id,
    kitchen_id: kitchenId,
    name: t.name,
    note: t.note,
    place: t.place,
    done: t.done,
    added_by: t.addedBy || null,
  };
}

export function rowToToBuy(row: ToBuyRow): ToBuyItem {
  return { id: row.id, name: row.name, note: row.note, place: row.place, done: row.done, addedBy: row.added_by ?? '' };
}

/**
 * Only the saved fields. The ingredient list is the whole list: the ones you have
 * plus `missing` (with their amounts) as have: false, so checkRecipes can work out have/need/missing again.
 * shortcut: list-only recipes that count more than they name lose the extra count, store `need` if they come back.
 */
export function recipeToRow(r: Recipe, kitchenId: string): RecipeRow {
  return {
    id: r.id,
    kitchen_id: kitchenId,
    title: r.title,
    time: r.time,
    servings: r.servings ?? null,
    photo: r.photo ?? null,
    source_line: r.sourceLine,
    source_link: r.sourceLink,
    url: r.url ?? null,
    ingredients: [
      ...r.ingredients.map(({ name, place, have, amount }) => ({ name, place, have, amount })),
      ...r.missing.map((name) => ({ name, place: 'pantry' as Place, have: false, amount: r.missingAmounts?.[name] })),
    ].map(({ amount, ...g }) => (amount === undefined ? g : { ...g, amount })),
    steps: r.steps,
    on_to_buy: r.onToBuy,
    saved_by: r.savedBy ?? null,
  };
}

/** Loaded recipes start unchecked; run them through checkRecipes before showing them. */
export function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    time: row.time,
    servings: row.servings ?? undefined,
    savedBy: row.saved_by ?? undefined,
    photo: row.photo ?? undefined,
    sourceLine: row.source_line,
    sourceLink: row.source_link,
    // shortcut: no imported column, derived from the source line every import writes; add a column if the wording changes.
    imported: row.source_line.startsWith('Imported from'),
    url: row.url ?? undefined,
    need: 0,
    have: 0,
    missing: [],
    ingredients: row.ingredients,
    steps: row.steps,
    onToBuy: row.on_to_buy,
  };
}

/** "just now", "5m ago", "2h ago", "3d ago"; '' before the first sync. */
export function syncedAgo(syncedAt: string | null, now: Date): string {
  if (!syncedAt) return '';
  const mins = Math.floor((now.getTime() - new Date(syncedAt).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

/**
 * What changed between two versions of a table. The reducer replaces a changed
 * row with a new object and keeps unchanged rows by reference, so a reference
 * check is enough (and cheap). A restored snapshot (undo) brings back the old
 * objects, which shows up as upserts against the edited state.
 */
export function diffRows<T extends { id: string }>(prev: T[], next: T[]): { upserts: T[]; deletes: string[] } {
  const before = new Map(prev.map((r) => [r.id, r]));
  const ids = new Set(next.map((r) => r.id));
  return {
    // Same row, or the same content (a copy read back from the phone after a restart): nothing to send.
    upserts: next.filter((r) => {
      const was = before.get(r.id);
      return was !== r && (!was || JSON.stringify(was) !== JSON.stringify(r));
    }),
    deletes: prev.filter((r) => !ids.has(r.id)).map((r) => r.id),
  };
}

// ─── Network ─────────────────────────────────────────────────────────────────

/** Everything the store needs for one signed-in person. `kitchen` is null until they make or join one. */
export type Loaded = {
  user: Person;
  kitchen: Kitchen | null;
  items: Item[];
  toBuy: ToBuyItem[];
  recipes: Recipe[];
  notifications: NotificationSettings;
  onboarded: boolean;
  contact: string;
};

/** The tables the store writes through, as of one moment. */
export type Synced = Pick<Loaded, 'kitchen' | 'items' | 'toBuy' | 'recipes'>;

type Result = { error: unknown; status?: number };

/** A failed request, with the HTTP status the server answered (0 when it never got there). */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function check<T extends Result>(r: T): T {
  if (r.error) throw new RequestError((r.error as { message?: string }).message ?? 'Request failed', r.status ?? 0);
  return r;
}

/**
 * How a write failed. 'offline' (no answer) and 'server' (a 5xx) are worth retrying with the change kept;
 * 'rejected' (a 4xx: not allowed any more, bad data) never will work, so the change is undone.
 */
export function writeFailure(e: unknown): 'offline' | 'server' | 'rejected' {
  const status = e instanceof RequestError ? e.status : 0;
  if (!status) return 'offline';
  return status >= 400 && status < 500 ? 'rejected' : 'server';
}

function client() {
  if (!supabase) throw new Error('No backend');
  return supabase;
}

const joinedNote = (iso: string) =>
  `Joined ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

export async function loadAll(userId: string, contact: { email?: string; phone?: string }): Promise<Loaded> {
  const db = client();
  const today = new Date();
  const [profile, membership] = await Promise.all([
    db.from('profiles').select('name, last_name, onboarded_at, notifications').eq('id', userId).single().then(check),
    db.from('kitchen_members').select('kitchen_id').eq('user_id', userId).maybeSingle().then(check),
  ]);
  const p = profile.data as { name: string; last_name: string | null; onboarded_at: string | null; notifications: NotificationSettings };
  const base: Person = { id: userId, name: p.name, lastName: p.last_name ?? undefined, email: contact.email, note: '' };
  const loaded = {
    notifications: p.notifications,
    onboarded: p.onboarded_at != null,
    contact: contact.email ?? contact.phone ?? '',
  };
  const kitchenId = (membership.data as { kitchen_id: string } | null)?.kitchen_id;
  if (!kitchenId) return { ...loaded, user: base, kitchen: null, items: [], toBuy: [], recipes: [] };

  const [kitchen, members, invite, items, toBuy, recipes] = await Promise.all([
    db.from('kitchens').select('id, name, created_by, synced_at').eq('id', kitchenId).single().then(check),
    db.from('kitchen_members').select('user_id, joined_at').eq('kitchen_id', kitchenId).order('joined_at').then(check),
    db
      .from('invites')
      .select('code')
      .eq('kitchen_id', kitchenId)
      .eq('revoked', false)
      .is('used_by', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(check),
    db.from('items').select('*').eq('kitchen_id', kitchenId).order('updated_at').then(check),
    db.from('to_buy').select('*').eq('kitchen_id', kitchenId).order('updated_at').then(check),
    db.from('recipes').select('*').eq('kitchen_id', kitchenId).order('updated_at').then(check),
  ]);
  const k = kitchen.data as KitchenRow;
  const memberRows = members.data as { user_id: string; joined_at: string }[];
  // kitchen_members and profiles both point at auth.users, so PostgREST can't embed one in the other.
  const profiles = check(
    await db.from('profiles').select('id, name, last_name').in('id', memberRows.map((m) => m.user_id)),
  ).data as { id: string; name: string; last_name: string | null }[];
  const people = memberRows.map<Person>((m) => {
    const pr = profiles.find((x) => x.id === m.user_id);
    return {
      id: m.user_id,
      name: pr?.name ?? '',
      lastName: pr?.last_name ?? undefined,
      email: m.user_id === userId ? contact.email : undefined,
      note: m.user_id === k.created_by ? 'Made this kitchen' : joinedNote(m.joined_at),
    };
  });
  const user = people.find((x) => x.id === userId) ?? base;
  return {
    ...loaded,
    user,
    kitchen: {
      id: k.id,
      createdBy: k.created_by ?? undefined,
      name: k.name,
      people,
      inviteCode: (invite.data as { code: string } | null)?.code ?? '',
      newLink: false,
      syncedAgo: syncedAgo(k.synced_at, today),
    },
    items: (items.data as ItemRow[]).map((r) => rowToItem(r, today)),
    toBuy: (toBuy.data as ToBuyRow[]).map(rowToToBuy),
    recipes: (recipes.data as RecipeRow[]).map(rowToRecipe),
  };
}

async function writeTable<T extends { id: string }>(table: string, prev: T[], next: T[], toRow: (t: T) => object) {
  const db = client();
  const { upserts, deletes } = diffRows(prev, next);
  await Promise.all([
    upserts.length ? db.from(table).upsert(upserts.map(toRow)).then(check) : null,
    deletes.length ? db.from(table).delete().in('id', deletes).then(check) : null,
  ]);
}

/** Writes what changed from `prev` to `next`. Throws on the first failed request. */
export async function writeDiff(kitchenId: string, prev: Synced, next: Synced, today: Date): Promise<void> {
  const name = next.kitchen?.name;
  await Promise.all([
    writeTable('items', prev.items, next.items, (i) => itemToRow(i, kitchenId, today)),
    writeTable('to_buy', prev.toBuy, next.toBuy, (t) => toBuyToRow(t, kitchenId)),
    writeTable('recipes', prev.recipes, next.recipes, (r) => recipeToRow(r, kitchenId)),
    name && name !== prev.kitchen?.name ? client().from('kitchens').update({ name }).eq('id', kitchenId).then(check) : null,
  ]);
}

/** "Synced just now from a receipt" on Home. */
export async function markSynced(kitchenId: string): Promise<void> {
  check(await client().from('kitchens').update({ synced_at: new Date().toISOString() }).eq('id', kitchenId));
}

export type KitchenTable = 'items' | 'to_buy' | 'recipes' | 'kitchens' | 'kitchen_members';

/** Calls onChange with the table whenever anyone changes this kitchen. Returns the unsubscribe. */
export function subscribeKitchen(kitchenId: string, onChange: (table: KitchenTable) => void): () => void {
  const db = client();
  const channel = db.channel(`kitchen:${kitchenId}`);
  const tables: KitchenTable[] = ['items', 'to_buy', 'recipes', 'kitchen_members', 'kitchens'];
  for (const table of tables) {
    const filter = table === 'kitchens' ? `id=eq.${kitchenId}` : `kitchen_id=eq.${kitchenId}`;
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => onChange(table));
  }
  channel.subscribe();
  return () => {
    db.removeChannel(channel);
  };
}
