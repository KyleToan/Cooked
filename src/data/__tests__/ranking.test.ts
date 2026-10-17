import { describe, expect, test } from '@jest/globals';

import { EMPTY_RANKS, finalIndex, pick, skip, placeAt, pruned, ranked, rival, scores, scoreText, startPlacing, type Placing, type Ranks } from '@/data/ranking';
import { fromSaved, toSaved } from '@/data/saved';
import { initialState, reducer, type State } from '@/data/store';

/** Places `id` by answering every comparison with the true order (`order`, best first). */
function place(p: Placing, id: string, order: string[]): { at: number; asked: number } {
  let asked = 0;
  for (let r = rival(p); r !== null; r = rival(p)) {
    asked++;
    p = pick(p, order.indexOf(id) < order.indexOf(r) ? 'better' : 'worse');
  }
  return { at: p.lo, asked };
}

describe('placing', () => {
  test('the first recipe in a band needs no comparison', () => {
    const p = startPlacing(EMPTY_RANKS, 'loved', 'a');
    expect(rival(p)).toBeNull();
    expect(p.lo).toBe(0);
  });

  test('binary search finds the true place for every position, in at most ceil(log2(n+1)) picks', () => {
    for (let n = 0; n <= 12; n++) {
      const list = Array.from({ length: n }, (_, i) => `r${i}`);
      for (let k = 0; k <= n; k++) {
        const order = [...list.slice(0, k), 'new', ...list.slice(k)];
        const ranks: Ranks = { ...EMPTY_RANKS, fine: list };
        const { at, asked } = place(startPlacing(ranks, 'fine', 'new'), 'new', order);
        expect(at).toBe(k);
        expect(asked).toBeLessThanOrEqual(Math.ceil(Math.log2(n + 1)));
      }
    }
  });

  test('rating again leaves the recipe out of its own comparisons', () => {
    const ranks: Ranks = { ...EMPTY_RANKS, loved: ['a', 'b', 'c'] };
    const p = startPlacing(ranks, 'loved', 'b');
    expect(p.list).toEqual(['a', 'c']);
  });

  test('too close to call puts it right at the rival', () => {
    const ranks: Ranks = { ...EMPTY_RANKS, loved: ['a', 'b', 'c', 'd'] };
    const p = pick(startPlacing(ranks, 'loved', 'x'), 'tie');
    expect(rival(p)).toBeNull();
    expect(p.lo).toBe(2);
    expect(placeAt(ranks, 'x', 'loved', p.lo).loved).toEqual(['a', 'b', 'x', 'c', 'd']);
  });
});

describe('skip and finalIndex', () => {
  test('without skips the final index is where the search ended', () => {
    const ranks: Ranks = { ...EMPTY_RANKS, fine: ['a', 'b', 'c', 'd', 'e'] };
    for (let k = 0; k <= 5; k++) {
      const order = [...ranks.fine.slice(0, k), 'x', ...ranks.fine.slice(k)];
      let p = startPlacing(ranks, 'fine', 'x');
      for (let r = rival(p); r !== null; r = rival(p)) p = pick(p, order.indexOf('x') < order.indexOf(r) ? 'better' : 'worse');
      expect(finalIndex(p)).toBe(k);
    }
  });

  test('skipping a rival asks about another and still lands in the right order', () => {
    const band = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const ranks: Ranks = { ...EMPTY_RANKS, loved: band };
    for (let k = 0; k <= band.length; k++) {
      const order = [...band.slice(0, k), 'x', ...band.slice(k)];
      let p = startPlacing(ranks, 'loved', 'x');
      const first = rival(p)!;
      p = skip(p);
      expect(rival(p) === first).toBe(false);
      for (let r = rival(p); r !== null; r = rival(p)) p = pick(p, order.indexOf('x') < order.indexOf(r) ? 'better' : 'worse');
      const placed = placeAt(ranks, 'x', 'loved', finalIndex(p)).loved;
      // Every rival actually compared is on the right side of x; only the skipped one may be off by its own slot.
      const without = placed.filter((id) => id !== first);
      expect(without).toEqual(order.filter((id) => id !== first));
    }
  });

  test('skipping every rival puts it in the middle of the band', () => {
    let p = startPlacing({ ...EMPTY_RANKS, fine: ['a', 'b', 'c', 'd'] }, 'fine', 'x');
    while (rival(p) !== null) p = skip(p);
    expect(finalIndex(p)).toBe(2);
  });
});

