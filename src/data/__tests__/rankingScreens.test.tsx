// The rating flow on the real recipe screen and the Ranked filter on Recipes.
// The Sheet is swapped for a plain view and Reduce Motion is on: the motion is checked by hand, the steps here.

import { beforeEach, expect, jest, test } from '@jest/globals';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import RecipesTab from '@/app/(tabs)/recipes';
import RecipeScreen from '@/app/recipe/[id]';
import { StoreProvider, useStore } from '@/data/store';

const mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
  useScrollToTop: () => undefined,
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: () => undefined, back: () => undefined, canGoBack: () => true, replace: () => undefined, setParams: () => undefined }),
}));
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({ ...jest.requireActual<object>('react-native-reanimated/mock'), useReducedMotion: () => true }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/Sheet', () => ({
  Sheet: ({ visible = true, title, subtitle, children }: { visible?: boolean; title?: string; subtitle?: string; children: ReactNode }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return visible ? (
      <View testID="sheet">
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {children}
      </View>
    ) : null;
  },
}));

const box: { store?: ReturnType<typeof useStore> } = {};
function Probe() {
  const s = useStore();
  useEffect(() => {
    box.store = s;
  });
  return null;
}

let tree: ReactTestRenderer;
function render(screen: ReactNode) {
  act(() => {
    tree = create(
      <StoreProvider>
        <Probe />
        {screen}
      </StoreProvider>,
    );
  });
}

const texts = (node: ReactTestInstance = tree.root) =>
  node.findAll((n) => (n.type as unknown) === 'Text').map((n) => [n.props.children].flat().filter((c) => typeof c === 'string').join(''));

/** Presses the first pressable around the text `label`. */
function press(label: string) {
  const hit = tree.root.findAll((n) => (n.type as unknown) === 'Text' && [n.props.children].flat().join('') === label);
  const pressable = (t: ReactTestInstance) => {
    let n: ReactTestInstance | null = t;
    while (n && !n.props.onPress) n = n.parent;
    return n;
  };
  const target = hit.map(pressable).find(Boolean);
  expect(target).toBeTruthy();
  act(() => target!.props.onPress());
}

const sheetTexts = () => {
  const s = tree.root.findAll((n) => n.props.testID === 'sheet' && typeof n.type !== 'string');
  return s.length ? texts(s[0]) : [];
};

const titleOf = (id: string) => box.store!.state.recipes.find((r) => r.id === id)!.title;
/** The other recipe on the This or that? cards right now. */
const rivalNow = () => {
  const mine = titleOf(mockParams.id!);
  const shown = sheetTexts();
  return box.store!.state.recipes.map((r) => r.title).find((t) => t !== mine && shown.includes(t));
};

beforeEach(() => {
  // Never answers, so no state update lands outside act().
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockReturnValue(new Promise(() => undefined));
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  box.store = undefined;
});

/** Opens the sheet, picks a feeling, then answers each comparison with `better(rival)`. */
function rate(feeling: string, better: (rival: string) => boolean | 'tie' = () => true) {
  press(texts().includes('Rate this recipe') ? 'Rate this recipe' : 'Rate again');
  expect(sheetTexts()).toContain('How was it?');
  press(feeling);
  const mine = titleOf(mockParams.id!);
  for (let guard = 0; sheetTexts().includes('Which do you prefer?'); guard++) {
    expect(guard).toBeLessThan(10);
    const rival = rivalNow()!;
    const answer = better(rival);
    // The sheet's title is the recipe too; press finds the card, the first one you can press.
    press(answer === 'tie' ? 'Can’t decide' : answer ? mine : rival);
  }
  return sheetTexts();
}

test('the first recipe with a feeling skips the comparisons, scores the band top, and Done closes', () => {
  mockParams.id = 'pasta';
  render(<RecipeScreen />);
  expect(texts()).toContain('Rate this recipe');
  const done = rate('Loved it');
  expect(done).toContain('Your score');
  expect(done).toContain('10.0');
  expect(done).toContain('Your first ranked recipe');
  press('Done');
  expect(sheetTexts()).toEqual([]);
  expect(texts()).toEqual(expect.arrayContaining(['10.0', 'Your score', 'Your first ranked recipe', 'Rate again']));
  expect(texts()).not.toContain('Rate this recipe');
});

