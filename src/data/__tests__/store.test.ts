// Tests for the local store's reducer. They pin down what each action does so
// a backend can replace the store without the screens noticing.
// Recipe missing/have, Tonight's pick and importRecipe are covered elsewhere.

import { beforeEach, describe, expect, test } from '@jest/globals';

import { initialState, reducer, type Action, type State } from '@/data/store';
import { isDueSoon, shortDate, syncedLabel } from '@/data/helpers';
import { ALEX, NEW_INVITE_CODE, SAMPLE_SCAN, SAM, SEED_ITEMS, SEED_KITCHEN, SEED_TO_BUY } from '@/data/seed';
import type { ScanLine } from '@/data/types';

const run = (s: State, ...actions: Action[]): State => actions.reduce(reducer, s);

const item = (s: State, id: string) => s.items.find((i) => i.id === id)!;
const row = (s: State, id: string) => s.toBuy.find((t) => t.id === id)!;
const byName = (s: State, name: string) => s.items.filter((i) => i.name === name);

const line = (name: string, place: ScanLine['place'], qty = 1): ScanLine => ({ id: name, name, price: '$1.00', place, qty });

let s: State;
beforeEach(() => {
  s = initialState();
});

describe('initial state', () => {
  test('starts in onboarding with the sample kitchen', () => {
    expect(s.session.onboarded).toBe(false);
    expect(s.session.signIn).toBeNull();
    expect(s.user).toBe(ALEX);
    expect(s.kitchen).toBe(SEED_KITCHEN);
    expect(s.items).toBe(SEED_ITEMS);
    expect(s.undo).toBeNull();
  });

  test('every call returns a fresh session', () => {
    expect(initialState().session).not.toBe(initialState().session);
  });

  test('reducer never mutates the seed', () => {
    const before = JSON.stringify(SEED_ITEMS);
    run(s, { type: 'setQty', id: 'f4', qty: 0, scope: 'kitchen' }, { type: 'addItem', name: 'Kale', place: 'fridge' });
    expect(JSON.stringify(SEED_ITEMS)).toBe(before);
  });
});

describe('To Buy', () => {
  test('ticking off marks done and offers an undo for that screen', () => {
    const next = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    expect(row(next, 't').done).toBe(true);
    expect(next.undo).toMatchObject({ text: 'Tomatoes ticked off', scope: 'home' });
  });

  test('unticking needs no undo', () => {
    const next = run(s, { type: 'toggleToBuy', id: 'b', scope: 'home' });
    expect(row(next, 'b').done).toBe(false);
    expect(next.undo).toBeNull();
  });

  test('an unknown id changes nothing', () => {
    expect(run(s, { type: 'toggleToBuy', id: 'nope', scope: 'home' })).toBe(s);
  });

  test('adding trims the name, notes who added it and guesses the place', () => {
    const next = run(s, { type: 'addToBuy', name: '  Eggs ' });
    const added = next.toBuy[next.toBuy.length - 1];
    expect(added).toMatchObject({ name: 'Eggs', note: 'Added by Alex', place: 'fridge', done: false, addedBy: 'alex' });
    expect(next.toBuy).toHaveLength(SEED_TO_BUY.length + 1);
  });

  test('adding uses the given place, and the pantry for something new', () => {
    expect(run(s, { type: 'addToBuy', name: 'Ice', place: 'freezer' }).toBuy.at(-1)!.place).toBe('freezer');
    expect(run(s, { type: 'addToBuy', name: 'Saffron' }).toBuy.at(-1)!.place).toBe('pantry');
  });

  test('a blank name adds nothing', () => {
    expect(run(s, { type: 'addToBuy', name: '   ' })).toBe(s);
  });

  test('adding clears any undo', () => {
    const next = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' }, { type: 'addToBuy', name: 'Lemons' });
    expect(next.undo).toBeNull();
  });

  test('an item goes on To Buy once, with "Running low" for pantry staples', () => {
    const rice = run(s, { type: 'toggleToBuy', id: 'r', scope: 'home' }, { type: 'itemToBuy', id: 'p1' });
    expect(rice.toBuy.at(-1)).toMatchObject({ name: 'Rice', note: 'Running low', place: 'pantry', done: false });

    const milk = run(s, { type: 'itemToBuy', id: 'f3' });
    expect(milk.toBuy.at(-1)).toMatchObject({ name: 'Milk 2%', note: 'Added by Alex', place: 'fridge' });
    expect(run(milk, { type: 'itemToBuy', id: 'f3' })).toBe(milk);
  });

  test('an item already waiting on To Buy is not added again', () => {
    // Rice is on the list and not ticked off.
    expect(run(s, { type: 'itemToBuy', id: 'p1' })).toBe(s);
  });

  test('a ticked-off row does not block adding it again', () => {
    // Bread is on the list but done.
    const next = run(s, { type: 'itemToBuy', id: 'p6' });
    expect(next.toBuy).toHaveLength(SEED_TO_BUY.length + 1);
  });
});

