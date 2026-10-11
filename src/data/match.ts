// Ingredient matching: whether the kitchen has what a recipe needs, worked out
// from the items rather than stored on the recipe.

import { isUseSoon, joinAnd } from './helpers';
import type { Ingredient, Item, Recipe } from './types';

/** Amounts and sizes that come before or after a name ("2 cups", "1 large"). */
const UNITS = new Set([
  'cup', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'g', 'gram', 'kg', 'ml', 'l', 'litre', 'liter', 'oz', 'ounce',
  'lb', 'pound', 'can', 'tin', 'jar', 'clove', 'pinch', 'handful', 'bunch', 'bag', 'pack', 'packet', 'carton',
  'block', 'box', 'bottle', 'tub', 'slice', 'piece', 'stick', 'sprig', 'dash', 'large', 'medium', 'small', 'x',
]);

/** Words that say how it's prepared or bought, not what it is. */
const DESCRIPTORS = new Set([
  'fresh', 'frozen', 'chopped', 'diced', 'minced', 'sliced', 'grated', 'crumbled', 'shredded', 'ground', 'crushed',
  'dried', 'canned', 'cooked', 'raw', 'whole', 'finely', 'roughly', 'thinly', 'peeled', 'boneless', 'skinless',
  'ripe', 'organic', 'optional', 'of', 'a', 'an', 'the', 'and', 'or', 'to', 'taste', 'about', 'some', 'leftover',
  'leftovers',
]);

/** Cuts and forms that can be left off: "chicken thighs" is still chicken, "basil leaves" still basil. */
const PARTS = new Set(['thigh', 'breast', 'fillet', 'leg', 'wing', 'leaf', 'cheese']);

/**
 * First words that make a different food: "ice cream" isn't cream, "sweet
 * potato" isn't a potato, "coconut milk" isn't milk.
 */
const COMPOUNDS = new Set([
  'ice', 'sour', 'coconut', 'peanut', 'almond', 'soy', 'oat', 'sweet', 'spring', 'green', 'baking', 'condensed',
  'evaporated',
]);

const KEEP_S = /(ss|us|is|ous)$/;

const IRREGULAR: Record<string, string> = { leaves: 'leaf', loaves: 'loaf', halves: 'half', knives: 'knife' };

