import { inviteCodeIn, setPendingInvite } from '@/data/pendingInvite';

/**
 * Links into the app. An invite link has no screen of its own: its code waits for Join (onboarding's
 * "I have an invite"). Opening the app, it starts where it would anyway; while it's open, it stays put.
 * Someone already in a kitchen just sees the app.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    const code = inviteCodeIn(path);
    if (!code) return path;
    setPendingInvite(code);
    return initial ? '/' : null;
  } catch {
    // A link must never crash the app.
    return initial ? '/' : null;
  }
}
