// Why a server call failed, so a screen only says "check your connection" when that's the problem.

export type Failure = 'offline' | 'server';

/** No HTTP status means the request never got an answer (offline); any status means the server answered with an error. */
export const failureOf = (status: number | undefined): Failure => (status ? 'server' : 'offline');

/** "We couldn’t send the code. Check your connection and try again." */
export const failText = (what: string, f: Failure) =>
  `We couldn’t ${what}. ${f === 'offline' ? 'Check your connection and try again.' : 'Something went wrong on our end. Try again in a bit.'}`;