describe('items', () => {
  test('adding an item starts at 1 with the place default shelf life', () => {
    const fridge = run(s, { type: 'addItem', name: ' Tofu ', place: 'fridge' }).items.at(-1)!;
    expect(fridge).toMatchObject({ name: 'Tofu', place: 'fridge', qty: 1, unit: '', meta: 'Added by Alex', daysLeft: 7, addedBy: 'alex' });
    expect(run(s, { type: 'addItem', name: 'Cumin', place: 'pantry' }).items.at(-1)!.daysLeft).toBe(180);
    expect(run(s, { type: 'addItem', name: 'Ice', place: 'freezer' }).items.at(-1)!.daysLeft).toBe(90);
  });

  test('a blank item name adds nothing', () => {
    expect(run(s, { type: 'addItem', name: '', place: 'fridge' })).toBe(s);
  });

  test('changing the count keeps it at 0 or more', () => {
    expect(item(run(s, { type: 'setQty', id: 'f4', qty: 7, scope: 'kitchen' }), 'f4').qty).toBe(7);
    expect(item(run(s, { type: 'setQty', id: 'f4', qty: -3, scope: 'kitchen' }), 'f4').qty).toBe(0);
  });

  test('using something up offers an undo', () => {
    const next = run(s, { type: 'setQty', id: 'f1', qty: 0, scope: 'kitchen' });
    expect(next.undo).toMatchObject({ text: 'Spinach used up', scope: 'kitchen' });
  });

  test('using one of several offers no new undo', () => {
    expect(run(s, { type: 'setQty', id: 'f4', qty: 7, scope: 'kitchen' }).undo).toBeNull();
  });

  test('setting an already used-up item to 0 offers no undo', () => {
    expect(run(s, { type: 'setQty', id: 'f5', qty: 0, scope: 'kitchen' }).undo).toBeNull();
  });

  test('an unknown item changes nothing', () => {
    expect(run(s, { type: 'setQty', id: 'nope', qty: 1, scope: 'kitchen' })).toBe(s);
  });
});

