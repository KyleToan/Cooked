// The undo bar goes away by itself: the provider clears an undo UNDO_MS after
// it was set, and a newer undo starts its own time.

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import { StoreProvider, UNDO_MS, useStore } from '@/data/store';

jest.mock('expo-router', () => ({ useFocusEffect: () => undefined }));

const box: { store?: ReturnType<typeof useStore> } = {};
function Probe() {
  const current = useStore();
  useEffect(() => {
    box.store = current;
  });
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  act(() => {
    create(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test('an undo clears itself after a few seconds', () => {
  act(() => box.store!.actions.toggleToBuy('t', 'home'));
  expect(box.store!.state.undo?.text).toBe('Tomatoes ticked off');
  act(() => jest.advanceTimersByTime(UNDO_MS - 100));
  expect(box.store!.state.undo).not.toBeNull();
  act(() => jest.advanceTimersByTime(200));
  expect(box.store!.state.undo).toBeNull();
});

test('a newer undo gets its own time', () => {
  act(() => box.store!.actions.toggleToBuy('t', 'home'));
  act(() => jest.advanceTimersByTime(UNDO_MS - 1000));
  act(() => box.store!.actions.toggleToBuy('f', 'home'));
  act(() => jest.advanceTimersByTime(2000));
  expect(box.store!.state.undo?.text).toBe('Feta ticked off');
  act(() => jest.advanceTimersByTime(UNDO_MS));
  expect(box.store!.state.undo).toBeNull();
});

test('addScanned with undo shows it on Home', () => {
  act(() => box.store!.actions.addScanned([{ id: 'k', name: 'Kale', price: '', place: 'fridge', qty: 1 }], { undo: true }));
  expect(box.store!.state.undo).toMatchObject({ scope: 'home', text: 'Added 1 item to your kitchen' });
});
