// Recipe import: reads a recipe from a page's schema.org data or from pasted text,
// and checks its ingredients against the kitchen. Link import fetches the page on the device for now.

import { inStock, makeId } from './helpers';
import { itemsFor } from './match';
import type { Ingredient, Item, Recipe } from './types';

/** How long a link import waits for the page before giving up. */
const FETCH_TIMEOUT_MS = 15000;

/** Things every kitchen is assumed to have; left off the ingredient list. */
const ALWAYS_HAVE = ['water', 'ice', 'salt', 'pepper', 'black pepper', 'salt and pepper', 'kosher salt', 'sea salt', 'sel', 'poivre', 'sal', 'pimienta', 'pimienta negra', 'salz', 'pfeffer'];
/**
 * "Flaky sea salt and freshly ground black pepper", "Cooking salt / kosher salt", "Diamond Crystal kosher salt",
 * "Freshly cracked pepper", "Hot water" and the like, which are still just salt, pepper and water.
 */
const SEASONING = new RegExp(
  [
    String.raw`(?:(?:flaky|kosher|sea|fine|table|cooking|coarse|iodized|morton|diamond crystal|maldon|each)\s+)*salt(?:\s*(?:\/|or|and|&)\s*(?:(?:flaky|kosher|sea|fine|table|cooking|coarse|freshly|fresh|cracked|ground|black)\s+)*(?:salt|pepper))?`,
    String.raw`(?:(?:freshly|fresh|cracked|ground|black|coarsely|finely)\s+)+pepper`,
    String.raw`(?:(?:hot|cold|warm|boiling|lukewarm|filtered|tap|iced|ice|room temperature)\s+)?water`,
    String.raw`(?:standard\s+)?ice(?:\s+cubes?)?`,
  ].map((s) => `^${s}$`).join('|'),
  'i',
);

const UNITS = [
  'cups?', 'c', 'tablespoons?', 'tbsps?', 'tbps', 'tbs', 'tbl', 'teaspoons?', 'tsps?', 'ounces?', 'oz', 'pounds?', 'lbs?',
  'grams?', 'g', 'kilograms?', 'kg', 'millilit(?:er|re)s?', 'ml', 'lit(?:er|re)s?', 'l', 'quarts?', 'qt', 'pints?', 'pt',
  'cloves?', 'cans?', 'tins?', 'jars?', 'packages?', 'pkgs?', 'packets?', 'packs?', 'bags?', 'boxes', 'box', 'pinch(?:es)?',
  'dash(?:es)?', 'handfuls?', 'bunch(?:es)?', 'slices?', 'sticks?', 'sprigs?', 'heads?', 'pieces?', 'stalks?', 'knobs?',
  'fillets?', 'drops?', 'sheets?', 'ribs?', 'bulbs?', 'balls?', 'ears?', 'loaf', 'loaves', 'cartons?', 'bottles?',
  'bowls?', 'blocks?', 'tb', 'sleeves?', 'spoonfuls?', 'rashers?', 'strips?', 'inch(?:es)?', 'cm', 'fl\\.? oz', 'recipes?', 'batch(?:es)?',
  // French, German and Spanish pages.
  'cl', 'dl', 'tl', 'el', 'pck', 'prisen?', 'msp', 'cucharadas?(?: soperas?)?', 'cucharaditas?', 'tazas?', 'gramos', 'pizcas?',
].join('|');

/** A size word that can sit between the number and the unit: "4 medium cloves garlic", "1 heaped tsp". */
const SIZE = 'large|medium|small|heaped|heaping|level|scant|rounded|generous|big';

const DESCRIPTORS = [
  'large', 'medium', 'small', 'fresh', 'freshly', 'chopped', 'minced', 'diced', 'sliced', 'crushed', 'ground', 'grated',
  'shredded', 'finely', 'roughly', 'thinly', 'coarsely', 'extra[- ]virgin', 'boneless', 'skinless', 'whole', 'ripe',
  'peeled', 'softened', 'melted', 'cold', 'warm', 'room[- ]temperature', 'packed', 'heaped', 'heaping', 'level',
  'about', 'approximately', 'plus', 'more', 'good', 'quality', 'organic', 'raw', 'cooked', 'dried', 'canned',
  'coarse', 'homemade', 'store[- ]bought', 'low[- ]sodium', 'well[- ]\\w+', '\\w+ly-\\w+', '(?:small|medium|large)[- ]sized',
  'shaved', 'petite', 'lean', '(?:thick|thin|center|centre)[- ](?:sliced|cut)', 'gestr\\.?', 'additional', 'extra', 'lightly', 'beaten',
].join('|');

