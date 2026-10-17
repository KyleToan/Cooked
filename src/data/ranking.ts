// Beli-style recipe ranking (design/recipe-ranking.md): a feeling picks the band,
// head-to-head picks place the recipe inside it, and its place gives the score.

export type Band = 'loved' | 'fine' | 'disliked';

/** Recipe ids in each band, best first. */
export type Ranks = Record<Band, string[]>;

export const EMPTY_RANKS: Ranks = { loved: [], fine: [], disliked: [] };

export const BANDS: Band[] = ['loved', 'fine', 'disliked'];

/** Lowest and highest score in each band. */
const RANGE: Record<Band, [number, number]> = { loved: [6.7, 10], fine: [3.4, 6.6], disliked: [0, 3.3] };

/** The ranks without recipes that are gone, so comparisons and indexes only see real ones. */
export function pruned(ranks: Ranks, existing: string[]): Ranks {
  const have = new Set(existing);
  return { loved: ranks.loved.filter((id) => have.has(id)), fine: ranks.fine.filter((id) => have.has(id)), disliked: ranks.disliked.filter((id) => have.has(id)) };
}

/**
 * A binary search over the band: the new recipe is compared with `list[mid]` until lo meets hi.
 * `full` is the band as it was, so skipped rivals still count when the place is worked out.
 */
export type Placing = { band: Band; full: string[]; list: string[]; lo: number; hi: number };

export function startPlacing(ranks: Ranks, band: Band, id: string): Placing {
  const list = ranks[band].filter((x) => x !== id);
  return { band, full: list, list, lo: 0, hi: list.length };
}

/** The recipe to compare with next, or null once its place is found. */
export function rival(p: Placing): string | null {
  return p.lo < p.hi ? p.list[(p.lo + p.hi) >> 1] : null;
}

/** 'better': the new recipe beats the rival. 'tie': too close to call, it goes right there. */
export function pick(p: Placing, answer: 'better' | 'worse' | 'tie'): Placing {
  const mid = (p.lo + p.hi) >> 1;
  if (answer === 'tie') return { ...p, lo: mid, hi: mid };
  return answer === 'better' ? { ...p, hi: mid } : { ...p, lo: mid + 1 };
}

/** Skip: leave this rival out and ask about another in the same range. */
export function skip(p: Placing): Placing {
  const mid = (p.lo + p.hi) >> 1;
  return { ...p, list: p.list.filter((_, i) => i !== mid), hi: p.hi - 1 };
}

/** Where the search ended, as an index into the band without the recipe (`full`). */
export function finalIndex(p: Placing): number {
  // Every rival skipped: nothing is known, so the middle of the band.
  if (!p.list.length) return p.full.length >> 1;
  if (p.lo < p.list.length) return p.full.indexOf(p.list[p.lo]);
  return p.lo > 0 ? p.full.indexOf(p.list[p.lo - 1]) + 1 : 0;
}

/** The ranks with `id` taken out of every band and put at `index` in `band`. */
export function placeAt(ranks: Ranks, id: string, band: Band, index: number): Ranks {
  const next = { ...ranks };
  for (const b of BANDS) next[b] = (ranks[b] ?? []).filter((x) => x !== id);
  const list = [...next[band]];
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id);
  next[band] = list;
  return next;
}

/** Score out of 10 for every ranked recipe that still exists. */
export function scores(ranks: Ranks, existing: string[]): Map<string, number> {
  const have = new Set(existing);
  const out = new Map<string, number>();
  for (const b of BANDS) {
    const list = (ranks[b] ?? []).filter((id) => have.has(id));
    const [lo, hi] = RANGE[b];
    list.forEach((id, i) => out.set(id, Math.round((lo + ((hi - lo) * (list.length - i)) / list.length) * 10) / 10));
  }
  return out;
}

/** Ranked ids, best score first (bands are in score order, so this is just loved, fine, disliked). */
export function ranked(ranks: Ranks, existing: string[]): string[] {
  const have = new Set(existing);
  return BANDS.flatMap((b) => (ranks[b] ?? []).filter((id) => have.has(id)));
}

/** "8.3" with one decimal always ("10.0", "7.0"). */
export const scoreText = (n: number) => n.toFixed(1);
