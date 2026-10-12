// Write-through with a (mocked) backend: hydrate replaces the local copy, a load
// never echoes back as a write, and a failed write rolls back to the server's copy.

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { Loaded, Synced } from '@/data/remote';
import { initialState, reducer, StoreProvider, useStore } from '@/data/store';

jest.mock('expo-router', () => ({ useFocusEffect: () => undefined }));
jest.mock('@/data/supabase', () => ({ supabase: {}, hasBackend: true }));
const mockSession = { user: { id: 'u1', email: 'alex@example.com' } };
jest.mock('@/data/auth', () => ({ useAuth: () => ({ session: mockSession, ready: true }) }));

const mockLoadAll = jest.fn<(userId: string, contact: object) => Promise<Loaded>>();
const mockWriteDiff = jest.fn<(kitchenId: string, prev: Synced, next: Synced, today: Date) => Promise<void>>();
jest.mock('@/data/remote', () => ({
  loadAll: (userId: string, contact: object) => mockLoadAll(userId, contact),
  writeDiff: (kitchenId: string, prev: Synced, next: Synced, today: Date) => mockWriteDiff(kitchenId, prev, next, today),
  markSynced: async () => undefined,
  subscribeKitchen: () => () => undefined,
}));

const user = { id: 'u1', name: 'Alex', email: 'alex@example.com', note: 'Made this kitchen' };
const loaded = (): Loaded => ({
  user,
  kitchen: { id: 'k1', name: 'Rivera kitchen', people: [user], inviteCode: 'rivera-kitchen', newLink: false, syncedAgo: '2h ago' },
  items: [{ id: 'i1', name: 'Milk', place: 'fridge', qty: 1, unit: '', meta: '', daysLeft: 3, addedBy: 'u1' }],
  toBuy: [{ id: 't1', name: 'Bread', note: 'Added by Alex', place: 'pantry', done: false, addedBy: 'u1' }],
  recipes: [],
  notifications: { toBuy: true, useSoon: false, joins: true, weekly: false, useSoonTime: '6:00 pm' },
  onboarded: true,
  contact: 'alex@example.com',
});

describe('hydrate', () => {
  test('replaces the kitchen, user, notifications and onboarded, and clears undo', () => {
    const data = loaded();
    const start = initialState();
    const before = reducer(start, { type: 'toggleToBuy', id: start.toBuy.find((t) => !t.done)!.id, scope: 'home' });
    expect(before.undo).not.toBeNull();
    const s = reducer(before, { type: 'hydrate', data });
    expect(s.session.onboarded).toBe(true);
    expect(s.session.contact).toBe('alex@example.com');
    expect(s.user).toBe(data.user);
    expect(s.notifications).toBe(data.notifications);
    expect(s.items).toBe(data.items);
    expect(s.kitchen).toMatchObject({ id: 'k1', name: 'Rivera kitchen' });
    expect(s.undo).toBeNull();
  });

  test('no kitchen yet gives an empty kitchen named after the person', () => {
    const s = reducer(initialState(), { type: 'hydrate', data: { ...loaded(), kitchen: null, items: [], toBuy: [] } });
    expect(s.kitchen.id).toBeUndefined();
    expect(s.kitchen.name).toBe('Alex kitchen');
    expect(s.items).toEqual([]);
  });

  test('only the snapshot (a rollback) leaves the session and user alone', () => {
    const start = initialState();
    const s = reducer(start, { type: 'hydrate', data: { kitchen: loaded().kitchen, items: [], toBuy: [], recipes: [] } });
    expect(s.session.onboarded).toBe(false);
    expect(s.user).toBe(start.user);
  });
});

describe('StoreProvider with a backend', () => {
  const box: { store?: ReturnType<typeof useStore> } = {};
  function Probe() {
    const current = useStore();
    useEffect(() => {
      box.store = current;
    });
    return null;
  }
  const flush = () => act(async () => {});
  let renderer: ReactTestRenderer;
  afterEach(() => {
    act(() => renderer.unmount());
  });

  beforeEach(async () => {
    mockLoadAll.mockReset().mockResolvedValue(loaded());
    mockWriteDiff.mockReset().mockResolvedValue(undefined);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => {
      renderer = create(
        <StoreProvider>
          <Probe />
        </StoreProvider>,
      );
    });
    await flush();
  });

  test('loads on start, and the load is not written back', async () => {
    expect(mockLoadAll).toHaveBeenCalledWith('u1', { email: 'alex@example.com', phone: undefined });
    expect(box.store!.ready).toBe(true);
    expect(box.store!.state.kitchen.id).toBe('k1');
    expect(box.store!.state.session.onboarded).toBe(true);
    await act(() => box.store!.reload());
    expect(mockWriteDiff).not.toHaveBeenCalled();
  });

  test('a change is written as a diff against what the server holds', async () => {
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
    const [kitchenId, prev, next] = mockWriteDiff.mock.calls[0];
    expect(kitchenId).toBe('k1');
    expect(prev.toBuy[0].done).toBe(false);
    expect(next.toBuy[0].done).toBe(true);
  });

  test('a failed write rolls back to the server copy', async () => {
    mockWriteDiff.mockRejectedValueOnce(new Error('offline'));
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    await flush();
    expect(box.store!.state.toBuy[0].done).toBe(false);
    // The rollback itself is not written.
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
  });
});
