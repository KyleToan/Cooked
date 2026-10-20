import { describe, expect, test } from '@jest/globals';
import { checkRecipes } from '@/data/match';
import {
  bestByFromDays,
  daysFromBestBy,
  diffRows,
  itemToRow,
  recipeToRow,
  rowToItem,
  rowToRecipe,
  rowToToBuy,
  syncedAgo,
  toBuyToRow,
} from '@/data/remote';
import { SEED_ITEMS, SEED_RECIPES, SEED_TO_BUY, SHAKSHUKA } from '@/data/seed';
import type { Item, ToBuyItem } from '@/data/types';

const K = 'kitchen-1';
const today = new Date(2026, 0, 30, 15, 45); // Jan 30, mid-afternoon local

describe('diffRows', () => {
  const a = { id: 'a', n: 1 };
  const b = { id: 'b', n: 2 };
  const c = { id: 'c', n: 3 };

  test('unchanged rows by reference are skipped', () => {
    expect(diffRows([a, b], [a, b])).toEqual({ upserts: [], deletes: [] });
  });

  test('add, change and delete', () => {
    const b2 = { ...b, n: 5 };
    expect(diffRows([a, b], [b2, c])).toEqual({ upserts: [b2, c], deletes: ['a'] });
  });

  test('undo restoring a snapshot upserts the old rows and deletes the new one', () => {
    const snapshot = [a, b];
    const edited = [a, { ...b, n: 9 }, c];
    expect(diffRows(edited, snapshot)).toEqual({ upserts: [b], deletes: ['c'] });
  });
});

describe('best_by dates', () => {
  test('cross a month boundary', () => {
    expect(bestByFromDays(3, today)).toBe('2026-02-02');
    expect(daysFromBestBy('2026-02-02', today)).toBe(3);
    expect(bestByFromDays(-31, today)).toBe('2025-12-30');
    expect(daysFromBestBy('2025-12-30', today)).toBe(-31);
    expect(bestByFromDays(0, today)).toBe('2026-01-30');
  });

  test('round-trip over a DST change', () => {
    const march = new Date(2026, 2, 1, 23, 30);
    for (const d of [0, 7, 14, 30, 60]) expect(daysFromBestBy(bestByFromDays(d, march), march)).toBe(d);
  });
});

describe('mappers round-trip', () => {
  test('items', () => {
    for (const item of SEED_ITEMS) {
      const row = itemToRow(item, K, today);
      expect(row.kitchen_id).toBe(K);
      expect(rowToItem(row, today)).toEqual(item);
    }
  });

  test('items: optionals become null, empty addedBy becomes null and back to empty', () => {
    const item: Item = { id: 'x', name: 'Milk', place: 'fridge', qty: 1, unit: 'carton', meta: '', daysLeft: 4, addedBy: '' };
    const row = itemToRow(item, K, today);
    expect(row).toMatchObject({ amount_text: null, running_low: false, use_soon: null, added_by: null });
    expect(rowToItem(row, today)).toEqual(item);
  });

  test('items: no amount is a null qty and back', () => {
    const item: Item = { id: 'x', name: 'Basil', place: 'fridge', unit: '', meta: '', daysLeft: 4, addedBy: 'a' };
    const row = itemToRow(item, K, today);
    expect(row.qty).toBeNull();
    expect(rowToItem(row, today).qty).toBeUndefined();
  });

  test('items: use soon set off by hand stays off, apart from following the date', () => {
    const item: Item = { id: 'x', name: 'Milk', place: 'fridge', qty: 1, unit: 'carton', meta: '', daysLeft: 1, useSoon: false, addedBy: 'a' };
    expect(itemToRow(item, K, today).use_soon).toBe(false);
    expect(rowToItem(itemToRow(item, K, today), today).useSoon).toBe(false);
  });

  test('to buy', () => {
    for (const t of SEED_TO_BUY) expect(rowToToBuy(toBuyToRow(t, K))).toEqual(t);
    const t: ToBuyItem = { id: 'y', name: 'Feta', note: '', place: 'fridge', done: true, addedBy: '' };
    expect(toBuyToRow(t, K).added_by).toBeNull();
    expect(rowToToBuy(toBuyToRow(t, K))).toEqual(t);
  });

  test('recipes store only saved fields and check back to the same result', () => {
    const row = recipeToRow(SHAKSHUKA, K);
    for (const key of ['have', 'need', 'missing', 'missingAmounts', 'tonight']) expect(row).not.toHaveProperty(key);
    expect(row.ingredients).toEqual(expect.arrayContaining([{ name: 'Tomatoes', place: 'pantry', have: false, amount: '400 g' }]));
    // Through JSON, as jsonb would.
    const back = rowToRecipe(JSON.parse(JSON.stringify(row)));
    expect(back).toMatchObject({ need: 0, have: 0, missing: [], imported: true, url: SHAKSHUKA.url });
    expect(back.servings).toBe(SHAKSHUKA.servings);
    expect(back.savedBy).toBeUndefined();

    // Recipes with a full ingredient list check out the same after a round trip.
    const named = SEED_RECIPES.filter((r) => r.need === r.ingredients.length + r.missing.length);
    const loaded = named.map((r) => rowToRecipe(JSON.parse(JSON.stringify(recipeToRow(r, K)))));
    const strip = ({ tonight: _t, ...r }: (typeof named)[number]) => r;
    expect(checkRecipes(loaded, SEED_ITEMS).map(strip)).toEqual(checkRecipes(named, SEED_ITEMS).map(strip));
  });
});

describe('syncedAgo', () => {
  const now = new Date('2026-10-11T12:00:00Z');
  test.each([
    [null, ''],
    ['2026-10-11T11:59:30Z', 'just now'],
    ['2026-10-11T11:55:00Z', '5m ago'],
    ['2026-10-11T10:00:00Z', '2h ago'],
    ['2026-10-08T11:00:00Z', '3d ago'],
  ])('%s → %s', (at, expected) => {
    expect(syncedAgo(at, now)).toBe(expected);
  });
});
