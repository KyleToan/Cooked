// Sample data, copied from the prototypes in design/screens/prototypes and
// context.md. It stands in for a backend.

import type { Item, Kitchen, NotificationSettings, Person, Recipe, ScanLine, ToBuyItem } from './types';

export const ALEX: Person = {
  id: 'alex',
  name: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@gmail.com',
  note: 'Made this kitchen',
};

export const SAM: Person = { id: 'sam', name: 'Sam', note: 'Joined Oct 3' };

export const SEED_KITCHEN: Kitchen = {
  name: 'Rivera kitchen',
  people: [ALEX, SAM],
  inviteCode: 'rivera-kitchen',
  newLink: false,
  syncedAgo: '2h ago',
};

/** The code "Make a new link" switches to (AppHousehold). */
export const NEW_INVITE_CODE = 'rivera-k7m2';

// AppKitchen: [name, meta, qty, unit, daysLeft]
export const SEED_ITEMS: Item[] = [
  { id: 'f1', place: 'fridge', name: 'Spinach', meta: 'Best by tomorrow', qty: 1, unit: 'bag', daysLeft: 1, addedBy: 'alex' },
  { id: 'f2', place: 'fridge', name: 'Chicken thighs', meta: 'Best in 2 days', qty: 1, unit: 'pack', daysLeft: 2, addedBy: 'alex' },
  { id: 'f3', place: 'fridge', name: 'Milk 2%', meta: 'Best in 3 days', qty: 1, unit: 'carton', daysLeft: 3, addedBy: 'alex' },
  { id: 'f4', place: 'fridge', name: 'Eggs', meta: 'Best in 9 days', qty: 8, unit: 'eggs', daysLeft: 9, addedBy: 'alex' },
  { id: 'f5', place: 'fridge', name: 'Greek yogurt', meta: 'Sam used the last one · 9:40 am', qty: 0, unit: 'tubs', daysLeft: 5, addedBy: 'sam' },
  { id: 'f6', place: 'fridge', name: 'Cheddar', meta: 'Best in 3 weeks', qty: 1, unit: 'block', daysLeft: 21, addedBy: 'alex' },
  { id: 'f7', place: 'fridge', name: 'Basil', meta: 'Best in 4 days', qty: 1, unit: 'bunch', daysLeft: 4, addedBy: 'alex' },

  { id: 'p1', place: 'pantry', name: 'Rice', meta: 'Bought 3 weeks ago', qty: 1, unit: 'cup', amountText: 'About 1 cup', daysLeft: 0, runningLow: true, addedBy: 'alex' },
  { id: 'p2', place: 'pantry', name: 'Chickpeas', meta: 'Canned', qty: 3, unit: 'cans', daysLeft: 400, addedBy: 'alex' },
  { id: 'p3', place: 'pantry', name: 'Flour', meta: 'Opened in May', qty: 1, unit: 'bag', daysLeft: 120, addedBy: 'alex' },
  { id: 'p4', place: 'pantry', name: 'Olive oil', meta: 'About half left', qty: 1, unit: 'bottle', daysLeft: 200, addedBy: 'alex' },
  { id: 'p5', place: 'pantry', name: 'Spaghetti', meta: 'From today’s receipt', qty: 2, unit: 'boxes', daysLeft: 300, addedBy: 'alex' },
  { id: 'p6', place: 'pantry', name: 'Bread', meta: 'Best in 3 days', qty: 1, unit: 'loaf', daysLeft: 3, addedBy: 'sam' },

  { id: 'z1', place: 'freezer', name: 'Chili leftovers', meta: 'Frozen 3 months ago', qty: 2, unit: 'tubs', daysLeft: 7, useSoon: true, addedBy: 'alex' },
  { id: 'z2', place: 'freezer', name: 'Frozen peas', meta: 'From today’s receipt', qty: 1, unit: 'bag', daysLeft: 180, addedBy: 'alex' },
  { id: 'z3', place: 'freezer', name: 'Ice cream', meta: 'Opened', qty: 1, unit: 'tub', daysLeft: 60, addedBy: 'sam' },
  { id: 'z4', place: 'freezer', name: 'Salmon fillets', meta: 'Frozen a month ago', qty: 4, unit: 'fillets', daysLeft: 60, addedBy: 'alex' },
];

// AppKitchen SHOP, in the order Home shows what's still to get.
export const SEED_TO_BUY: ToBuyItem[] = [
  { id: 't', name: 'Tomatoes', note: 'For Shakshuka', place: 'fridge', done: false, addedBy: 'alex' },
  { id: 'f', name: 'Feta', note: 'For Shakshuka', place: 'fridge', done: false, addedBy: 'alex' },
  { id: 'y', name: 'Frozen berries', note: 'Added by Sam', place: 'freezer', done: false, addedBy: 'sam' },
  { id: 'r', name: 'Rice', note: 'Running low', place: 'pantry', done: false, addedBy: 'alex' },
  { id: 'b', name: 'Bread', note: 'Added by Sam', place: 'pantry', done: true, addedBy: 'sam' },
  { id: 'o', name: 'Olive oil', note: 'Running low', place: 'pantry', done: true, addedBy: 'alex' },
];

