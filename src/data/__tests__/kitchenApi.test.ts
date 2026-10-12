import { describe, expect, jest, test } from '@jest/globals';

import { createKitchen, finishOnboarding, joinKitchen, restoreMember, saveProfile, toResult } from '@/data/kitchenApi';

// jest.mock is hoisted above the imports.

const mockRpc = jest.fn<(fn: string, args?: object) => Promise<{ error: { message: string } | null }>>();
const mockEq = jest.fn(async () => ({ error: null }));
const mockUpdate = jest.fn((_fields: object) => ({ eq: mockEq }));
jest.mock('@/data/supabase', () => ({
  hasBackend: true,
  supabase: {
    rpc: (fn: string, args?: object) => mockRpc(fn, args),
    from: () => ({ update: mockUpdate }),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
  },
}));


const fails = (message: string) => mockRpc.mockResolvedValueOnce({ error: { message } });

describe('kitchenApi error mapping', () => {
  test('known RPC errors become their codes', () => {
    expect(toResult(null)).toBe('ok');
    expect(toResult({ message: 'invite_not_found' })).toBe('not_found');
    expect(toResult({ message: 'invite_used' })).toBe('used');
    expect(toResult({ message: 'invite_expired' })).toBe('expired');
    expect(toResult({ message: 'not_creator' })).toBe('not_creator');
    expect(toResult({ message: 'in_other_kitchen' })).toBe('in_other_kitchen');
  });

  test('anything else is offline or server, by whether the server answered', () => {
    expect(toResult({ message: 'not_signed_in' }, 400)).toBe('server');
    expect(toResult({ message: 'boom' }, 500)).toBe('server');
    expect(toResult({ message: 'TypeError: Network request failed' }, 0)).toBe('offline');
    expect(toResult({})).toBe('offline');
  });

  test('joinKitchen passes the code and maps the answer', async () => {
    fails('invite_expired');
    expect(await joinKitchen('rivera-kitchen')).toBe('expired');
    expect(mockRpc).toHaveBeenLastCalledWith('join_kitchen', { code: 'rivera-kitchen' });
    mockRpc.mockResolvedValueOnce({ error: null });
    expect(await joinKitchen('rivera-kitchen')).toBe('ok');
  });

  test('a thrown call is offline', async () => {
    mockRpc.mockRejectedValueOnce(new Error('offline'));
    expect(await restoreMember('k1', 'u2')).toBe('offline');
  });

  test('createKitchen treats already_in_kitchen as done', async () => {
    fails('already_in_kitchen');
    expect(await createKitchen('Rivera kitchen')).toBe('ok');
  });

  test('profile updates go to your own row', async () => {
    expect(await saveProfile({ name: 'Alex', last_name: null })).toBe('ok');
    expect(mockUpdate).toHaveBeenLastCalledWith({ name: 'Alex', last_name: null });
    expect(mockEq).toHaveBeenLastCalledWith('id', 'u1');
    expect(await finishOnboarding()).toBe('ok');
    expect(mockUpdate.mock.lastCall?.[0]).toHaveProperty('onboarded_at');
  });
});
