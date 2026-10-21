// The sample data, in development only. Metro replaces __DEV__ with false in a
// release build and drops the require, so seed.ts isn't in the App Store bundle.

/* eslint-disable @typescript-eslint/no-require-imports */
export const devSeed: typeof import('./seed') | null = __DEV__ ? require('./seed') : null;