const AMOUNT = String.raw`(?:\d+(?:[.,]\d+)?%?(?:\s*\/\s*\d+)?|\.\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`;
/** One amount or a range: "2", "1 1/2", "2 and 1/4", "2-3", "1 to 1 1/2". */
const NUMBER = String.raw`(?:${AMOUNT}\s*(?:(?:and|&)\s*(?=\d))?)+(?:(?:-|–|to)\s*(?:${AMOUNT}\s*)+)*`;

// ---- Small text helpers ----

const ENTITIES: Record<string, string> = { frasl: '⁄', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';

/** "1³⁄₄" and "3⁄4" → "1 3/4" and "3/4", so they read as amounts rather than part of the name. */
function plainFractions(s: string): string {
  return s
    .replace(/(\d)(?=[⁰¹²³⁴⁵⁶⁷⁸⁹])/g, '$1 ')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, (d) => String(Math.max(SUPERSCRIPT.indexOf(d), SUBSCRIPT.indexOf(d))))
    .replace(/[⁄∕]/g, '/');
}

/** Strips tags and entities and collapses whitespace. */
function clean(s: string): string {
  return plainFractions(decode(decode(s.replace(/<[^>]*>/g, ' '))))
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bullets and checkboxes that pasted lists start with. */
const LEADING_BULLET = /^\s*[-•*–▢□◦☐]\s*/;

const MEASURE = String.raw`(?:${AMOUNT}\s*)+(?:(?:-|–)\s*(?:${AMOUNT}\s*)+)?(?:${UNITS}|in)\.?`;
/** "400g/14oz" and "800g-1kg/1¾-2¼lb": the second measure goes, and a range keeps one unit. */
const DUAL_MEASURE = new RegExp(String.raw`(\d\s*(?:${UNITS})\.?)\s*\/\s*${MEASURE}(?=[\s,]|$)`, 'gi');
const UNIT_RANGE = new RegExp(String.raw`(\d)\s*(?:${UNITS})\s*(-|–)\s*(?=\d)`, 'gi');
/** "1 15 ounce can" and "1 28 - ounce can": the can's size, not how many. */
const CAN_SIZE = new RegExp(String.raw`^(\s*\d+)\s+\d+(?:[.,]\d+)?\s*(?:-\s*)?(?:ounces?|oz|g|grams?|ml)\.?\s+(?=(?:cans?|tins?|jars?|packages?|bags?|box(?:es)?|cartons?|bottles?)\b)`, 'i');

/**
 * Drops "(28 oz)", "15-ounce", "(, finely chopped (Note 1))" and "[optional]", nested or left unclosed,
 * and second measures ("400g/14oz").
 */
function withoutAsides(s: string): string {
  let out = s
    .replace(/\[[^\]]*\]|\{[^}]*\}/g, ' ')
    .replace(new RegExp(String.raw`\b\d+(?:[.,]\d+)?\s*-\s*(?:${UNITS})\b`, 'gi'), ' ')
    .replace(UNIT_RANGE, '$1$2')
    .replace(DUAL_MEASURE, '$1')
    .replace(CAN_SIZE, '$1 ');
  while (/\([^()]*\)/.test(out)) out = out.replace(/\([^()]*\)/g, ' ');
  return out.replace(/\(.*$/, ' ').replace(/\)/g, ' ');
}

/** "2x400g tins" and "2 x 400g tins": how many, and the rest of the line. */
const MULTIPLIER = /^\s*(\d+)\s*x\s*(?=\d)/i;

