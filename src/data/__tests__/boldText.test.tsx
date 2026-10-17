// iOS Bold Text steps each custom face up one weight (custom fonts don't follow it on their own).
import { expect, jest, test } from '@jest/globals';
import { AccessibilityInfo, StyleSheet } from 'react-native';
/* eslint-disable @typescript-eslint/no-require-imports */
import { act, create } from 'react-test-renderer';

test('Text uses the next weight up while Bold Text is on, and goes back when it is off', async () => {
  let change: (on: boolean) => void = () => {};
  jest.spyOn(AccessibilityInfo, 'isBoldTextEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, fn: (on: boolean) => void) => {
    change = fn;
    return { remove: () => {} };
  }) as typeof AccessibilityInfo.addEventListener);
  // Loaded after the spies, since the Bold Text listener is set up when the module loads.
  const { Text } = require('@/components/Text') as typeof import('@/components/Text');
  const { font } = require('@/theme/tokens') as typeof import('@/theme/tokens');
  const RN = require('react-native') as typeof import('react-native');

  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<Text>Tomatoes</Text>);
  });
  const family = () => StyleSheet.flatten(tree.root.findByType(RN.Text).props.style).fontFamily;
  expect(family()).toBe(font.Lexend_500Medium);
  act(() => change(false));
  expect(family()).toBe(font.Lexend_400Regular);
});
