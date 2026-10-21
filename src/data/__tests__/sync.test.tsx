// Write-through with a (mocked) backend: hydrate replaces the local copy, a load
// never echoes back as a write, a write that fails offline is kept and sent again
// (even after a restart), and a write the server refuses rolls back.

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { Loaded, Synced } from '@/data/remote';
import { toSaved } from '@/data/saved';
import { sampleState, reducer, StoreProvider, useStore } from '@/data/store';

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
  writeFailure: (e: unknown) => (jest.requireActual('@/data/remote') as typeof import('@/data/remote')).writeFailure(e),
}));

/** What supabase-js gives back: status 0 offline, the HTTP status when the server answered. */
const requestError = (status: number) => {
  const { RequestError } = jest.requireActual('@/data/remote') as typeof import('@/data/remote');
  return new RequestError('failed', status);
};

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
    const start = sampleState();
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
    const s = reducer(sampleState(), { type: 'hydrate', data: { ...loaded(), kitchen: null, items: [], toBuy: [] } });
    expect(s.kitchen.id).toBeUndefined();
    expect(s.kitchen.name).toBe('Alex kitchen');
    expect(s.items).toEqual([]);
  });

  test('only the snapshot (a rollback) leaves the session and user alone', () => {
    const start = sampleState();
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

  test('offline, the change is kept and sent again on Retry', async () => {
    mockWriteDiff.mockRejectedValueOnce(requestError(0));
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    expect(box.store!.state.toBuy[0].done).toBe(true);
    expect(box.store!.sync).toMatchObject({ problem: 'offline', unsent: true });
    // A change made while offline waits for the same send.
    await act(async () => box.store!.actions.addToBuy('Eggs'));
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
    await act(async () => box.store!.sync.retry());
    await flush();
    expect(mockWriteDiff).toHaveBeenCalledTimes(2);
    const [, prev, next] = mockWriteDiff.mock.calls[1];
    // Everything since the server last answered, in one diff.
    expect(prev.toBuy.map((t) => t.done)).toEqual([false]);
    expect(next.toBuy.map((t) => t.name)).toEqual(['Bread', 'Eggs']);
    expect(box.store!.sync).toMatchObject({ problem: null, unsent: false });
  });

  test('a server error keeps the change too', async () => {
    mockWriteDiff.mockRejectedValueOnce(requestError(503));
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    expect(box.store!.state.toBuy[0].done).toBe(true);
    expect(box.store!.sync.problem).toBe('server');
  });

  test('a write the server refuses rolls back to the server copy', async () => {
    mockWriteDiff.mockRejectedValueOnce(requestError(403));
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    await flush();
    expect(box.store!.state.toBuy[0].done).toBe(false);
    expect(box.store!.sync).toMatchObject({ problem: 'rejected', unsent: false });
    // The rollback itself is not written.
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
  });
});

describe('StoreProvider with a backend and a copy on the phone', () => {
  const box: { store?: ReturnType<typeof useStore> } = {};
  function Probe() {
    const current = useStore();
    useEffect(() => {
      box.store = current;
    });
    return null;
  }
  const flush = () => act(async () => {});
  const store = new Map<string, string>();
  let renderer: ReactTestRenderer;

  const cache = (userId: string) => {
    const data = loaded();
    const s = reducer(sampleState(), { type: 'hydrate', data: { ...data, user: { ...data.user, id: userId } } });
    store.set('cooked.state', toSaved(s, new Date()));
  };
  const mount = async () => {
    await act(async () => {
      renderer = create(
        <StoreProvider>
          <Probe />
        </StoreProvider>,
      );
    });
    await flush();
  };

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    // Offline: the load never comes back.
    mockLoadAll.mockReset().mockReturnValue(new Promise(() => undefined));
    mockWriteDiff.mockReset().mockResolvedValue(undefined);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => renderer.unmount());
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  test('opens to the restored kitchen at once, and the restore is not written to the server', async () => {
    cache('u1');
    await mount();
    expect(box.store!.ready).toBe(true);
    expect(box.store!.state.kitchen.id).toBe('k1');
    expect(box.store!.state.session.onboarded).toBe(true);
    expect(mockWriteDiff).not.toHaveBeenCalled();
    // A real edit still goes up, as a diff against the restored copy.
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
  });

  test('a change made offline goes up after the app is closed and opened again', async () => {
    cache('u1');
    await mount();
    mockWriteDiff.mockRejectedValueOnce(requestError(0));
    await act(async () => box.store!.actions.toggleToBuy('t1', 'home'));
    await flush();
    expect(box.store!.sync.unsent).toBe(true);
    act(() => renderer.unmount());

    mockWriteDiff.mockReset().mockResolvedValue(undefined);
    await mount();
    expect(box.store!.state.toBuy[0].done).toBe(true);
    expect(mockWriteDiff).toHaveBeenCalledTimes(1);
    const [, prev, next] = mockWriteDiff.mock.calls[0];
    expect(prev.toBuy[0].done).toBe(false);
    expect(next.toBuy[0].done).toBe(true);
  });

  test("someone else's copy is dropped", async () => {
    cache('u2');
    await mount();
    expect(box.store!.state.kitchen.id).toBeUndefined();
    expect(box.store!.state.session.onboarded).toBe(false);
    expect(store.has('cooked.state')).toBe(false);
    expect(mockWriteDiff).not.toHaveBeenCalled();
  });
});