const PREP = 'chopped|sliced|diced|minced|grated|crushed|peeled|trimmed|deseeded|seeded|halved|quartered|drained|rinsed|husked|beaten|separated|softened|melted|boiled|cubed|julienned|torn|zested|juiced|cored|pitted|washed|picked|shredded|crumbled|cooled|thawed|cooked|toasted|mashed';
const ADVERB = 'finely|roughly|thinly|coarsely|freshly|lightly|well|very';
/** "Onions finely chopped" and "Carrots trimmed and finely chopped": prep written after the food without a comma. */
const TRAILING_PREP = new RegExp(
  String.raw`(\S)\s+(?:(?:${ADVERB})\s+)?(?:${PREP})(?:\s*(?:and|&|,)\s*(?:(?:${ADVERB})\s+)?(?:${PREP}))*(?:\s+(?:into|in|to|for|until|following)\b.*)?$|\s+following\b.*$`,
  'i',
);
const FLAVOURED = /^[\p{L} ]+(?:,\s*[\p{L} ]+)*\s*(?:&|\band\b)\s*[\p{L}]+\s(?:diced|crushed|chopped|whole|stewed|fire[- ]roasted|peeled)\s+(?!(?:or|and)\b)([\p{L} ]+)$/iu;
/** "For the sauce:", "For serving": a heading inside the list, not something to buy. */
const LIST_HEADING = /^(?:for\s+(?:the\s+|a\s+)?[\p{L} ]{1,30}|[\p{L} ]{1,30}:)$/iu;

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "2 large eggs, beaten" → "Eggs". Empty when nothing food-like is left. */
export function ingredientName(line: string): string {
  const cleaned = clean(line).replace(LEADING_BULLET, '');
  if (LIST_HEADING.test(cleaned.replace(/\*/g, '').trim())) return '';
  let s = withoutAsides(cleaned.replace(MULTIPLIER, '')).replace(TRAILING_AMOUNT, '');
  // "Juice of 2 large lemons" is two lemons to buy.
  s = s.replace(/^\s*(?:the\s+)?(?:juice|zest)(?:\s+(?:and|&)\s+(?:juice|zest))?\s+(?:of|from)\s+/i, '');
  const amount = new RegExp(String.raw`^\s*${NUMBER}`, 'i');
  const unit = new RegExp(String.raw`^\s*(?:${UNITS})\.?(?=\s|$|,)\s*(?:(?:of|de)\s+|d['’]\s*)?`, 'i');
  const descriptor = new RegExp(String.raw`^\s*(?:${DESCRIPTORS})(?![\w-]),?\s*`, 'i');
  // "Diamond Crystal or ¾ tsp. Morton kosher salt": the name comes after the second amount.
  const otherAmount = new RegExp(String.raw`^[^,]*?\s(?:or|\/)\s+(?=(?:${AMOUNT}\s*)+(?:${UNITS})\.?\s)`, 'i');
  // The amount and descriptors come off before the comma split, so "boneless, skinless chicken" keeps its chicken.
  for (let i = 0; i < 10; i++) {
    const before = s;
    s = s
      .replace(amount, '')
      .replace(/^\s*(?:a|an|one|two|three|half(?: an?)?|few|couple(?: of)?|some|each|evtl\.?)\s+(?!and\b)/i, '')
      .replace(unit, '')
      .replace(descriptor, '')
      .replace(/^\s*(?:\/|or|and|plus|minus|\+)\s+/i, '')
      .replace(/^\s*,\s*/, '')
      .replace(otherAmount, '');
    if (s === before) break;
  }
  // "Basil, Garlic & Oregano diced tomatoes": a flavoured can, whose food comes after the flavours.
  const flavoured = FLAVOURED.exec(s.trim());
  if (flavoured) s = flavoured[1];
  s = s.split(/,|;| - | – | — | \+ /)[0].replace(/\*/g, '').trim().replace(TRAILING_PREP, '$1');
  s = s.replace(
    /\b(?:to (?:taste|serve|garnish|dust|sprinkle|top|brush|coat|drizzle)|optional|for (?:the |a )?(?:\w+ing|garnish|the pan)|as needed|divided|plus|cut (?:into|in)|such as|preferably|at room temperature)\b.*$/i,
    '',
  );
  s = s.replace(/^\s*of\s+/i, '').replace(/\*/g, '').replace(/[.:]+$/, '').replace(/\s+/g, ' ').trim();
  // A divider line ("——") has nothing to buy.
  return /\p{L}/u.test(s) ? capitalize(s) : '';
}

