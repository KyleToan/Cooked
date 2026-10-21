import { describe, expect, jest, test } from '@jest/globals';
import {
  daysUntil,
  dateIn,
  shortDate,
  addCounts,
  amountLabel,
  bestByFromDays,
  count,
  daysFromBestBy,
  greeting,
  guessPlace,
  hasSome,
  inStock,
  initial,
  isDueSoon,
  receiptCount,
  isUseSoon,
  joinAnd,
  makeId,
  nextAt,
  parseClock,
  plural,
  scanFlow,
  sortToBuy,
  timeOfDay,
  toBuyProgress,
  nudgeText,
  weeklyText,
} from '@/data/helpers';
import { SEED_ITEMS, SEED_TO_BUY } from '@/data/seed';
import type { Item } from '@/data/types';

// jest-expo's expo-crypto mock returns one fixed uuid; use Node's generator instead (jest.mock is hoisted).
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID() }));

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

describe('use-by dates', () => {
  const today = new Date(2026, 9, 30, 15, 0);
  test('short date and days until round-trip across a month', () => {
    expect(shortDate(0, today)).toBe('Oct 30');
    expect(shortDate(3, today)).toBe('Nov 2');
    expect(daysUntil(dateIn(3, today), today)).toBe(3);
    expect(daysUntil(new Date(2026, 9, 29, 23, 0), today)).toBe(-1);
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
    // No amount: nothing on the right of the row.
    expect(amountLabel(item({ qty: undefined, unit: '' }))).toBe('');
  });

  test('uncounted items are there until used up', () => {
    expect(hasSome(item({ qty: undefined }))).toBe(true);
    expect(hasSome(item({ qty: 0 }))).toBe(false);
    expect(inStock([item({ qty: undefined }), item({ qty: 0 })])).toHaveLength(1);
  });

  test('receipt counts: one stays uncounted, more adds up', () => {
    expect(receiptCount(1)).toBeUndefined();
    expect(receiptCount(3)).toBe(3);
    expect(addCounts(undefined, 2)).toBeUndefined();
    expect(addCounts(2, 1)).toBe(3);
    expect(addCounts(0, 1)).toBeUndefined();
    expect(addCounts(0, 2)).toBe(2);
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

describe('notifications', () => {
  const soon = (name: string) => item({ name, daysLeft: 1 });

  test('use-soon text for 0, 1, 2 and many items', () => {
    expect(nudgeText([item()])).toBeNull();
    expect(nudgeText([soon('Spinach'), item({ name: 'Rice' })])).toBe('Spinach needs using.');
    expect(nudgeText([soon('Chicken thighs'), soon('Spinach')])).toBe('Chicken thighs and Spinach need using.');
    expect(nudgeText([soon('Milk'), soon('Greek yogurt'), soon('Basil')])).toBe('Milk, Greek yogurt and Basil need using.');
    expect(nudgeText(['Milk', 'Feta', 'Basil', 'Eggs'].map(soon))).toBe('Milk, Feta and 2 more need using.');
  });

  test('used-up items are left out', () => {
    expect(nudgeText([item({ daysLeft: 1, qty: 0 })])).toBeNull();
  });

  test('weekly text', () => {
    const open = { ...SEED_TO_BUY[0], done: false };
    expect(weeklyText([soon('Milk'), soon('Feta')], [open, { ...open, done: true }])).toBe(
      'This week: 2 things to use soon and 1 on To Buy.',
    );
    expect(weeklyText([soon('Milk')], [])).toBe('This week: 1 thing to use soon.');
    expect(weeklyText([], [])).toBe('This week: nothing to use soon, and To Buy is clear.');
  });

  // 2026-10-11 is a Sunday.
  test('next daily time: later today, or tomorrow once it has passed', () => {
    expect(nextAt('5:00 pm', at(9))).toEqual(new Date(2026, 9, 11, 17, 0));
    expect(nextAt('5:00 pm', at(17))).toEqual(new Date(2026, 9, 12, 17, 0));
    expect(nextAt('8:00 am', at(9))).toEqual(new Date(2026, 9, 12, 8, 0));
  });

  test('next Sunday: today if still ahead, else a week on', () => {
    expect(nextAt('10:00 am', at(9), 0)).toEqual(new Date(2026, 9, 11, 10, 0));
    expect(nextAt('10:00 am', at(11), 0)).toEqual(new Date(2026, 9, 18, 10, 0));
    expect(nextAt('10:00 am', new Date(2026, 9, 14, 23), 0)).toEqual(new Date(2026, 9, 18, 10, 0));
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
  test('makeId is a unique uuid', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeId('i')));
    expect(ids.size).toBe(50);
    expect([...ids].every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
  });

  test('parseClock', () => {
    expect(parseClock('7:30 pm')).toEqual([19, 30]);
    expect(parseClock('12:05 am')).toEqual([0, 5]);
    expect(parseClock('12:00 PM')).toEqual([12, 0]);
    expect(parseClock('soon')).toEqual([17, 0]);
  });

  test('scanFlow', () => {
    expect(scanFlow('onb')).toBe('onb');
    expect(scanFlow('onbsolo')).toBe('onbsolo');
    expect(scanFlow('app')).toBe('app');
    expect(scanFlow(undefined)).toBe('app');
    expect(scanFlow(['onb'])).toBe('app');
  });
});

describe('best-by dates', () => {
  const today = new Date(2026, 0, 30, 15, 45); // Jan 30, mid-afternoon local

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