describe('placeAt', () => {
  test('moves a recipe between bands', () => {
    const ranks: Ranks = { loved: ['a'], fine: ['b', 'c'], disliked: [] };
    expect(placeAt(ranks, 'b', 'loved', 0)).toEqual({ loved: ['b', 'a'], fine: ['c'], disliked: [] });
  });

  test('clamps the index and never duplicates', () => {
    const ranks: Ranks = { ...EMPTY_RANKS, fine: ['a', 'b'] };
    expect(placeAt(ranks, 'a', 'fine', 99).fine).toEqual(['b', 'a']);
    expect(placeAt(ranks, 'c', 'fine', -3).fine).toEqual(['c', 'a', 'b']);
  });

  test('does not change the ranks it was given', () => {
    const ranks: Ranks = { ...EMPTY_RANKS, fine: ['a'] };
    placeAt(ranks, 'b', 'fine', 0);
    expect(ranks.fine).toEqual(['a']);
  });
});

describe('scores', () => {
  const ranks: Ranks = { loved: ['a', 'b', 'c'], fine: ['d'], disliked: ['e', 'f'] };
  const all = ['a', 'b', 'c', 'd', 'e', 'f'];

  test('top of each band gets the band top, and scores fall within the band', () => {
    const s = scores(ranks, all);
    expect(s.get('a')).toBe(10);
    expect(s.get('b')).toBe(8.9);
    expect(s.get('c')).toBe(7.8);
    expect(s.get('d')).toBe(6.6);
    expect(s.get('e')).toBe(3.3);
    expect(s.get('f')).toBe(1.7);
  });

  test('every loved beats every fine beats every disliked', () => {
    const s = scores(ranks, all);
    const order = ranked(ranks, all).map((id) => s.get(id)!);
    expect([...order].sort((x, y) => y - x)).toEqual(order);
    expect(Math.min(...order)).toBeGreaterThan(0);
  });

  test('recipes that are gone are skipped and the rest close up', () => {
    const s = scores(ranks, ['b', 'c']);
    expect(s.has('a')).toBe(false);
    expect(s.get('b')).toBe(10);
    expect(ranked(ranks, ['c', 'd'])).toEqual(['c', 'd']);
  });

  test('score text always has one decimal', () => {
    expect(scoreText(10)).toBe('10.0');
    expect(scoreText(7)).toBe('7.0');
    expect(scoreText(8.3)).toBe('8.3');
  });
});

describe('store', () => {
  const joined = (): State =>
    [
      { type: 'signIn', method: 'email', contact: 'a@b.c' },
      { type: 'choosePath', path: 'join' },
      { type: 'finishOnboarding' },
    ].reduce((s, a) => reducer(s, a as never), initialState());

  test('rankRecipe places a recipe, and ignores ids that are not recipes', () => {
    const s = joined();
    const [r1, r2] = s.recipes;
    let next = reducer(s, { type: 'rankRecipe', id: r1.id, band: 'loved', index: 0 });
    next = reducer(next, { type: 'rankRecipe', id: r2.id, band: 'loved', index: 0 });
    expect(next.ranks.loved).toEqual([r2.id, r1.id]);
    expect(reducer(next, { type: 'rankRecipe', id: 'nope', band: 'fine', index: 0 })).toBe(next);
  });

  test('leaving the kitchen clears the ranking', () => {
    const s = reducer(joined(), { type: 'rankRecipe', id: joined().recipes[0].id, band: 'fine', index: 0 });
    expect(reducer(s, { type: 'leaveKitchen' }).ranks).toEqual(EMPTY_RANKS);
  });

  test('the ranking is saved on the phone, and old copies without one load empty', () => {
    const s = reducer(joined(), { type: 'rankRecipe', id: joined().recipes[0].id, band: 'fine', index: 0 });
    const today = new Date(2026, 9, 14);
    expect(fromSaved(toSaved(s, today), today)!.ranks).toEqual(s.ranks);
    const old = JSON.parse(toSaved(s, today));
    delete old.ranks;
    expect(fromSaved(JSON.stringify(old), today)!.ranks).toEqual(EMPTY_RANKS);
  });
});

describe('gone recipes', () => {
  test('placing skips ids of recipes that are gone, and the store index matches', () => {
    let s = [
      { type: 'signIn', method: 'email', contact: 'a@b.c' },
      { type: 'choosePath', path: 'join' },
    ].reduce((x, a) => reducer(x, a as never), initialState());
    const [r1, r2] = s.recipes;
    s = { ...s, ranks: { ...EMPTY_RANKS, loved: ['gone', r1.id] } };
    const p = startPlacing(pruned(s.ranks, s.recipes.map((r) => r.id)), 'loved', r2.id);
    expect(rival(p)).toBe(r1.id);
    const after = pick(p, 'worse');
    s = reducer(s, { type: 'rankRecipe', id: r2.id, band: 'loved', index: after.lo });
    expect(s.ranks.loved).toEqual([r1.id, r2.id]);
  });
});
