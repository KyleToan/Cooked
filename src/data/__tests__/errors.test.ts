import { failText, failureOf } from '../errors';

test('no status is offline, any status is the server', () => {
  expect(failureOf(undefined)).toBe('offline');
  expect(failureOf(0)).toBe('offline');
  expect(failureOf(400)).toBe('server');
  expect(failureOf(500)).toBe('server');
});

test('only offline says to check the connection', () => {
  expect(failText('send the code', 'offline')).toBe('We couldn’t send the code. Check your connection and try again.');
  expect(failText('send the code', 'server')).toBe('We couldn’t send the code. Something went wrong on our end. Try again in a bit.');
});
