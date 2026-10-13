// An invite code that arrived by link (cooked://join/<code>, and https://cooked.app/join/<code> once
// the domain is linked), kept until onboarding reaches Join. Lives in memory: a link opens the app fresh.

export const pendingInvite: { code: string | null } = { code: null };

/** Keeps a code from an invite link until Join; a fresh code replaces an older one. */
export function rememberInvite(code: string) {
  pendingInvite.code = code.trim().toLowerCase();
}
