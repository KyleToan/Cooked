import { describe, expect, test } from '@jest/globals';

import { fromSaved, SAVE_VERSION, toSaved } from '@/data/saved';
import { sampleState, reducer, type Action, type State } from '@/data/store';

const today = new Date(2026, 9, 11, 9, 30);

const signedIn = (): State => {
  const actions: Action[] = [
    { type: 'signIn', method: 'email', contact: 'alex@example.com' },
    { type: 'choosePath', path: 'join' },
    { type: 'finishOnboarding' },
    { type: 'toggleToBuy', id: sampleState().toBuy[0].id, scope: 'home' },
  ];
  return actions.reduce(reducer, sampleState());
};

describe('saved kitchen', () => {
  test('save then load gives the same state, without the undo', () => {
    const s = signedIn();
    expect(s.undo).not.toBeNull();
    const saved = fromSaved(toSaved(s, today), today)!;
    expect(reducer(sampleState(), { type: 'restore', saved })).toEqual({ ...s, undo: null });
  });

  test('an item saved 2 days ago shows 2 fewer days left', () => {
    const s = signedIn();
    const loaded = fromSaved(toSaved(s, today), new Date(2026, 9, 13, 20, 0))!;
    loaded.items.forEach((item, i) => expect(item.daysLeft).toBe(s.items[i].daysLeft - 2));
  });

  test('an unknown version or broken text is ignored', () => {
    const text = toSaved(signedIn(), today);
    expect(fromSaved(text.replace(`"version":${SAVE_VERSION}`, '"version":99'), today)).toBeNull();
    expect(fromSaved('{not json', today)).toBeNull();
    expect(fromSaved(null, today)).toBeNull();
  });
});