describe('use soon by hand', () => {
  // f1 Spinach is due tomorrow; f4 Eggs in 9 days; z1 Chili leftovers is flagged by hand.
  test('turning it on for something not due yet', () => {
    const next = run(s, { type: 'setUseSoon', id: 'f4', on: true });
    expect(item(next, 'f4').useSoon).toBe(true);
    expect(isDueSoon(item(next, 'f4'))).toBe(true);
  });

  test('turning it off for something due wins over the date', () => {
    const next = run(s, { type: 'setUseSoon', id: 'f1', on: false });
    expect(item(next, 'f1').useSoon).toBe(false);
    expect(isDueSoon(item(next, 'f1'))).toBe(false);
  });

  test('agreeing with the date goes back to following it', () => {
    expect(item(run(s, { type: 'setUseSoon', id: 'z1', on: false }), 'z1').useSoon).toBeUndefined();
    expect(item(run(s, { type: 'setUseSoon', id: 'f1', on: false }, { type: 'setUseSoon', id: 'f1', on: true }), 'f1').useSoon).toBeUndefined();
  });

  test('a new date moves it, clears the hand setting and updates the line', () => {
    const next = run(s, { type: 'setUseSoon', id: 'f4', on: false }, { type: 'setBestBy', id: 'f4', daysLeft: 1 });
    expect(item(next, 'f4')).toMatchObject({ daysLeft: 1, useSoon: undefined, meta: `Best by ${shortDate(1)}` });
    expect(isDueSoon(item(next, 'f4'))).toBe(true);
    expect(isDueSoon(item(run(s, { type: 'setBestBy', id: 'z1', daysLeft: 10 }), 'z1'))).toBe(false);
  });

  test('leaves the other items alone', () => {
    const next = run(s, { type: 'setBestBy', id: 'f4', daysLeft: 1 }, { type: 'setUseSoon', id: 'f1', on: false });
    expect(next.items.filter((i) => i.id !== 'f4' && i.id !== 'f1')).toEqual(s.items.filter((i) => i.id !== 'f4' && i.id !== 'f1'));
  });
});

