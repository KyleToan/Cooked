import * as Crypto from 'expo-crypto';

import type { Item, Place, Recipe, ScanFlow, ToBuyItem } from './types';

/** "Up late" before 5am, "Good morning" before noon, "Good afternoon" before 5pm, "Good evening" after. */
export function timeOfDay(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function greeting(name: string, date = new Date()): string {
  return `${timeOfDay(date)}, ${name}`;
}

/** Food that needs using in the next two days, or that's been flagged (leftovers). */
export const USE_SOON_DAYS = 2;

/** Whether it's due soon by date, whatever is left of it. Decides the Use soon section in Kitchen.
 * `useSoon` set by hand wins either way; unset follows the date. */
export function isDueSoon(item: Item): boolean {
  return item.useSoon ?? item.daysLeft <= USE_SOON_DAYS;
}

/** Due soon and still there: the "2 use soon" flag and the recipe labels. */
export function isUseSoon(item: Item): boolean {
  return item.qty > 0 && isDueSoon(item);
}

export function inStock(items: Item[], place?: Place): Item[] {
  return items.filter((i) => i.qty > 0 && (!place || i.place === place));
}

export const PLACES: Place[] = ['fridge', 'pantry', 'freezer'];

export const PLACE_LABEL: Record<Place, string> = { fridge: 'Fridge', pantry: 'Pantry', freezer: 'Freezer' };

/** "1 item", "8 items". */
export function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "tomatoes and feta", "pine nuts, parmesan and garlic". */
/** "just now", "5m ago", "2h ago", "3d ago"; '' before the first sync. */
export function syncedAgo(syncedAt: string | null, now: Date): string {
  if (!syncedAt) return '';
  const mins = Math.floor((now.getTime() - new Date(syncedAt).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

/** "2h ago" for Home and Kitchen: counted from the last scan on this phone, or the server's answer. */
export function syncedLabel(kitchen: { syncedAgo: string; syncedAt?: string }, now = new Date()): string {
  return kitchen.syncedAt ? syncedAgo(kitchen.syncedAt, now) : kitchen.syncedAgo;
}

/** A kitchen named after the person: a family name as is ("Rivera kitchen"), a first name as a possessive ("Jo’s kitchen"). */
export function kitchenName(person: { name: string; lastName?: string }): string {
  return person.lastName ? `${person.lastName} kitchen` : `${person.name}’s kitchen`;
}

export function joinAnd(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** The amount on the right of a Kitchen row: "1 carton", "About 1 cup", "× 2", "Used up". */
export function amountLabel(item: Item, startQty?: number): string {
  if (item.qty === 0) return 'Used up';
  if (item.amountText && (startQty === undefined || item.qty === startQty)) return item.amountText;
  return item.unit ? `${item.qty} ${plural(item.unit, item.qty)}` : `× ${item.qty}`;
}

const IRREGULAR: Record<string, string> = { loaf: 'loaves' };

/** "1 loaf", "2 loaves"; "1 bunch", "2 bunches". Units already in the plural stay as they are. */
export function plural(unit: string, n: number): string {
  if (n === 1 || unit.endsWith('s')) return unit;
  return IRREGULAR[unit] ?? (/(ch|sh|x)$/.test(unit) ? `${unit}es` : `${unit}s`);
}

/** Items already ticked off when the list opened. They drop out of the list and its count, so each trip counts from 0. */
export const doneAtOpen = (list: ToBuyItem[]) => new Set(list.filter((t) => t.done).map((t) => t.id));

/** The list without what was ticked off before it opened; one unticked since (an undo) comes back. */
export const sinceOpen = (list: ToBuyItem[], hidden: Set<string>) => list.filter((t) => !(t.done && hidden.has(t.id)));

export function toBuyProgress(list: ToBuyItem[], hidden?: Set<string>): { done: number; total: number } {
  const shown = hidden ? sinceOpen(list, hidden) : list;
  return { done: shown.filter((t) => t.done).length, total: shown.length };
}

/** Not-done items first, done ones drop to the bottom; otherwise keep list order. */
export function sortToBuy(list: ToBuyItem[]): ToBuyItem[] {
  return list.slice().sort((a, b) => Number(a.done) - Number(b.done));
}

export function canMakeNow(recipe: Recipe): boolean {
  return recipe.missing.length === 0;
}

/** "25 min · 2 servings · saved by Sam". */
export function recipeMeta(recipe: Recipe): string {
  return [recipe.time, recipe.servings, recipe.savedBy].filter(Boolean).join(' · ');
}

/** Where a typed name probably goes: wherever the kitchen already keeps it, else the pantry. */
export function guessPlace(name: string, items: Item[]): Place {
  const match = items.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  return match?.place ?? 'pantry';
}

/** First letter for the initials circles. */
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** A v4 UUID, so ids made offline match the uuid primary keys in the database. The prefix is kept for callers but unused. */
export function makeId(_prefix: string): string {
  return Crypto.randomUUID();
}

/** Where the scan screens were opened from: the app, or onboarding (household or just me). */
export function scanFlow(f: unknown): ScanFlow {
  return f === 'onb' || f === 'onbsolo' ? f : 'app';
}

const DAY = 24 * 60 * 60 * 1000;

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local midnight, `days` after today. */
export function dateIn(days: number, today = new Date()): Date {
  const d = localMidnight(today);
  d.setDate(d.getDate() + days);
  return d;
}

/** Local calendar days from today to `date`. Rounded so DST days still count as one. */
export function daysUntil(date: Date, today = new Date()): number {
  return Math.round((localMidnight(date).getTime() - localMidnight(today).getTime()) / DAY);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 14": the use-by date `days` from today. */
export function shortDate(days: number, today = new Date()): string {
  const d = dateIn(days, today);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** today + days as a local calendar date, 'YYYY-MM-DD'. */
export function bestByFromDays(days: number, today: Date): string {
  const d = dateIn(days, today);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar days from today to a 'YYYY-MM-DD' date. Rounded so DST days still count as one. */
export function daysFromBestBy(bestBy: string, today: Date): number {
  const [y, m, d] = bestBy.split('-').map(Number);
  return daysUntil(new Date(y, m - 1, d), today);
}

/** "7:30 pm" -> [19, 30], the format the store keeps the send time in. Falls back to 5:00 pm. */
export function parseClock(text: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(text.trim());
  if (!m) return [17, 0];
  return [(Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0), Number(m[2])];
}

/** The next moment after `now` at `time` ("7:30 pm"), on `weekday` (0 is Sunday) if given. */
export function nextAt(time: string, now = new Date(), weekday?: number): Date {
  const [h, m] = parseClock(time);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (weekday !== undefined) d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  if (d <= now) d.setDate(d.getDate() + (weekday === undefined ? 1 : 7));
  return d;
}

/** The use-soon nudge: "Chicken thighs and Spinach need using.", names as stored. Null when nothing needs using. */
export function nudgeText(items: Item[]): string | null {
  const names = items.filter(isUseSoon).map((i) => i.name);
  if (names.length === 0) return null;
  const shown = names.length > 3 ? [...names.slice(0, 2), `${names.length - 2} more`] : names;
  return `${joinAnd(shown)} ${names.length === 1 ? 'needs' : 'need'} using.`;
}

/** The Sunday summary, from the kitchen as it is now: "This week: 2 things to use soon and 3 on To Buy." */
export function weeklyText(items: Item[], toBuy: ToBuyItem[]): string {
  const soon = items.filter(isUseSoon).length;
  const buy = toBuy.filter((t) => !t.done).length;
  const parts = [soon ? `${count(soon, 'thing')} to use soon` : '', buy ? `${buy} on To Buy` : ''].filter(Boolean);
  return parts.length ? `This week: ${joinAnd(parts)}.` : 'This week: nothing to use soon, and To Buy is clear.';
}