/** An amount at the end of a line, as some books and scans write it: "Small tomatoes 3/4 oz". */
const TRAILING_AMOUNT = new RegExp(String.raw`\s+(${NUMBER}(?:(?:${UNITS})\.?)?)\s*$`, 'i');

/** Decimals as cooks write them: ".333" → "1/3", "1.5" → "1 1/2". Others stay as written. */
const FRACTIONS: Record<string, string> = { '125': '1/8', '25': '1/4', '33': '1/3', '333': '1/3', '5': '1/2', '66': '2/3', '666': '2/3', '667': '2/3', '75': '3/4' };

const tidyNumber = (n: string) =>
  n
    .replace(/(\d*)\.(\d+)/g, (m, whole: string, part: string) => {
      const f = FRACTIONS[part.replace(/0+$/, '')];
      return !f ? m : whole && whole !== '0' ? `${whole} ${f}` : f;
    })
    .replace(/\s*(?:\band\b|&)\s*/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*([-–])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The amount at the start of a line, as written: "400g tomatoes" → "400g",
 * "1 1/2 cups flour" → "1 1/2 cups", "2 large eggs" → "2". Empty when there's none.
 */
export function ingredientAmount(line: string): string {
  const cleaned = clean(line).replace(LEADING_BULLET, '');
  const times = MULTIPLIER.exec(cleaned);
  if (times) {
    const each = ingredientAmount(cleaned.slice(times[0].length));
    return each ? `${times[1]} x ${each}` : times[1];
  }
  const s = withoutAsides(cleaned);
  const number = NUMBER;
  const unit = String.raw`(?:(?:${SIZE})\s+(?=(?:${UNITS})\.?(?:\s|$|,)))?(?:${UNITS})\.?(?=\s|$|,)`;
  const re = new RegExp(String.raw`^\s*(${number})(${unit})?(?:\s*(plus|minus|\+)\s+(${number})(${unit}))?`, 'i');
  const m = re.exec(s);
  if (!m) {
    const end = TRAILING_AMOUNT.exec(s.trim());
    return end ? ingredientAmount(end[1]) : '';
  }
  const tidyUnit = (u = '') => u.replace(new RegExp(String.raw`^(?:${SIZE})\s+`, 'i'), '').replace(/\.$/, '');
  // "400g" stays tight; "2 cups" keeps its space.
  const amount = !m[2] ? tidyNumber(m[1]) : /\s$/.test(m[1]) ? `${tidyNumber(m[1])} ${tidyUnit(m[2])}` : `${tidyNumber(m[1])}${tidyUnit(m[2])}`;
  // "2 cups minus 2 tablespoons" keeps the whole measure.
  return m[3] ? `${amount} ${m[3].toLowerCase()} ${tidyNumber(m[4])} ${tidyUnit(m[5])}` : amount;
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
    if (!name || ALWAYS_HAVE.includes(name.toLowerCase()) || SEASONING.test(name)) continue;
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
  if (/^\d+$/.test(short)) return `${short} ${short === '1' ? 'serving' : 'servings'}`;
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
  // "One Pot French Onion Pasta Bake." loses the full stop some sites end titles with.
  const title = fields.title.trim().replace(/(?<!\.)\.$/, '');
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
    let withBreaks = v.replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '\n');
    // "1. Preheat the oven. 2. Melt the butter…" in one block: each number starts a step.
    const inline = /(?:^|\s)\d{1,2}\.\s+(?=\p{Lu})/gu;
    if ((withBreaks.match(inline) ?? []).length >= 2) withBreaks = withBreaks.replace(inline, '\n');
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

/** The inner HTML of every match of `re`, whose last group is the inner HTML. */
function inners(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => m[m.length - 1]);
}

const listItems = (html: string) => inners(html, /<li\b[^>]*>([\s\S]*?)<\/li>/gi).map(clean).filter(Boolean);

