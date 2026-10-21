// An invite link that opened the app (cooked.app/join/<code>) before onboarding reached Join.
// +native-intent.tsx keeps the code here; Who you cook with picks "I have an invite" and Join fills it in.

let pending: string | null = null;

/** The code in an invite link, or null when the path isn't one: "https://cooked.app/join/rivera-k7m2", "cooked://join/x". */
export function inviteCodeIn(path: string): string | null {
  const m = /(?:^|\/)join\/([a-z0-9-]+)\/?(?:[?#]|$)/i.exec(path);
  return m ? m[1].toLowerCase() : null;
}

export function setPendingInvite(code: string) {
  pending = code;
}

/** The waiting code, if any. Stays until joining clears it, so going back and forth keeps it. */
export function pendingInvite(): string | null {
  return pending;
}

export function clearPendingInvite() {
  pending = null;
}
