// Invite links that open the app: the code is read from the link and waits for Join.

import { afterEach, describe, expect, test } from '@jest/globals';

import { redirectSystemPath } from '@/app/+native-intent';
import { clearPendingInvite, inviteCodeIn, pendingInvite } from '@/data/pendingInvite';

afterEach(clearPendingInvite);

describe('inviteCodeIn', () => {
  test('reads the code from universal links, the app scheme and bare paths', () => {
    expect(inviteCodeIn('https://cooked.app/join/rivera-k7m2')).toBe('rivera-k7m2');
    expect(inviteCodeIn('https://cooked.app/join/Rivera-Kitchen/?utm=x')).toBe('rivera-kitchen');
    expect(inviteCodeIn('cooked://join/abc-1234')).toBe('abc-1234');
    expect(inviteCodeIn('/join/abc')).toBe('abc');
  });

  test('anything else is not an invite', () => {
    expect(inviteCodeIn('/join')).toBeNull();
    expect(inviteCodeIn('/recipe/r1')).toBeNull();
    expect(inviteCodeIn('https://cooked.app/privacy')).toBeNull();
  });
});

describe('redirectSystemPath', () => {
  test('an invite opening the app keeps the code and starts at the root', () => {
    expect(redirectSystemPath({ path: 'https://cooked.app/join/rivera-k7m2', initial: true })).toBe('/');
    expect(pendingInvite()).toBe('rivera-k7m2');
  });

  test('an invite while the app is open keeps the code and stays put', () => {
    expect(redirectSystemPath({ path: 'cooked://join/abc', initial: false })).toBeNull();
    expect(pendingInvite()).toBe('abc');
  });

  test('other links pass through', () => {
    expect(redirectSystemPath({ path: '/recipe/r1', initial: true })).toBe('/recipe/r1');
    expect(pendingInvite()).toBeNull();
  });
});