describe('scanning', () => {
  test('new lines become items with the place default shelf life', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Tofu', 'fridge', 2), line('Cumin', 'pantry')] });
    expect(byName(next, 'Tofu')[0]).toMatchObject({ place: 'fridge', qty: 2, daysLeft: 7, meta: 'From today’s receipt' });
    expect(byName(next, 'Cumin')[0]).toMatchObject({ place: 'pantry', qty: 1, daysLeft: 180 });
  });

  test('new lines get the shelf life of what they are', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Kale', 'fridge'), line('Lentils', 'pantry')] });
    expect(byName(next, 'Kale')[0].daysLeft).toBe(5);
    expect(byName(next, 'Lentils')[0].daysLeft).toBe(365);
  });

  test('scanning the sample receipt flags chicken as use soon but not rice', () => {
    const empty = { ...s, items: [] };
    const next = run(empty, { type: 'addScanned', lines: [...SAMPLE_SCAN, line('Chicken thighs', 'fridge'), line('Rice', 'pantry')] });
    expect(isDueSoon(byName(next, 'Chicken thighs')[0])).toBe(true);
    expect(isDueSoon(byName(next, 'Rice')[0])).toBe(false);
    expect(next.items.filter(isDueSoon).map((i) => i.name)).toEqual(['Chicken thighs']);
  });

  test('typed items get a shelf life too', () => {
    expect(run(s, { type: 'addItem', name: 'Chicken breast', place: 'fridge' }).items.at(-1)!.daysLeft).toBe(2);
  });

  test('a line matching an item in the same place adds to it', () => {
    const next = run(s, { type: 'addScanned', lines: [line('eggs', 'fridge', 12)] });
    expect(byName(next, 'Eggs')).toHaveLength(1);
    expect(item(next, 'f4')).toMatchObject({ qty: 20, meta: 'From today’s receipt' });
  });

  test('merging drops the "About 1 cup" text, since the count changed', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Rice', 'pantry', 1)] });
    expect(item(next, 'p1')).toMatchObject({ qty: 2, amountText: undefined });
  });

  test('a used-up item is restocked', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Greek yogurt', 'fridge', 2)] });
    expect(item(next, 'f5').qty).toBe(2);
  });

  test('the same name in another place is a new item', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Bread', 'freezer')] });
    expect(byName(next, 'Bread').map((i) => i.place).sort()).toEqual(['freezer', 'pantry']);
  });

  test('repeated lines in one scan merge into one item', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Kale', 'fridge'), line('Kale', 'fridge')] });
    expect(byName(next, 'Kale')).toHaveLength(1);
    expect(byName(next, 'Kale')[0].qty).toBe(2);
  });

  test('skipped and blank lines are ignored', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Paper towels', 'skip'), line('  ', 'fridge')] });
    expect(next.items).toEqual(s.items);
    expect(next.session.lastScan).toEqual({ fridge: [], pantry: [], freezer: [] });
  });

  test('bought things come off To Buy', () => {
    const next = run(s, { type: 'addScanned', lines: [line('tomatoes', 'fridge', 4), line('Paper towels', 'skip')] });
    expect(row(next, 't').done).toBe(true);
    expect(row(next, 'f').done).toBe(false);
  });

  test('records what went where, marks the kitchen synced and clears undo', () => {
    const ticked = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    const next = run(ticked, {
      type: 'addScanned',
      lines: [line(' Milk 2% ', 'fridge'), line('Eggs', 'fridge'), line('Peas', 'freezer'), line('Bag', 'skip')],
    });
    expect(next.session.lastScan).toEqual({ fridge: ['Milk 2%', 'Eggs'], pantry: [], freezer: ['Peas'] });
    expect(next.kitchen.syncedAgo).toBe('just now');
    expect(next.undo).toBeNull();
  });

  test('keeps when the scan was added, so "Synced" ages instead of saying "just now" for good', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Kale', 'fridge')], at: '2026-10-13T08:00:00Z' });
    expect(next.kitchen.syncedAt).toBe('2026-10-13T08:00:00Z');
    expect(syncedLabel(next.kitchen, new Date('2026-10-13T10:30:00Z'))).toBe('2h ago');
  });

  test('a scan of only new things says so plainly', () => {
    const next = run(s, { type: 'addScanned', lines: [line('Kale', 'fridge')], undo: true });
    expect(next.undo?.text).toBe('Added 1 item to your kitchen');
  });

  test('with undo, Home offers to put the whole scan back', () => {
    const lines = [line('Kale', 'fridge', 2), line('eggs', 'fridge', 12), line('Bag', 'skip'), line(' ', 'pantry')];
    const next = run(s, { type: 'addScanned', lines, undo: true });
    // Eggs were already in the fridge, so the bar says why the counts barely moved.
    expect(next.undo).toMatchObject({ text: 'Added 2 items, 1 already in your kitchen', scope: 'home' });
    const undone = run(next, { type: 'undo' });
    expect(undone.items).toBe(s.items);
    expect(undone.toBuy).toBe(s.toBuy);
    expect(undone.kitchen).toBe(s.kitchen);
  });

  test('one item reads singular, and nothing added means no undo', () => {
    expect(run(s, { type: 'addScanned', lines: [line('Kale', 'fridge')], undo: true }).undo?.text).toBe('Added 1 item to your kitchen');
    expect(run(s, { type: 'addScanned', lines: [line('Bag', 'skip')], undo: true }).undo).toBeNull();
  });
});

