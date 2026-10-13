// Recipe import: reads a recipe from a page's schema.org data or from pasted text,
// and checks its ingredients against the kitchen. Link import fetches the page on the device for now.

import { inStock, makeId } from './helpers';
import { itemsFor } from './match';
import type { Ingredient, Item, Recipe } from './types';

/** How long a link import waits for the page before giving up. */
const FETCH_TIMEOUT_MS = 15000;

/** Things every kitchen is assumed to have; left off the ingredient list. */
const ALWAYS_HAVE = ['water', 'ice', 'salt', 'pepper', 'black pepper', 'salt and pepper', 'kosher salt', 'sea salt'];

const UNITS = [
  'cups?', 'c', 'tablespoons?', 'tbsps?', 'tbs', 'tbl', 'teaspoons?', 'tsps?', 'ounces?', 'oz', 'pounds?', 'lbs?',
  'grams?', 'g', 'kilograms?', 'kg', 'millilit(?:er|re)s?', 'ml', 'lit(?:er|re)s?', 'l', 'quarts?', 'qt', 'pints?', 'pt',
  'cloves?', 'cans?', 'tins?', 'jars?', 'packages?', 'pkgs?', 'packets?', 'bags?', 'boxes', 'box', 'pinch(?:es)?',
  'dash(?:es)?', 'handfuls?', 'bunch(?:es)?', 'slices?', 'sticks?', 'sprigs?', 'heads?', 'pieces?', 'stalks?', 'knobs?',
  'fillets?', 'drops?', 'sheets?',
].join('|');

const DESCRIPTORS = [
  'large', 'medium', 'small', 'fresh', 'freshly', 'chopped', 'minced', 'diced', 'sliced', 'crushed', 'ground', 'grated',
  'shredded', 'finely', 'roughly', 'thinly', 'coarsely', 'extra[- ]virgin', 'boneless', 'skinless', 'whole', 'ripe',
  'peeled', 'softened', 'melted', 'cold', 'warm', 'room[- ]temperature', 'packed', 'heaped', 'heaping', 'level',
  'about', 'approximately', 'plus', 'more', 'good', 'quality', 'organic', 'raw', 'cooked', 'dried', 'canned',
].join('|');

