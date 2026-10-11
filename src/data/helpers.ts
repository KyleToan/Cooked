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

/** Whether it's due soon by date, whatever is left of it. Decides the Use soon section in Kitchen. */
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

export function toBuyProgress(list: ToBuyItem[]): { done: number; total: number } {
  return { done: list.filter((t) => t.done).length, total: list.length };
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

let nextId = 0;
export function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextId}`;
}

/** Where the scan screens were opened from: the app, or onboarding (household or just me). */
export function scanFlow(f: unknown): ScanFlow {
  return f === 'onb' || f === 'onbsolo' ? f : 'app';
}
