// Kitchen and profile changes that go through Supabase RPCs (supabase/migrations/*_init.sql).
// Screens call these only when `hasBackend`, then `reload()` the store. Without a backend they keep the local actions.

import { failureOf, type Failure } from './errors';
import type { NotificationSettings } from './types';
import { supabase } from './supabase';

/** What a call came back with. Anything the screens can't explain to a person is 'offline' or 'server'. */
export type Result = 'ok' | 'not_found' | 'used' | 'expired' | 'not_creator' | 'in_other_kitchen' | Failure;

/** The exception messages the RPCs raise, as the codes the screens show copy for. */
const CODES: Record<string, Result> = {
  invite_not_found: 'not_found',
  invite_used: 'used',
  invite_expired: 'expired',
  not_creator: 'not_creator',
  in_other_kitchen: 'in_other_kitchen',
  // Only create_kitchen raises it: a retry after the first call worked, so the kitchen is there.
  already_in_kitchen: 'ok',
};

export const toResult = (error: { message?: string } | null, status?: number): Result =>
  !error ? 'ok' : (CODES[error.message ?? ''] ?? failureOf(status));

/** The failure behind a result, for screens that only show a generic error line; null when it worked. */
export const failure = (r: Result): Failure | null => (r === 'ok' ? null : r === 'offline' ? 'offline' : 'server');

/** Runs a Supabase call. supabase-js answers status 0 when the request never reached the server; a thrown error counts as offline too. */
async function run(call: () => PromiseLike<{ error: { message?: string } | null; status?: number }>): Promise<Result> {
  if (!supabase) return 'server';
  try {
    const { error, status } = await call();
    return toResult(error, status);
  } catch {
    return 'offline';
  }
}

async function uid(): Promise<string | undefined> {
  return (await supabase?.auth.getSession())?.data.session?.user.id;
}

export const createKitchen = (name: string) => run(() => supabase!.rpc('create_kitchen', { name }));
export const joinKitchen = (code: string) => run(() => supabase!.rpc('join_kitchen', { code }));
export const newInvite = (kitchenId: string) => run(() => supabase!.rpc('new_invite', { kitchen_id: kitchenId }));
export const removeMember = (kitchenId: string, userId: string) =>
  run(() => supabase!.rpc('remove_member', { kitchen_id: kitchenId, user_id: userId }));
export const restoreMember = (kitchenId: string, userId: string) =>
  run(() => supabase!.rpc('restore_member', { kitchen_id: kitchenId, user_id: userId }));
export const leaveKitchen = () => run(() => supabase!.rpc('leave_kitchen'));
export const deleteAccount = () => run(() => supabase!.rpc('delete_account'));

async function updateProfile(fields: Record<string, unknown>): Promise<Result> {
  const id = await uid();
  if (!id) return 'server';
  return run(() => supabase!.from('profiles').update(fields).eq('id', id));
}

export const saveProfile = (p: { name: string; last_name?: string | null }) => updateProfile(p);
export const saveNotifications = (n: NotificationSettings) => updateProfile({ notifications: n });
export const finishOnboarding = () => updateProfile({ onboarded_at: new Date().toISOString() });