test('This or that? places the recipe between the two it was compared with', () => {
  mockParams.id = 'shakshuka';
  render(<RecipeScreen />);
  act(() => {
    box.store!.actions.rankRecipe('pasta', 'loved', 0);
    box.store!.actions.rankRecipe('curry', 'loved', 0);
  });
  const done = rate('Loved it', (rival) => rival !== 'Chickpea curry');
  expect(done).toContain('8.9');
  expect(done).toContain('#2 of the 3 recipes you’ve ranked');
  expect(box.store!.state.ranks.loved).toEqual(['curry', 'shakshuka', 'pasta']);
});

test('rating again moves it out of its old feeling, and Can’t decide places it at the rival', () => {
  mockParams.id = 'pesto';
  render(<RecipeScreen />);
  act(() => {
    box.store!.actions.rankRecipe('pasta', 'fine', 0);
    box.store!.actions.rankRecipe('pesto', 'loved', 0);
  });
  expect(texts()).toContain('Rate again');
  const done = rate('It was fine', () => 'tie');
  expect(done).toContain('#1 of the 2 recipes you’ve ranked');
  expect(box.store!.state.ranks).toEqual({ loved: [], fine: ['pesto', 'pasta'], disliked: [] });
});

test('Skip asks about another recipe, and Undo goes back one answer, then back to no feeling', () => {
  mockParams.id = 'shakshuka';
  render(<RecipeScreen />);
  act(() => {
    box.store!.actions.rankRecipe('curry', 'loved', 0);
    box.store!.actions.rankRecipe('pasta', 'loved', 1);
    box.store!.actions.rankRecipe('oats', 'loved', 2);
  });
  press('Rate this recipe');
  press('Loved it');
  const first = rivalNow();
  press('Skip');
  const second = rivalNow();
  expect(second).toBeTruthy();
  expect(second).not.toBe(first);
  press('Undo');
  expect(rivalNow()).toBe(first);
  press('Undo');
  expect(sheetTexts()).not.toContain('Which do you prefer?');
  expect(sheetTexts()).toContain('How was it?');
  expect(box.store!.state.ranks.loved).toEqual(['curry', 'pasta', 'oats']);
});

test('leaving a rating midway saves nothing, and opening it again starts over', () => {
  mockParams.id = 'shakshuka';
  render(<RecipeScreen />);
  act(() => box.store!.actions.rankRecipe('pasta', 'disliked', 0));
  press('Rate this recipe');
  press('Not for me');
  expect(sheetTexts()).toContain('Which do you prefer?');
  press('Rate this recipe');
  expect(sheetTexts()).not.toContain('Which do you prefer?');
  expect(box.store!.state.ranks.disliked).toEqual(['pasta']);
});

test('Recipes: ranked rows show a score ring, Ranked lists best first with Tonight included, and says when nothing is ranked', () => {
  mockParams.id = undefined;
  render(<RecipesTab />);
  press('Ranked');
  expect(texts()).toContain('Nothing ranked yet. Open a recipe you’ve made and rate it to start your list.');
  const tonight = box.store!.state.recipes.find((r) => r.tonight)!;
  act(() => {
    box.store!.actions.rankRecipe('pesto', 'fine', 0);
    box.store!.actions.rankRecipe(tonight.id, 'loved', 0);
    box.store!.actions.rankRecipe('oats', 'disliked', 0);
  });
  const all = texts();
  const at = ['Pesto pasta', tonight.title, 'Berry overnight oats'].map((t) => all.indexOf(t));
  expect(at.every((i) => i >= 0)).toBe(true);
  expect(at[1]).toBeLessThan(at[0]);
  expect(at[0]).toBeLessThan(at[2]);
  expect(all).toEqual(expect.arrayContaining(['10.0', '6.6', '3.3']));
  expect(all).not.toContain('Tonight');
  expect(all).not.toContain('Chickpea curry');
  press('All');
  expect(texts()).toContain('Tonight');
  expect(texts()).toContain('Chickpea curry');
});