const AMOUNT = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`;

// ---- Small text helpers ----

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Strips tags and entities and collapses whitespace. */
function clean(s: string): string {
  return decode(decode(s.replace(/<[^>]*>/g, ' '))).replace(/\s+/g, ' ').trim();
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "2 large eggs, beaten" → "Eggs". Empty when nothing food-like is left. */
export function ingredientName(line: string): string {
  let s = clean(line)
    .replace(/^\s*[-•*–]\s*/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ');
  s = s.split(/,|;| - | – | — /)[0];
  s = s.replace(/\b(to taste|optional|for (?:serving|garnish|frying|the pan)|as needed|divided)\b.*$/i, '');
  const amount = new RegExp(String.raw`^\s*(?:${AMOUNT}\s*)+(?:(?:-|–|to)\s*(?:${AMOUNT}\s*)+)?`, 'i');
  const unit = new RegExp(String.raw`^\s*(?:${UNITS})\.?(?=\s|$)\s*(?:of\s+)?`, 'i');
  const descriptor = new RegExp(String.raw`^\s*(?:${DESCRIPTORS})\b,?\s*`, 'i');
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(amount, '').replace(/^\s*(?:a|an|one|two|three|few|couple(?: of)?|some)\s+/i, '').replace(unit, '').replace(descriptor, '');
    if (s === before) break;
  }
  s = s.replace(/^\s*of\s+/i, '').replace(/[.:]+$/, '').replace(/\s+/g, ' ').trim();
  return capitalize(s);
}

/**
 * The amount at the start of a line, as written: "400g tomatoes" → "400g",
 * "1 1/2 cups flour" → "1 1/2 cups", "2 large eggs" → "2". Empty when there's none.
 */
export function ingredientAmount(line: string): string {
  const s = clean(line).replace(/^\s*[-•*–]\s*/, '').replace(/\([^)]*\)/g, ' ');
  const re = new RegExp(
    String.raw`^\s*((?:${AMOUNT}\s*)+(?:(?:-|–|to)\s*(?:${AMOUNT}\s*)+)?)((?:${UNITS})\.?(?=\s|$|,))?`,
    'i',
  );
  const m = re.exec(s);
  if (!m) return '';
  const number = m[1].replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
  const unit = (m[2] ?? '').replace(/\.$/, '');
  if (!unit) return number;
  // "400g" stays tight; "2 cups" keeps its space.
  return /\s$/.test(m[1]) ? `${number} ${unit}` : `${number}${unit}`;
}

/**
 * Splits ingredient names into what the kitchen has (with its place) and what's missing.
 * `amounts` (keyed by name) carries how much of each the recipe uses onto the result.
 */
export function checkAgainstKitchen(
  names: string[],
  items: Item[],
  amounts: Record<string, string> = {},
): { ingredients: Ingredient[]; missing: string[]; missingAmounts: Record<string, string> } {
  const stock = inStock(items);
  const ingredients: Ingredient[] = [];
  const missing: string[] = [];
  const missingAmounts: Record<string, string> = {};
  for (const name of names) {
    const match = itemsFor(name, stock)[0];
    const amount = amounts[name];
    if (match) ingredients.push(amount ? { name, place: match.place, have: true, amount } : { name, place: match.place, have: true });
    else {
      missing.push(name);
      if (amount) missingAmounts[name] = amount;
    }
  }
  return { ingredients, missing, missingAmounts };
}

/** Clean, de-duplicated ingredient names without the things every kitchen has, with their amounts. */
function ingredientNames(lines: string[]): { names: string[]; amounts: Record<string, string> } {
  const names: string[] = [];
  const amounts: Record<string, string> = {};
  for (const line of lines) {
    const name = ingredientName(line);
    if (!name || ALWAYS_HAVE.includes(name.toLowerCase())) continue;
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
    names.push(name);
    const amount = ingredientAmount(line);
    if (amount) amounts[name] = amount;
  }
  return { names, amounts };
}

/** "PT1H10M" → "1 hr 10 min". Empty when it can't be read. */
export function formatDuration(iso: unknown): string {
  if (typeof iso !== 'string') return '';
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i.exec(iso.trim());
  if (!m) return '';
  const mins = Math.round((Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0));
  return minutesText(mins);
}

function minutesText(mins: number): string {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

function durationMinutes(iso: unknown): number {
  const t = formatDuration(iso);
  const h = /(\d+) hr/.exec(t);
  const m = /(\d+) min/.exec(t);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

/** recipeYield in any of its shapes → "4 servings", or a short phrase like "12 cookies". */
export function formatYield(y: unknown): string {
  const values = (Array.isArray(y) ? y : [y]).map((v) => (typeof v === 'number' ? String(v) : typeof v === 'string' ? clean(v) : '')).filter(Boolean);
  if (!values.length) return '';
  const servingsLike = values.find((v) => /^\d+$/.test(v) || /serv|people|portion/i.test(v)) ?? values[0];
  const n = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?/.exec(servingsLike);
  if (n && (/^\d+$/.test(servingsLike) || /serv|people|portion/i.test(servingsLike))) {
    const count = n[2] ? `${n[1]}–${n[2]}` : n[1];
    return `${count} ${count === '1' ? 'serving' : 'servings'}`;
  }
  const short = servingsLike.replace(/^(makes|yields?|serves)\s*:?\s*/i, '');
  return short.length <= 24 ? short : '';
}

function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/([^/?#:]+)/i.exec(url.trim());
  return (m?.[1] ?? '').replace(/^www\./i, '').toLowerCase();
}

function build(fields: {
  title: string;
  time: string;
  servings: string;
  photo?: string;
  url?: string;
  lines: string[];
  steps: string[];
  items: Item[];
}): Recipe | null {
  const { names, amounts } = ingredientNames(fields.lines);
  const title = fields.title.trim();
  if (!names.length || !title) return null;
  const { ingredients, missing, missingAmounts } = checkAgainstKitchen(names, fields.items, amounts);
  const host = fields.url ? hostOf(fields.url) : '';
  return {
    id: makeId('r'),
    title,
    time: fields.time,
    servings: fields.servings || undefined,
    photo: fields.photo || undefined,
    sourceLine: host ? `Imported from ${host}` : 'Imported from pasted text',
    sourceLink: host ? `Open the original on ${host}` : 'Imported from pasted text',
    imported: true,
    url: fields.url,
    need: names.length,
    have: ingredients.length,
    missing,
    missingAmounts: Object.keys(missingAmounts).length ? missingAmounts : undefined,
    ingredients,
    steps: fields.steps,
    onToBuy: false,
  };
}

// ---- Pages: schema.org Recipe in JSON-LD ----

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function isRecipe(node: Json): boolean {
  const t = node['@type'];
  return (Array.isArray(t) ? t : [t]).some((x) => typeof x === 'string' && /(^|:|\/)Recipe$/i.test(x));
}

/** Finds the first Recipe node anywhere in the JSON-LD: arrays, @graph, mainEntity and so on. */
function findRecipe(v: unknown, depth = 0): Json | null {
  if (depth > 8) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findRecipe(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObject(v)) return null;
  if (isRecipe(v)) return v;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const r = findRecipe(v[key], depth + 1);
    if (r) return r;
  }
  return null;
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try {
      out.push(JSON.parse(raw));
    } catch {
      try {
        // Some sites leave raw newlines or trailing commas in their JSON.
        out.push(JSON.parse(raw.replace(/[\r\n\t]+/g, ' ').replace(/,\s*([}\]])/g, '$1')));
      } catch {
        // Not readable; try the next block.
      }
    }
  }
  return out;
}

/** Instructions as a list of steps, from a string, strings, HowToStep or HowToSection. */
function readSteps(v: unknown, depth = 0): string[] {
  if (depth > 6 || v == null) return [];
  if (typeof v === 'string') {
    const withBreaks = v.replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '\n');
    return withBreaks
      .split(/\n+/)
      .map((s) => clean(s).replace(/^(?:step\s*)?\d+[.):]\s*/i, ''))
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap((x) => readSteps(x, depth + 1));
  if (isObject(v)) {
    if (v.itemListElement) return readSteps(v.itemListElement, depth + 1);
    const text = typeof v.text === 'string' ? v.text : typeof v.name === 'string' ? v.name : '';
    return readSteps(text, depth + 1);
  }
  return [];
}

function readStrings(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\n+/).map(clean).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(readStrings);
  if (isObject(v) && typeof v.name === 'string') return [clean(v.name)];
  return [];
}

/** An absolute http(s) image URL, or empty. Relative URLs are resolved against the page. */
function imageUrl(raw: string, page: string): string {
  const s = decode(raw.trim());
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const origin = /^[a-z]+:\/\/[^/?#]+/i.exec(page.trim())?.[0];
  if (origin && s.startsWith('/')) return `${origin}${s}`;
  return '';
}

/** schema.org `image` in any of its shapes: a URL, a list, or an ImageObject. */
function readImage(v: unknown, page: string, depth = 0): string {
  if (depth > 4 || v == null) return '';
  if (typeof v === 'string') return imageUrl(v, page);
  if (Array.isArray(v)) {
    for (const x of v) {
      const url = readImage(x, page, depth + 1);
      if (url) return url;
    }
    return '';
  }
  if (isObject(v)) return readImage(v.url ?? v.contentUrl ?? v['@id'], page, depth + 1);
  return '';
}

/** The page's og:image (or twitter:image), or empty. */
function metaImage(html: string, page: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(?:property|name)\s*=\s*["']?(?:og:image(?::secure_url|:url)?|twitter:image)["'\s>]/i.test(tag)) continue;
    const content = /content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const url = imageUrl(content?.[1] ?? content?.[2] ?? content?.[3] ?? '', page);
    if (url) return url;
  }
  return '';
}

/** Reads the schema.org Recipe on a page. Null when the page has none. */
export function parseRecipeFromHtml(html: string, url: string, items: Item[] = []): Recipe | null {
  let node: Json | null = null;
  for (const block of jsonLdBlocks(html)) {
    node = findRecipe(block);
    if (node) break;
  }
  if (!node) return null;
  const total = durationMinutes(node.totalTime) || durationMinutes(node.prepTime) + durationMinutes(node.cookTime);
  return build({
    title: typeof node.name === 'string' ? clean(node.name) : typeof node.headline === 'string' ? clean(node.headline) : '',
    time: minutesText(total),
    servings: formatYield(node.recipeYield ?? node.yield),
    photo: readImage(node.image, url) || metaImage(html, url),
    url: url.trim() || undefined,
    lines: readStrings(node.recipeIngredient ?? node.ingredients),
    steps: readSteps(node.recipeInstructions),
    items,
  });
}

// ---- Pasted text ----

type Section = 'ingredients' | 'steps' | null;

const INGREDIENT_HEADING = /^(?:ingredients?|you(?:'|’)ll need|what you need|shopping list|for the [a-z ]+)\s*:?$/i;
const STEP_HEADING = /^(?:method|directions?|instructions?|steps?|preparation|how to make(?: it)?|to make)\s*:?$/i;
const BULLET = /^\s*[-•*–▢□◦]\s*/;
const NUMBERED = /^\s*(?:step\s*)?\d+\s*[.):]\s+/i;
const STARTS_WITH_AMOUNT = new RegExp(String.raw`^\s*${AMOUNT}`);
const META_LINE = /^(?:serves|servings?|makes|yield|prep|cook|total|time|ready in)\b/i;
/** A photographed page's number, alone or beside a capitals running header ("112   WEEKNIGHT DINNERS"). */
const PAGE_NUMBER = /^(?:\d{1,3}|\d{1,3}\s{3,}[^a-z\d]+|[^a-z\d]+\s{3,}\d{1,3})$/;
/** Ends like a finished sentence, so the next line is a new step rather than the rest of this one. */
const SENTENCE_END = /[.!?)]$/;

/** Splits pasted text into a title, ingredients and steps. Null when there's no ingredient list. */
export function parseRecipeFromText(text: string, items: Item[] = []): Recipe | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title = '';
  let servings = '';
  let time = '';
  let section: Section = null;
  const ingredients: string[] = [];
  const steps: string[] = [];

  for (const line of lines) {
    if (PAGE_NUMBER.test(line)) continue;
    const bare = line.replace(/[#*_]+/g, '').trim();
    if (INGREDIENT_HEADING.test(bare)) {
      section = 'ingredients';
      continue;
    }
    if (STEP_HEADING.test(bare)) {
      section = 'steps';
      continue;
    }
    if (META_LINE.test(bare) && bare.length < 60) {
      if (/serv|makes|yield/i.test(bare)) servings ||= formatYield(bare);
      const mins = /(\d+)\s*(?:min|minutes)/i.exec(bare);
      const hrs = /(\d+)\s*(?:h|hr|hrs|hours?)\b/i.exec(bare);
      if ((mins || hrs) && /total|time|ready/i.test(bare)) time = minutesText((hrs ? Number(hrs[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
      continue;
    }
    const numbered = NUMBERED.test(line);
    const listed = BULLET.test(line) || (STARTS_WITH_AMOUNT.test(line) && !numbered);

    // Without headings, the first numbered line starts the steps, so its wrapped lines stay with it.
    if (section === null && numbered) section = 'steps';
    if (section === 'steps') {
      const last = steps.length - 1;
      // A photo breaks a step at the page's line ends; carry on the step until it ends a sentence.
      if (!numbered && !BULLET.test(line) && last >= 0 && !SENTENCE_END.test(steps[last])) steps[last] += ` ${line}`;
      else steps.push(line.replace(NUMBERED, '').replace(BULLET, '').trim());
      continue;
    }
    if (section === 'ingredients' || listed) {
      ingredients.push(line);
      continue;
    }
    if (!title && !ingredients.length) {
      title = bare.replace(/[:.]$/, '');
      continue;
    }
    // A sentence after the ingredients is most likely a step.
    if (ingredients.length && bare.length > 30) steps.push(bare);
  }

  // Cookbooks often set titles in capitals; "LEMON CHICKEN" reads as "Lemon chicken".
  if (title === title.toUpperCase()) title = capitalize(title.toLowerCase());
  return build({ title: title || 'Pasted recipe', time, servings, lines: ingredients, steps, items });
}

/** How many ingredients the pasted text has so far, for the hint under the box. */
export function countIngredients(text: string): number {
  return parseRecipeFromText(text)?.need ?? 0;
}

// ---- Links ----

/** Adds https:// when a link was pasted without it. */
export function normalizeUrl(link: string): string {
  const s = link.trim();
  return /^[a-z]+:\/\//i.test(s) ? s : `https://${s}`;
}