/**
 * Ingredients and steps from the page's markup, for pages without them in JSON-LD:
 * microdata (Jetpack and older plugins), or the lists under an "Ingredients" heading.
 */
function readMarkup(html: string): { lines: string[]; steps: string[] } {
  const page = html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ');
  const lines = inners(page, /<(\w+)\b[^>]*\bitemprop\s*=\s*["']?(?:recipeIngredient|ingredients)\b[^>]*>([\s\S]*?)<\/\1>/gi)
    .map(clean)
    .filter(Boolean);
  if (lines.length) {
    const steps = inners(page, /<(\w+)\b[^>]*(?:\bitemprop\s*=\s*["']?recipeInstructions\b|\bclass\s*=\s*["'][^"']*\be-instructions\b)[^>]*>([\s\S]*?)<\/\1>/gi);
    return { lines, steps: steps.flatMap((x) => readSteps(x)) };
  }
  const headings = [...page.matchAll(/<(h[1-6]|p|strong|b|span|div|dt|th)\b[^>]*>\s*([^<]{1,40}?)\s*<\/\1>/gi)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    text: clean(m[2]).replace(/:$/, ''),
  }));
  // A section runs until the next heading tag after its first list item.
  const sectionEnd = (from: number) => {
    const firstItem = page.slice(from).search(/<li\b/i);
    const next = firstItem < 0 ? -1 : page.slice(from + firstItem).search(/<h[1-6]\b/i);
    return next < 0 ? page.length : from + firstItem + next;
  };
  const ingredientHeadings = headings.filter((h) => /^ingredients?$/i.test(h.text));
  for (const [i, heading] of ingredientHeadings.entries()) {
    const method = headings.find((h) => h.start > heading.end && STEP_HEADING.test(h.text));
    // A menu's "Ingredients" link above the real heading stops at that heading.
    const end = Math.min(method ? method.start : sectionEnd(heading.end), ingredientHeadings[i + 1]?.start ?? Infinity);
    const found = listItems(page.slice(heading.end, end));
    // A menu under a word "Ingredients" has no amounts; an ingredient list mostly does.
    if (found.length < 2 || found.filter((l) => STARTS_WITH_AMOUNT.test(l)).length < found.length / 2) continue;
    if (!method) return { lines: found, steps: [] };
    const body = page.slice(method.end, sectionEnd(method.end));
    const steps = listItems(body);
    return { lines: found, steps: steps.length ? steps : inners(body, /<p\b[^>]*>([\s\S]*?)<\/p>/gi).map(clean).filter(Boolean) };
  }
  return readAmountRun(page);
}

/** A line that starts with an amount and a unit: "1/2 cup sugar", "1 quart goat milk". */
const STARTS_WITH_MEASURE = new RegExp(String.raw`^\s*${NUMBER}(?:(?:${SIZE})\s+)?(?:${UNITS})\.?(?:\s|$)`, 'i');

/**
 * A recipe set as plain lines with no list or heading (older blog posts): the longest run of short
 * lines that start with an amount, mostly with units, and the sentences after it as steps.
 */