describe('undo', () => {
  test('expiring clears only the undo that timed out', () => {
    const first = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    const second = run(first, { type: 'toggleToBuy', id: 'f', scope: 'home' });
    expect(run(second, { type: 'expireUndo', undo: first.undo! })).toBe(second);
    expect(run(second, { type: 'expireUndo', undo: second.undo! }).undo).toBeNull();
  });

  test('puts back exactly what was there before ticking off', () => {
    const next = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' }, { type: 'undo' });
    expect(next.toBuy).toBe(s.toBuy);
    expect(next.items).toBe(s.items);
    expect(next.kitchen).toBe(s.kitchen);
    expect(next.recipes).toBe(s.recipes);
    expect(next.undo).toBeNull();
  });

  test('puts back an item that was used up', () => {
    const next = run(s, { type: 'setQty', id: 'f1', qty: 0, scope: 'kitchen' }, { type: 'undo' });
    expect(next.items).toBe(s.items);
    expect(item(next, 'f1').qty).toBe(1);
  });

  test('puts back someone who was removed', () => {
    const next = run(s, { type: 'removePerson', id: 'sam' }, { type: 'undo' });
    expect(next.kitchen).toBe(s.kitchen);
    expect(next.kitchen.people).toContain(SAM);
  });

  test('leaves the session, user and notifications alone', () => {
    const ticked = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    const changed = run(ticked, { type: 'setNotification', key: 'weekly', on: false }, { type: 'setName', name: 'Lex' });
    const undone = run(changed, { type: 'undo' });
    expect(undone.notifications.weekly).toBe(false);
    expect(undone.user.name).toBe('Lex');
    expect(undone.session).toBe(changed.session);
  });

  test('is a single step: a second undo does nothing', () => {
    const once = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' }, { type: 'undo' });
    expect(run(once, { type: 'undo' })).toBe(once);
  });

  test('the latest undoable action replaces the earlier one', () => {
    const next = run(
      s,
      { type: 'toggleToBuy', id: 't', scope: 'home' },
      { type: 'toggleToBuy', id: 'f', scope: 'home' },
      { type: 'undo' },
    );
    expect(row(next, 't').done).toBe(true);
    expect(row(next, 'f').done).toBe(false);
  });

  test('is cleared only by the screen it belongs to', () => {
    const ticked = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    expect(run(ticked, { type: 'clearUndo', scope: 'kitchen' })).toBe(ticked);
    expect(run(ticked, { type: 'clearUndo', scope: 'home' }).undo).toBeNull();
  });

  test('clearing with nothing to undo changes nothing', () => {
    expect(run(s, { type: 'clearUndo', scope: 'home' })).toBe(s);
  });

  test('a later change clears the undo, so undoing can never wipe it out', () => {
    const next = run(
      s,
      { type: 'setQty', id: 'f1', qty: 0, scope: 'kitchen' },
      { type: 'setQty', id: 'f4', qty: 7, scope: 'kitchen' },
      { type: 'itemToBuy', id: 'f3' },
      { type: 'undo' },
    );
    expect(item(next, 'f1').qty).toBe(0);
    expect(item(next, 'f4').qty).toBe(7);
    expect(next.toBuy.some((t) => t.name === 'Milk 2%')).toBe(true);
  });

  test('renaming the kitchen or making a new link clears the undo', () => {
    const removed = run(s, { type: 'removePerson', id: 'sam' });
    expect(run(removed, { type: 'renameKitchen', name: 'Flat 4' }).undo).toBeNull();
    expect(run(removed, { type: 'newInviteLink' }).undo).toBeNull();
  });
});