/** Fetches the page on the device and reads its recipe. Null when it can't be loaded or has none. */
export async function importFromLink(link: string, items: Item[] = [], signal?: AbortSignal): Promise<Recipe | null> {
  return (await readLink(link, items, signal)).recipe;
}

/**
 * The recipe on a page, and whether the page could be reached at all, so Import can tell
 * "no connection" apart from "no recipe on that page" (Decision #89). A page that answered
 * with an error status was reached.
 */
export async function readLink(
  link: string,
  items: Item[] = [],
  signal?: AbortSignal,
): Promise<{ recipe: Recipe | null; reached: boolean }> {
  const url = normalizeUrl(link);
  if (!hostOf(url)) return { recipe: null, reached: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/html,application/xhtml+xml' } });
    if (!res.ok) return { recipe: null, reached: true };
    return { recipe: parseRecipeFromHtml(await res.text(), url, items), reached: true };
  } catch {
    // No network, a timeout, or (in a browser) a blocked request: the page was never read.
    return { recipe: null, reached: false };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Every ingredient for the found list on Import: what's missing first, then what you have. */
export function foundList(recipe: Recipe): { name: string; have: boolean; amount?: string }[] {
  return [
    ...recipe.missing.map((name) => ({ name, have: false, amount: recipe.missingAmounts?.[name] })),
    ...recipe.ingredients.map((g) => ({ name: g.name, have: true, amount: g.amount })),
  ];
}
