import {
  checkRecipe,
  checkRecipes,
  haveIngredient,
  matches,
  missingFor,
  normalize,
  pickTonight,
  singular,
  usedWhenMade,
} from '@/data/match';
import { SEED_ITEMS, SEED_RECIPES, SHAKSHUKA, STAPLES } from '@/data/seed';
import type { Item, Recipe } from '@/data/types';

const item = (name: string, extra: Partial<Item> = {}): Item => ({
  id: name,
  name,
  place: 'fridge',
  qty: 1,
  unit: '',
  meta: '',
  daysLeft: 10,
  addedBy: 'alex',
  ...extra,
});

const recipe = (id: string, extra: Partial<Recipe> = {}): Recipe => ({
  id,
  title: id,
  time: '10 min',
  sourceLine: '',
  sourceLink: '',
  imported: false,
  need: 0,
  have: 0,
  missing: [],
  ingredients: [],
  steps: [],
  onToBuy: false,
  ...extra,
});

describe('normalize', () => {
  test('singular forms', () => {
    expect(singular('tomatoes')).toBe('tomato');
    expect(singular('berries')).toBe('berry');
    expect(singular('leaves')).toBe('leaf');
    expect(singular('eggs')).toBe('egg');
    expect(singular('peaches')).toBe('peach');
    expect(singular('hummus')).toBe('hummus');
    expect(singular('glass')).toBe('glass');
    expect(singular('cloves')).toBe('clove');
    expect(singular('olives')).toBe('olive');
  });

  test('drops amounts, units and preparation', () => {
    expect(normalize('2 cups fresh spinach, chopped')).toEqual(['spinach']);
    expect(normalize('1 large onion (diced)')).toEqual(['onion']);
    expect(normalize('200g Feta')).toEqual(['feta']);
    expect(normalize('Milk 2%')).toEqual(['milk']);
    expect(normalize('3 cloves garlic, minced')).toEqual(['garlic']);
    expect(normalize('½ tsp ground cumin')).toEqual(['cumin']);
  });
});

describe('matches', () => {
  test.each([
    ['Tomatoes', 'tomato'],
    ['Eggs', 'Eggs'],
    ['2 large eggs', 'Eggs'],
    ['Milk', 'Milk 2%'],
    ['Chicken', 'Chicken thighs'],
    ['Salmon', 'Salmon fillets'],
    ['Peas', 'Frozen peas'],
    ['Frozen berries', 'Berries'],
    ['Basil leaves', 'Basil'],
    ['Yogurt', 'Greek yogurt'],
    ['Cheddar cheese', 'Cheddar'],
  ])('%s is %s', (a, b) => {
    expect(matches(a, b)).toBe(true);
  });

  test.each([
    ['Chicken stock', 'Chicken thighs'],
    ['Olive oil', 'Olives'],
    ['Tomato paste', 'Tomatoes'],
    ['Red pepper', 'Black pepper'],
    ['Ice cream', 'Cream'],
    ['Milk', 'Coconut milk'],
    ['Potatoes', 'Sweet potatoes'],
    ['Bread', 'Breadcrumbs'],
    ['Garlic', 'Garlic bread'],
    ['', 'Eggs'],
  ])('%s is not %s', (a, b) => {
    expect(matches(a, b)).toBe(false);
  });
});

describe('haveIngredient', () => {
  test('tracked: have it while some is left', () => {
    expect(haveIngredient({ name: 'Eggs', have: false }, [item('Eggs')])).toBe(true);
    expect(haveIngredient({ name: 'Eggs', have: true }, [item('Eggs', { qty: 0 })])).toBe(false);
  });

  test('untracked: keeps what was saved', () => {
    expect(haveIngredient({ name: 'Cumin', have: true }, [])).toBe(true);
    expect(haveIngredient({ name: 'Feta', have: false }, [])).toBe(false);
  });
});