describe('kitchen', () => {
  test('rename trims and ignores a blank name', () => {
    expect(run(s, { type: 'renameKitchen', name: '  Flat 4 ' }).kitchen.name).toBe('Flat 4');
    expect(run(s, { type: 'renameKitchen', name: '  ' })).toBe(s);
  });

  test('removing someone takes them out and offers an undo on Household', () => {
    const next = run(s, { type: 'removePerson', id: 'sam' });
    expect(next.kitchen.people.map((p) => p.id)).toEqual(['alex']);
    expect(next.undo).toMatchObject({ text: 'Sam was removed.', scope: 'household' });
    // What they added stays.
    expect(next.items).toBe(s.items);
  });

  test('removing someone not in the kitchen changes nothing', () => {
    expect(run(s, { type: 'removePerson', id: 'nope' })).toBe(s);
  });

  test('a new link for the sample kitchen uses the designed code', () => {
    const next = run(s, { type: 'newInviteLink' });
    expect(next.kitchen).toMatchObject({ inviteCode: NEW_INVITE_CODE, newLink: true });
  });

  test('later new links keep the family name and change the code', () => {
    const first = run(s, { type: 'newInviteLink' });
    const second = run(first, { type: 'newInviteLink' });
    expect(second.kitchen.inviteCode).toMatch(/^rivera-[a-z0-9]+$/);
    expect(second.kitchen.inviteCode).not.toBe(NEW_INVITE_CODE);
  });

  test('a new link for a new kitchen keeps the family name', () => {
    const solo = run(s, { type: 'choosePath', path: 'solo' });
    const next = run(solo, { type: 'newInviteLink' }, { type: 'newInviteLink' }, { type: 'newInviteLink' });
    expect(next.kitchen.inviteCode).toMatch(/^rivera-[a-z0-9]{1,4}$/);
  });

  test('leaving starts a new, empty kitchen with only you', () => {
    const ticked = run(s, { type: 'toggleToBuy', id: 't', scope: 'household' });
    const next = run(ticked, { type: 'leaveKitchen' });
    expect(next.kitchen).toEqual({
      name: 'Rivera kitchen',
      people: [{ ...ALEX, note: 'Made this kitchen' }],
      inviteCode: 'rivera-kitchen',
      newLink: false,
      syncedAgo: '',
    });
    expect(next.items).toEqual([]);
    expect(next.toBuy).toEqual([]);
    expect(next.recipes).toEqual([]);
    expect(next.undo).toBeNull();
  });

  test('signing in starts as a new person, not the sample Alex Rivera', () => {
    const next = run(s, { type: 'signIn', method: 'email', contact: 'jo@example.com' });
    expect(next.user).toEqual({ id: 'me', name: '', note: '', email: 'jo@example.com' });
    expect(run(s, { type: 'signIn', method: 'phone', contact: '+1 5551234' }).user.email).toBeUndefined();
    const solo = run(run(next, { type: 'setName', name: 'Jo' }), { type: 'choosePath', path: 'solo' });
    expect(solo.kitchen).toMatchObject({ name: 'Jo’s kitchen', inviteCode: 'jo-kitchen' });
    expect(solo.kitchen.people).toEqual([{ id: 'me', name: 'Jo', note: 'Made this kitchen', email: 'jo@example.com' }]);
  });

  test('a person who signs in and joins is not the maker of the sample kitchen', () => {
    const joined = run(run(s, { type: 'signIn', method: 'email', contact: 'jo@example.com' }), { type: 'choosePath', path: 'join' });
    expect(joined.kitchen.people.map((p) => p.id)).toEqual(['me', 'alex', 'sam']);
    expect(joined.kitchen.people[0].note).not.toBe('Made this kitchen');
  });

  test('a new kitchen uses the first name when there is no last name', () => {
    const named = { ...s, user: { id: 'jo', name: 'Jo Anne', note: '' } };
    expect(run(named, { type: 'leaveKitchen' }).kitchen).toMatchObject({ name: 'Jo Anne’s kitchen', inviteCode: 'jo-anne-kitchen' });
  });

  test('an accented name makes a clean invite code', () => {
    const named = { ...s, user: { ...s.user, name: 'José', lastName: 'Núñez' } };
    expect(run(named, { type: 'leaveKitchen' }).kitchen.inviteCode).toBe('nunez-kitchen');
  });
});

describe('notifications', () => {
  test('switches turn on and off', () => {
    const off = run(s, { type: 'setNotification', key: 'toBuy', on: false });
    expect(off.notifications.toBuy).toBe(false);
    expect(run(off, { type: 'setNotification', key: 'toBuy', on: true }).notifications.toBuy).toBe(true);
    expect(off.notifications.useSoonTime).toBe(s.notifications.useSoonTime);
  });

  test('the use-soon time changes', () => {
    expect(run(s, { type: 'setUseSoonTime', time: '8:00 am' }).notifications.useSoonTime).toBe('8:00 am');
  });
});