// AppRecipe (shakshuka, pasta) and AppRecipes (the rest).
export const SHAKSHUKA: Recipe = {
  id: 'shakshuka',
  title: 'Shakshuka',
  time: '25 min',
  servings: '2 servings',
  sourceLine: 'Imported from somekitchenblog.com',
  sourceLink: 'Open the original on somekitchenblog.com',
  imported: true,
  url: 'https://somekitchenblog.com/shakshuka',
  need: 8,
  have: 6,
  missing: ['Tomatoes', 'Feta'],
  missingAmounts: { Tomatoes: '400 g', Feta: '50 g' },
  ingredients: [
    { name: 'Eggs', place: 'fridge', have: true, amount: '4' },
    { name: 'Onion', place: 'pantry', have: true, amount: '1' },
    { name: 'Red pepper', place: 'fridge', have: true, amount: '1' },
    { name: 'Garlic', place: 'pantry', have: true, amount: '2 cloves' },
    { name: 'Cumin', place: 'pantry', have: true, amount: '1 tsp' },
    { name: 'Olive oil', place: 'pantry', have: true, amount: '2 tbsp' },
  ],
  steps: [
    'Soften the onion and pepper in olive oil, about 8 minutes.',
    'Add garlic and cumin, then the tomatoes. Simmer 10 minutes until thick.',
    'Make 4 wells and crack in the eggs. Cover and cook 5 to 7 minutes.',
    'Crumble feta on top and serve with bread.',
  ],
  onToBuy: false,
};

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'pasta',
    title: 'Spinach & chicken pasta',
    time: '30 min',
    servings: '2 servings',
    savedBy: 'saved by Sam',
    sourceLine: 'Saved by Sam',
    sourceLink: 'Saved by Sam from a cookbook',
    imported: false,
    need: 8,
    have: 8,
    missing: [],
    ingredients: [
      { name: 'Spinach', place: 'fridge', have: true, amount: '2 handfuls' },
      { name: 'Chicken thighs', place: 'fridge', have: true, amount: '2' },
      { name: 'Spaghetti', place: 'pantry', have: true, amount: '200 g' },
      { name: 'Garlic', place: 'pantry', have: true, amount: '2 cloves' },
      { name: 'Cheddar', place: 'fridge', have: true, amount: '60 g' },
      { name: 'Milk 2%', place: 'fridge', have: true, amount: '150 ml' },
      { name: 'Olive oil', place: 'pantry', have: true, amount: '1 tbsp' },
      { name: 'Basil', place: 'fridge', have: true, amount: 'A few leaves' },
    ],
    steps: [
      'Boil the spaghetti in salted water.',
      'Brown the chicken in olive oil, 6 to 7 minutes a side, then slice.',
      'Soften the garlic, add milk and cheddar, and stir until smooth.',
      'Stir in spinach until it wilts, then the pasta, chicken and basil.',
    ],
    onToBuy: false,
  },
  SHAKSHUKA,
  {
    id: 'curry',
    title: 'Chickpea curry',
    time: '35 min',
    sourceLine: 'Saved by Sam',
    sourceLink: 'Saved by Sam',
    imported: false,
    need: 9,
    have: 9,
    missing: [],
    ingredients: [],
    steps: [],
    onToBuy: false,
  },
  {
    id: 'oats',
    title: 'Berry overnight oats',
    time: '10 min',
    sourceLine: 'Scanned from a cookbook',
    sourceLink: 'Scanned from a cookbook',
    imported: false,
    need: 5,
    have: 4,
    missing: ['Frozen berries'],
    missingAmounts: { 'Frozen berries': '1 cup' },
    ingredients: [],
    steps: [],
    onToBuy: false,
  },
  {
    id: 'pesto',
    title: 'Pesto pasta',
    time: '20 min',
    sourceLine: 'Imported from a link',
    sourceLink: 'Imported from a link',
    imported: true,
    need: 7,
    have: 4,
    missing: ['Pine nuts', 'Parmesan', 'Garlic'],
    missingAmounts: { 'Pine nuts': '30 g', Parmesan: '40 g', Garlic: '1 clove' },
    ingredients: [],
    steps: [],
    onToBuy: false,
  },
];

/** Oil and spices stay in the pantry when you make something. */
export const STAPLES = ['Olive oil', 'Cumin'];

export const SEED_NOTIFICATIONS: NotificationSettings = {
  toBuy: true,
  useSoon: true,
  joins: true,
  weekly: false,
  useSoonTime: '5:00 pm',
};

// AppScanReview: what real OCR will return one day. Corner Market, 7 lines.
export const SAMPLE_SCAN: ScanLine[] = [
  { id: 'm', name: 'Milk 2%', price: '$3.49', place: 'fridge', qty: 1 },
  { id: 'e', name: 'Eggs', price: '$4.29', place: 'fridge', qty: 12 },
  { id: 'b', name: 'Basil', price: '$2.99', place: 'fridge', qty: 1 },
  { id: 's', name: 'Spaghetti', price: '$1.89', place: 'pantry', qty: 1 },
  { id: 'r', name: 'Bread', price: '$3.79', place: 'pantry', qty: 1 },
  { id: 'p', name: 'Frozen peas', price: '$2.49', place: 'freezer', qty: 1 },
  { id: 't', name: 'Paper towels', price: 'Not food · $5.99', place: 'skip', qty: 1 },
];