function readAmountRun(page: string): { lines: string[]; steps: string[] } {
  const text = page
    .replace(/\s+/g, ' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/dd|\/dt)\b[^>]*>/gi, '\n')
    .split('\n')
    .map(clean)
    .filter(Boolean);
  let best: string[] = [];
  let bestEnd = 0;
  for (let i = 0; i < text.length; i++) {
    if (!STARTS_WITH_AMOUNT.test(text[i])) continue;
    const run: string[] = [];
    let j = i;
    // One short line without an amount ("salt and pepper, to taste") can sit inside the run.
    while (j < text.length && text[j].length <= 100 && (STARTS_WITH_AMOUNT.test(text[j]) || (text[j].length < 40 && STARTS_WITH_AMOUNT.test(text[j + 1] ?? '')) || (text[j].length < 40 && SEASONING.test(ingredientName(text[j]))))) run.push(text[j++]);
    const measured = run.filter((l) => STARTS_WITH_MEASURE.test(l)).length;
    if (run.length > best.length && measured >= 3 && measured >= run.length / 2) {
      best = run;
      bestEnd = j;
    }
    i = j;
  }
  if (!best.length) return { lines: [], steps: [] };
  const steps: string[] = [];
  for (const line of text.slice(bestEnd, bestEnd + 30)) {
    if (line.length >= 40) steps.push(line.replace(NUMBERED, ''));
    else if (steps.length) break;
  }
  return { lines: best, steps };
}

/** The page's own title: its first heading, or its <title> without the site name. */
function pageTitle(html: string): string {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  if (h1 && clean(h1)) return capitalize(clean(h1));
  return clean(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').split(/\s[|–—-]\s/)[0];
}

/** Reads the recipe on a page: schema.org JSON-LD first, then its markup. Null when the page has none. */
export function parseRecipeFromHtml(html: string, url: string, items: Item[] = []): Recipe | null {
  let node: Json | null = null;
  for (const block of jsonLdBlocks(html)) {
    node = findRecipe(block);
    if (node) break;
  }
  let lines = node ? readStrings(node.recipeIngredient ?? node.ingredients) : [];
  let steps = node ? readSteps(node.recipeInstructions) : [];
  // Some pages have a Recipe in JSON-LD without its ingredients, or no JSON-LD at all.
  if (!lines.length) ({ lines, steps } = readMarkup(html));
  const total = node ? durationMinutes(node.totalTime) || durationMinutes(node.prepTime) + durationMinutes(node.cookTime) : 0;
  const named = node && typeof node.name === 'string' ? clean(node.name) : node && typeof node.headline === 'string' ? clean(node.headline) : '';
  return build({
    title: named || pageTitle(html),
    time: minutesText(total),
    servings: node ? formatYield(node.recipeYield ?? node.yield) : '',
    photo: (node ? readImage(node.image, url) : '') || metaImage(html, url),
    url: url.trim() || undefined,
    lines,
    steps,
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
  const read = readText(text);
  return build({ ...read, title: read.title || 'Pasted recipe', items });
}

function readText(text: string): { title: string; time: string; servings: string; lines: string[]; steps: string[] } {
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
    // "Cook time: 20 min" and "Serves 4" have a number; "Cook pasta to al dente." is a step.
    if (META_LINE.test(bare) && bare.length < 60 && /\d/.test(bare)) {
      if (/serv|makes|yield/i.test(bare)) servings ||= formatYield(bare);
      const mins = /(\d+)\s*(?:min|minutes)/i.exec(bare);
      const hrs = /(\d+)\s*(?:h|hr|hrs|hours?)\b/i.exec(bare);
      if ((mins || hrs) && /total|time|ready/i.test(bare)) time = minutesText((hrs ? Number(hrs[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
      continue;
    }
    const numbered = NUMBERED.test(line);
    const listed = BULLET.test(line) || (STARTS_WITH_AMOUNT.test(line) && !numbered);

    // Without headings, the first numbered line starts the steps, so its wrapped lines stay with it.
    // A numbered sentence after the ingredients ("1. Season the chicken") starts them too.
    if (numbered && (section === null || (section === 'ingredients' && !STARTS_WITH_AMOUNT.test(line.replace(NUMBERED, ''))))) section = 'steps';
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
  return { title, time, servings, lines: ingredients, steps };
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
 * Sent with every page request. Some recipe sites refuse the app's own user agent (Taste of Home answers
 * 403) but serve Safari, which is what the person would see if they opened the link.
 * Keep in step with scripts/recipe-check/fetch.swift.
 */
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** The page's HTML and the address it ended up at, or null when it answered with an error status. */
async function getPage(url: string, signal: AbortSignal): Promise<{ html: string; url: string } | null> {
  const res = await fetch(url, { signal, headers: BROWSER_HEADERS });
  if (!res.ok) return null;
  return { html: await res.text(), url: res.url || url };
}

/** Loads a page in a real browser and resolves with its HTML, or null. See usePageReader. */
export type Browse = (url: string, signal: AbortSignal) => Promise<string | null>;

/** YouTube, TikTok and Instagram: the recipe, when there is one, is in the caption. */
const isPost = (url: string) => /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)$/.test(hostOf(url));

/** A JSON string value from the page's inline data, decoded. */
function jsonString(html: string, key: string): string {
  const m = new RegExp(String.raw`"${key}":"((?:[^"\\]|\\.)*)"`).exec(html);
  if (!m) return '';
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return '';
  }
}

/** Sites a caption links to that never hold the written recipe. */
const NOT_RECIPE_LINK = /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|patreon\.com|amazon\.|amzn\.|spotify\.com|discord\.|threads\.net|linktr\.ee)/i;

/** The page's meta description (Instagram's og:description holds the post's caption). */
function metaDescription(html: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(?:property|name)\s*=\s*["']?(?:og:description|description)["'\s>]/i.test(tag)) continue;
    const content = /content\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    if (content) return decode(decode(content[1] ?? content[2] ?? ''));
  }
  return '';
}

const EMOJI = /[\p{Extended_Pictographic}\u200d\ufe0f]/gu;

/**
 * A caption written on one line, as TikTok and Instagram show them ("Ingredients: - 4 chicken
 * breasts - 1 tsp oregano 1. Season the chicken..."), broken into the lines readText expects.
 */
function captionLines(caption: string): string {
  if (caption.split('\n').filter((l) => l.trim()).length > 4) return caption;
  // "1lb chicken breast 1 egg 1tsp salt 2Tbsp hot sauce": no bullets at all, so each amount starts a line.
  // Not "for 3-4 minutes" or "at 390 degrees", which are steps.
  const runOn = new RegExp(
    String.raw`(?<!\b(?:for|at|about|to|in|after|until|or))\s(?=${NUMBER}(?:(?:${UNITS})\.?)?\s+(?!(?:min|minutes?|hours?|hrs?|seconds?|secs?|degrees?)\b)\p{Ll})`,
    'giu',
  );
  const bare = !/\s[-•–]\s/.test(caption) && (caption.match(runOn) ?? []).length >= 4;
  const listAt = bare ? Math.max(0, caption.search(/\b(?:recipe|ingredients?)\b/i)) : 0;
  const list = caption
    .slice(listAt)
    .replace(runOn, '\n')
    .replace(/(\p{Ll})\s*[-–]\s+(?=\d)/gu, '$1\n')
    .replace(/(?<!\b(?:deep|air|pan|stir))\s(?=(?:deep fry|air fry|fry|bake|cook|mix|add|combine|preheat|heat|stir|serve|whisk|pour)\b)/gi, '\n');
  return (bare ? `${caption.slice(0, listAt)}\n${list}` : caption)
    .replace(/[#@][\p{L}\d_.]+/gu, '')
    .replace(/\s*\b(ingredients?|method|directions?|instructions?|steps?)\s*:\s*/gi, '\n$1\n')
    .replace(/\s+[-•–]\s+/g, '\n- ')
    .replace(/\s+(?=\d{1,2}[.)]\s+\p{Lu})/gu, '\n');
}

/**
 * The recipe in a YouTube, TikTok or Instagram post's caption. When the caption only links to the
 * written recipe, the links worth following, those on a line that mentions a recipe first.
 */
function readPost(html: string, url: string, items: Item[]): { recipe: Recipe | null; links: string[] } {
  const host = hostOf(url);
  const youtube = /youtu/.test(host);
  const caption = youtube
    ? jsonString(html, 'shortDescription')
    : /tiktok/.test(host)
      ? jsonString(html, 'desc') || metaDescription(html)
      : // "1,234 likes, 56 comments - andy_cooks on March 1, 2024: "Marry Me Chicken…"."
        metaDescription(html).replace(/^[^:]*?\bon\s[^:]+:\s*"?/, '').replace(/"\.?\s*$/, '');
  // Links, hashtags and sponsor lines would read as steps; the words before "Ingredients" are the title.
  const lines = captionLines(caption);
  const listStart = youtube ? -1 : lines.search(/^ingredients?$/im);
  const text = (listStart > 0 ? lines.slice(listStart) : lines)
    .split('\n')
    .filter((l) => !/https?:\/\/|^#|\bsponsor|\baffiliate|\bsubscribe\b/i.test(l))
    .join('\n');
  const read = readText(text);
  // TikTok and Instagram have no title of their own: the caption's opening words before the recipe.
  // The opening runs until its first emoji ("30-Min Marry Me Chicken 🔥 Early access…").
  const opening = caption
    .replace(EMOJI, '\n')
    .replace(/\b(?:full\s+)?recipe\s+(?:below|in (?:the )?(?:caption|comments))\b|[⬇↓👇]/gi, '')
    .split(/\n|\bingredients?\b|\(recipe|[!|(]|\.\s/i)[0]
    .replace(/[\s:-]+$/, '')
    .trim();
  const handle = /\/@([\w.]+)/.exec(url)?.[1];
  const title = youtube
    ? jsonString(html, 'title') || pageTitle(html).replace(/\s*-\s*YouTube$/, '')
    : opening.length >= 3
      ? opening.slice(0, 60)
      : handle
        ? `Recipe from @${handle}`
        : read.title;
  const photo = metaImage(html, url) || imageUrl(jsonString(html, 'cover') || jsonString(html, 'originCover'), url);
  const recipe = build({ ...read, title: title || 'Recipe', photo, url, items });
  const links = caption.split('\n').flatMap((line) =>
    [...line.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => ({ link: m[0], recipe: /recipe|ingredients/i.test(line) || /recipe/i.test(m[0]) })),
  );
  const ordered = [...links.filter((l) => l.recipe), ...links.filter((l) => !l.recipe)].map((l) => l.link).filter((l) => !NOT_RECIPE_LINK.test(l));
  return { recipe, links: [...new Set(ordered)] };
}

/** The recipe in any page's HTML: a post's caption, or a recipe page. */
function readPage(html: string, url: string, items: Item[]): Recipe | null {
  return isPost(url) ? readPost(html, url, items).recipe : parseRecipeFromHtml(html, url, items);
}

/**
 * The recipe on a page, and whether the page could be reached at all, so Import can tell
 * "no connection" apart from "no recipe on that page" (Decision #89). A page that answered
 * with an error status was reached. A YouTube, TikTok or Instagram link reads the caption, or
 * the written recipe it links to. When the page refuses the request, never answers, or has no
 * recipe in its HTML (a bot check, or a recipe built with JavaScript), `browse` gets a turn.
 */
export async function readLink(
  link: string,
  items: Item[] = [],
  signal?: AbortSignal,
  browse?: Browse,
): Promise<{ recipe: Recipe | null; reached: boolean }> {
  const { gone, ...first } = await fetchRecipe(link, items, signal);
  const url = normalizeUrl(link);
  if (first.recipe || !browse || gone || signal?.aborted || !hostOf(url)) return first;
  const html = await browse(url, signal ?? new AbortController().signal);
  const recipe = html ? readPage(html, url, items) : null;
  return { recipe, reached: first.reached || !!html };
}

/** readLink's first try: a plain request, as fast as a page can be read. */
async function fetchRecipe(
  link: string,
  items: Item[],
  signal?: AbortSignal,
): Promise<{ recipe: Recipe | null; reached: boolean; gone?: boolean }> {
  const url = normalizeUrl(link);
  if (!hostOf(url)) return { recipe: null, reached: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: BROWSER_HEADERS });
    // A page that isn't there won't be in a browser either.
    if (res.status === 404 || res.status === 410) return { recipe: null, reached: true, gone: true };
    const page = res.ok ? { html: await res.text(), url: res.url || url } : null;
    if (!page) return { recipe: null, reached: true };
    if (!isPost(url)) return { recipe: parseRecipeFromHtml(page.html, url, items), reached: true };
    const post = readPost(page.html, url, items);
    if (post.recipe) return { recipe: post.recipe, reached: true };
    for (const next of post.links.slice(0, 2)) {
      const linked = await getPage(next, controller.signal).catch(() => null);
      const recipe = linked && parseRecipeFromHtml(linked.html, linked.url, items);
      if (recipe) return { recipe, reached: true };
    }
    return { recipe: null, reached: true };
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