describe('onboarding', () => {
  test('sign-in records the method and where the code went', () => {
    expect(run(s, { type: 'signIn', method: 'email', contact: 'a@b.co' }).session).toMatchObject({ signIn: 'email', contact: 'a@b.co' });
    expect(run(s, { type: 'signIn', method: 'apple' }).session).toMatchObject({ signIn: 'apple', contact: '' });
  });

  test('your name changes everywhere it shows', () => {
    const next = run(s, { type: 'setName', name: '  Lex ' });
    expect(next.user.name).toBe('Lex');
    expect(next.kitchen.people.find((p) => p.id === 'alex')!.name).toBe('Lex');
    expect(next.kitchen.people.find((p) => p.id === 'sam')!.name).toBe('Sam');
  });

  test('a last name is set when given, cleared when empty, and kept when left out', () => {
    const named = run(s, { type: 'setName', name: 'Lex', lastName: ' Rivera ' });
    expect(named.user).toMatchObject({ name: 'Lex', lastName: 'Rivera' });
    expect(named.kitchen.people.find((p) => p.id === 'alex')!.lastName).toBe('Rivera');
    expect(run(named, { type: 'setName', name: 'Lex' }).user.lastName).toBe('Rivera');
    expect(run(named, { type: 'setName', name: 'Lex', lastName: '' }).user.lastName).toBe('');
  });

  test('a blank name keeps the old one', () => {
    expect(run(s, { type: 'setName', name: '  ' }).user.name).toBe('Alex');
  });

  test.each(['solo', 'household'] as const)('%s starts a new, empty kitchen', (path) => {
    const next = run(s, { type: 'choosePath', path });
    expect(next.session.path).toBe(path);
    expect(next.kitchen.name).toBe('Rivera kitchen');
    expect(next.kitchen.people).toHaveLength(1);
    expect(next.kitchen.syncedAgo).toBe('');
    expect(next.items).toEqual([]);
    expect(next.toBuy).toEqual([]);
    expect(next.recipes).toEqual([]);
  });

  test('joining loads the sample kitchen with you first', () => {
    const me = { ...s, user: { id: 'me', name: 'Jo', note: '' } };
    const next = run(me, { type: 'choosePath', path: 'join' });
    expect(next.session.path).toBe('join');
    expect(next.kitchen.people.map((p) => p.id)).toEqual(['me', 'alex', 'sam']);
    expect(next.items).toBe(SEED_ITEMS);
    expect(next.toBuy).toBe(SEED_TO_BUY);
  });

  test('joining as a seed person does not list them twice', () => {
    const next = run(s, { type: 'choosePath', path: 'join' });
    expect(next.kitchen.people.map((p) => p.id)).toEqual(['alex', 'sam']);
  });

  test('skipping the first scan leaves an empty kitchen', () => {
    const next = run(s, { type: 'skipFirstScan' });
    expect(next.items).toEqual([]);
    expect(next.kitchen.syncedAgo).toBe('');
  });

  test('a scan during onboarding fills the new kitchen', () => {
    const next = run(s, { type: 'choosePath', path: 'household' }, { type: 'addScanned', lines: [line('Milk', 'fridge')] });
    expect(next.items.map((i) => i.name)).toEqual(['Milk']);
    expect(next.session.lastScan.fridge).toEqual(['Milk']);
    expect(next.session.path).toBe('household');
  });

  test('finishing marks you onboarded and clears undo', () => {
    const ticked = run(s, { type: 'toggleToBuy', id: 't', scope: 'home' });
    const next = run(ticked, { type: 'finishOnboarding' });
    expect(next.session.onboarded).toBe(true);
    expect(next.undo).toBeNull();
  });

  test('reset goes back to the start', () => {
    const next = run(
      s,
      { type: 'signIn', method: 'phone', contact: '5551234' },
      { type: 'choosePath', path: 'solo' },
      { type: 'finishOnboarding' },
      { type: 'reset' },
    );
    expect(next).toEqual(initialState());
  });
});
