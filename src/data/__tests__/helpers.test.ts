import { describe, expect, test } from '@jest/globals';
import {
  amountLabel,
  count,
  greeting,
  guessPlace,
  inStock,
  initial,
  isDueSoon,
  isUseSoon,
  joinAnd,
  makeId,
  plural,
  scanFlow,
  sortToBuy,
  timeOfDay,
  toBuyProgress,
} from '@/data/helpers';
import { SEED_ITEMS, SEED_TO_BUY } from '@/data/seed';
import type { Item } from '@/data/types';

const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m);

const item = (over: Partial<Item> = {}): Item => ({
  id: 'x',
  name: 'Milk',
  place: 'fridge',
  qty: 1,
  unit: '',
  meta: '',
  daysLeft: 5,
  addedBy: 'alex',
  ...over,
});

describe('greeting', () => {
  test.each([
    [0, 0, 'Up late'],
    [4, 59, 'Up late'],
    [5, 0, 'Good morning'],
    [11, 59, 'Good morning'],
    [12, 0, 'Good afternoon'],
    [16, 59, 'Good afternoon'],
    [17, 0, 'Good evening'],
    [23, 59, 'Good evening'],
  ])('%i:%i is "%s"', (h, m, text) => {
    expect(timeOfDay(at(h, m))).toBe(text);
  });

  test('adds the name', () => {
    expect(greeting('Alex', at(9))).toBe('Good morning, Alex');
  });
});

describe('use soon', () => {
  test('due soon at 2 days or less', () => {
    expect(isDueSoon(item({ daysLeft: 0 }))).toBe(true);
    expect(isDueSoon(item({ daysLeft: 2 }))).toBe(true);
    expect(isDueSoon(item({ daysLeft: 3 }))).toBe(false);
  });

  test('the useSoon flag overrides the days either way', () => {
    expect(isDueSoon(item({ daysLeft: 30, useSoon: true }))).toBe(true);
    expect(isDueSoon(item({ daysLeft: 1, useSoon: false }))).toBe(false);
  });

  test('use soon needs some left', () => {
    expect(isUseSoon(item({ daysLeft: 1, qty: 1 }))).toBe(true);
    expect(isUseSoon(item({ daysLeft: 1, qty: 0 }))).toBe(false);
    expect(isDueSoon(item({ daysLeft: 1, qty: 0 }))).toBe(true);
  });

  test('inStock drops used-up items and filters by place', () => {
    const stocked = inStock(SEED_ITEMS);
    expect(stocked.some((i) => i.name === 'Greek yogurt')).toBe(false);
    expect(inStock(SEED_ITEMS, 'freezer').every((i) => i.place === 'freezer')).toBe(true);
    expect(inStock(SEED_ITEMS, 'freezer')).toHaveLength(4);
  });
});

describe('words', () => {
  test('count', () => {
    expect(count(0, 'item')).toBe('0 items');
    expect(count(1, 'item')).toBe('1 item');
    expect(count(8, 'item')).toBe('8 items');
    expect(count(2, 'person', 'people')).toBe('2 people');
    expect(count(1, 'person', 'people')).toBe('1 person');
  });

  test('joinAnd', () => {
    expect(joinAnd([])).toBe('');
    expect(joinAnd(['feta'])).toBe('feta');
    expect(joinAnd(['tomatoes', 'feta'])).toBe('tomatoes and feta');
    expect(joinAnd(['pine nuts', 'parmesan', 'garlic'])).toBe('pine nuts, parmesan and garlic');
  });

  test('plural', () => {
    expect(plural('loaf', 1)).toBe('loaf');
    expect(plural('loaf', 2)).toBe('loaves');
    expect(plural('bunch', 2)).toBe('bunches');
    expect(plural('box', 2)).toBe('boxes');
    expect(plural('bag', 2)).toBe('bags');
    expect(plural('eggs', 1)).toBe('eggs');
  });

  test('amountLabel', () => {
    expect(amountLabel(item({ qty: 0, unit: 'bag' }))).toBe('Used up');
    expect(amountLabel(item({ qty: 2, unit: 'bag' }))).toBe('2 bags');
    expect(amountLabel(item({ qty: 3, unit: '' }))).toBe('× 3');
    expect(amountLabel(item({ qty: 1, unit: 'cup', amountText: 'About 1 cup' }))).toBe('About 1 cup');
    // Once the count changes, the text no longer fits.
    expect(amountLabel(item({ qty: 2, unit: 'cup', amountText: 'About 1 cup' }), 1)).toBe('2 cups');
    expect(amountLabel(item({ qty: 1, unit: 'cup', amountText: 'About 1 cup' }), 1)).toBe('About 1 cup');
  });

  test('initial', () => {
    expect(initial(' sam')).toBe('S');
    expect(initial('')).toBe('?');
  });
});

describe('To Buy', () => {
  test('progress counts done items', () => {
    expect(toBuyProgress(SEED_TO_BUY)).toEqual({ done: 2, total: 6 });
    expect(toBuyProgress([])).toEqual({ done: 0, total: 0 });
  });

  test('done items drop to the bottom, order otherwise kept', () => {
    const list = [
      { ...SEED_TO_BUY[4] },
      { ...SEED_TO_BUY[0] },
      { ...SEED_TO_BUY[5] },
      { ...SEED_TO_BUY[1] },
    ];
    expect(sortToBuy(list).map((t) => t.id)).toEqual(['t', 'f', 'b', 'o']);
    expect(list[0].id).toBe('b');
  });
});

describe('guessPlace', () => {
  test('uses where the kitchen keeps it, ignoring case and spaces', () => {
    expect(guessPlace('  frozen PEAS ', SEED_ITEMS)).toBe('freezer');
    expect(guessPlace('eggs', SEED_ITEMS)).toBe('fridge');
  });

  test('falls back to the pantry', () => {
    expect(guessPlace('Saffron', SEED_ITEMS)).toBe('pantry');
    expect(guessPlace('Eggs', [])).toBe('pantry');
  });
});

describe('misc', () => {
  test('makeId is unique and prefixed', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeId('i')));
    expect(ids.size).toBe(50);
    expect([...ids].every((id) => id.startsWith('i-'))).toBe(true);
  });

  test('scanFlow', () => {
    expect(scanFlow('onb')).toBe('onb');
    expect(scanFlow('onbsolo')).toBe('onbsolo');
    expect(scanFlow('app')).toBe('app');
    expect(scanFlow(undefined)).toBe('app');
    expect(scanFlow(['onb'])).toBe('app');
  });
});