describe('the sample kitchen', () => {
  test('Shakshuka is missing tomatoes and feta', () => {
    const r = checkRecipe(SHAKSHUKA, SEED_ITEMS);
    expect(r.missing).toEqual(['Tomatoes', 'Feta']);
    expect([r.have, r.need]).toEqual([6, 8]);
    expect(missingFor(SHAKSHUKA, SEED_ITEMS)).toEqual(['Tomatoes', 'Feta']);
  });

  test('the list matches the design', () => {
    const byId = Object.fromEntries(checkRecipes(SEED_RECIPES, SEED_ITEMS).map((r) => [r.id, r]));
    expect(byId.pasta.missing).toEqual([]);
    expect([byId.pasta.have, byId.pasta.need]).toEqual([8, 8]);
    expect([byId.curry.have, byId.curry.need]).toEqual([9, 9]);
    expect(byId.oats.missing).toEqual(['Frozen berries']);
    expect([byId.oats.have, byId.oats.need]).toEqual([4, 5]);
    expect(byId.pesto.missing).toEqual(['Pine nuts', 'Parmesan', 'Garlic']);
    expect([byId.pesto.have, byId.pesto.need]).toEqual([4, 7]);
  });

  test('tonight is the pasta, for the spinach and chicken', () => {
    const recipes = checkRecipes(SEED_RECIPES, SEED_ITEMS);
    const tonight = recipes.filter((r) => r.tonight);
    expect(tonight.map((r) => r.id)).toEqual(['pasta']);
    expect(tonight[0].tonight).toBe('Uses the spinach and chicken thighs that need using soon.');
  });

  test('buying tomatoes and feta makes Shakshuka', () => {
    const items = [...SEED_ITEMS, item('Tomatoes'), item('Feta')];
    const r = checkRecipe(SHAKSHUKA, items);
    expect(r.missing).toEqual([]);
    expect([r.have, r.need]).toEqual([8, 8]);
  });

  test('using up the spinach puts it on Missing', () => {
    const items = SEED_ITEMS.map((i) => (i.name === 'Spinach' ? { ...i, qty: 0 } : i));
    const pasta = checkRecipe(SEED_RECIPES[0], items);
    expect(pasta.missing).toEqual(['Spinach']);
    expect(pasta.have).toBe(7);
  });

  test('I made this takes one of each, but not staples', () => {
    const used = usedWhenMade(SEED_RECIPES[0], SEED_ITEMS, STAPLES).map((i) => i.name);
    expect(used).toEqual(['Spinach', 'Chicken thighs', 'Spaghetti', 'Cheddar', 'Milk 2%', 'Basil']);
  });
});

describe('pickTonight', () => {
  const soon = (name: string) => item(name, { daysLeft: 1 });

  test('most use-soon food wins', () => {
    const items = [soon('Spinach'), soon('Chicken'), item('Rice')];
    const a = checkRecipe(recipe('a', { ingredients: [{ name: 'Spinach', place: 'fridge', have: true }] }), items);
    const b = checkRecipe(
      recipe('b', {
        ingredients: [
          { name: 'Spinach', place: 'fridge', have: true },
          { name: 'Chicken', place: 'fridge', have: true },
        ],
      }),
      items,
    );
    expect(pickTonight([a, b], items)?.id).toBe('b');
  });

  test('ties go to the one missing least', () => {
    const items = [soon('Spinach')];
    const spinach = { name: 'Spinach', place: 'fridge' as const, have: true };
    const a = checkRecipe(recipe('a', { ingredients: [spinach], missing: ['Feta', 'Lemon'] }), items);
    const b = checkRecipe(recipe('b', { ingredients: [spinach], missing: ['Feta'] }), items);
    expect(pickTonight([a, b], items)?.id).toBe('b');
  });

  test('no pick when nothing uses use-soon food', () => {
    const items = [item('Rice')];
    const a = checkRecipe(recipe('a', { ingredients: [{ name: 'Rice', place: 'pantry', have: true }] }), items);
    expect(pickTonight([a], items)).toBeNull();
  });

  test('used-up food is not picked for', () => {
    const items = [item('Spinach', { daysLeft: 1, qty: 0 })];
    const a = checkRecipe(recipe('a', { ingredients: [{ name: 'Spinach', place: 'fridge', have: true }] }), items);
    expect(pickTonight([a], items)).toBeNull();
  });
});