/** "tomatoes" → "tomato", "berries" → "berry", "leaves" → "leaf", "eggs" → "egg". */
export function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.length <= 3 || KEEP_S.test(word)) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** The words that name the food: "2 cups fresh spinach, chopped" → ["spinach"]. */
export function normalize(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0]
    .replace(/[^a-z0-9%½¼¾/.\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    // Amounts: "2", "1/2", "½", "200g", "2%".
    .filter((w) => !/^[\d½¼¾/.]+(%|[a-z]{0,4})$/.test(w))
    .map(singular)
    .filter((w) => !UNITS.has(w) && !DESCRIPTORS.has(w));
  return words;
}

function core(words: string[]): string[] {
  const kept = words.filter((w) => !PARTS.has(w));
  return kept.length ? kept : words;
}

/**
 * Whether an ingredient and a kitchen item are the same food. The fewer words
 * must all be in the longer name and both must end on the same food word, so
 * "chicken stock" isn't "chicken thighs" and "olive oil" isn't "olives".
 */
export function matches(ingredientName: string, itemName: string): boolean {
  const a = core(normalize(ingredientName));
  const b = core(normalize(itemName));
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const extra = long.filter((w) => !short.includes(w));
  return (
    short[short.length - 1] === long[long.length - 1] &&
    short.every((w) => long.includes(w)) &&
    !extra.some((w) => COMPOUNDS.has(w))
  );
}

/** The kitchen items that are this ingredient. */
export function itemsFor(name: string, items: Item[]): Item[] {
  return items.filter((i) => matches(name, i.name));
}

/**
 * Whether you have it: if the kitchen tracks it, whether any is left; if it
 * doesn't, what was saved with the recipe (what the import found, or what you said).
 */
export function haveIngredient(ingredient: Pick<Ingredient, 'name' | 'have'>, items: Item[]): boolean {
  const tracked = itemsFor(ingredient.name, items);
  return tracked.length ? tracked.some((i) => i.qty > 0) : ingredient.have;
}

/** Everything the recipe lists, with the missing names as ingredients you don't have. */
function allIngredients(recipe: Recipe, items: Item[]): Ingredient[] {
  const missing = recipe.missing.map<Ingredient>((name) => ({
    name,
    place: itemsFor(name, items)[0]?.place ?? 'pantry',
    have: false,
    amount: recipe.missingAmounts?.[name],
  }));
  return [...recipe.ingredients, ...missing];
}

/** What you still need, checked against the kitchen. */
export function missingFor(recipe: Recipe, items: Item[]): string[] {
  return allIngredients(recipe, items)
    .filter((g) => !haveIngredient(g, items))
    .map((g) => g.name);
}

/** The recipe with its You have, Missing and counts worked out from the kitchen. */
export function checkRecipe(recipe: Recipe, items: Item[]): Recipe {
  const ingredients: Ingredient[] = [];
  const missing: string[] = [];
  const missingAmounts: Record<string, string> = {};
  for (const g of allIngredients(recipe, items)) {
    if (haveIngredient(g, items)) {
      const place = itemsFor(g.name, items).find((i) => i.qty > 0)?.place ?? g.place;
      ingredients.push({ ...g, place, have: true });
    } else {
      missing.push(g.name);
      if (g.amount) missingAmounts[g.name] = g.amount;
    }
  }
  // List-only recipes count things they don't name, so the total never shrinks.
  const need = Math.max(recipe.need, ingredients.length + missing.length);
  return {
    ...recipe,
    ingredients,
    missing,
    missingAmounts: Object.keys(missingAmounts).length ? missingAmounts : undefined,
    need,
    have: need - missing.length,
  };
}

/** The use-soon items a (checked) recipe would use up. */
export function soonItemsFor(recipe: Recipe, items: Item[]): Item[] {
  const soon = items.filter(isUseSoon);
  return soon.filter((i) => recipe.ingredients.some((g) => g.have && matches(g.name, i.name)));
}

/**
 * Tonight's pick: the recipe that uses the most food that needs using soon,
 * then the one missing the least. None when nothing uses use-soon food.
 */
export function pickTonight(recipes: Recipe[], items: Item[]): { id: string; line: string } | null {
  let best: { recipe: Recipe; soon: Item[] } | null = null;
  for (const recipe of recipes) {
    const soon = soonItemsFor(recipe, items);
    if (!soon.length) continue;
    if (
      !best ||
      soon.length > best.soon.length ||
      (soon.length === best.soon.length && recipe.missing.length < best.recipe.missing.length)
    ) {
      best = { recipe, soon };
    }
  }
  if (!best) return null;
  const names = best.soon.map((i) => i.name.toLowerCase());
  const verb = names.length === 1 ? 'needs' : 'need';
  return { id: best.recipe.id, line: `Uses the ${joinAnd(names)} that ${verb} using soon.` };
}

/** Every recipe checked against the kitchen, with Tonight's pick marked. */
export function checkRecipes(recipes: Recipe[], items: Item[]): Recipe[] {
  const checked = recipes.map((r) => checkRecipe(r, items));
  const pick = pickTonight(checked, items);
  return checked.map((r) => ({ ...r, tonight: r.id === pick?.id ? pick.line : undefined }));
}

/**
 * What "I made this" takes one of: for each ingredient you have, the matching
 * item due soonest. Staples (oil, spices) stay.
 */
export function usedWhenMade(recipe: Recipe, items: Item[], staples: string[]): Item[] {
  const used: Item[] = [];
  for (const g of checkRecipe(recipe, items).ingredients) {
    if (staples.some((s) => matches(s, g.name))) continue;
    const item = itemsFor(g.name, items)
      .filter((i) => i.qty > 0 && !used.includes(i))
      .sort((x, y) => x.daysLeft - y.daysLeft)[0];
    if (item) used.push(item);
  }
  return used;
}
