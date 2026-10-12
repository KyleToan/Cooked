// Turns the text read off a receipt into the lines Check your scan shows.
// Reading the photo (OCR) isn't chosen yet; this is the step after it, so it
// works with any OCR that returns the receipt as lines of text.

import type { Place, ScanLine } from './types';

export type ParsedReceipt = {
  /** "Corner Market", from the top of the receipt, if there is one. */
  store: string | null;
  /** Empty when nothing on the receipt could be read as an item. */
  lines: ScanLine[];
};

// Lines that aren't things you bought.
const NOT_AN_ITEM =
  /\b(sub\s*-?total|total|tax|vat|balance|change|cash|visa|master\s*card|mastercard|amex|discover|debit|credit|card|tender|tendered|savings|you saved|discount|coupon|thank|receipt|member|loyalty|points|items? sold|approval|approved|auth|ref|terminal|cashier|store #|tel|phone|www|http|survey|return|refund)\b/i;

// Short receipt words, read as plain ones. Keys are upper case.
const ABBREVIATIONS: Record<string, string> = {
  ORG: 'organic',
  BNLS: 'boneless',
  SKNLS: 'skinless',
  CHKN: 'chicken',
  CHK: 'chicken',
  THGH: 'thighs',
  THGHS: 'thighs',
  BRST: 'breast',
  GRND: 'ground',
  BF: 'beef',
  MLK: 'milk',
  WHL: 'whole',
  FRZ: 'frozen',
  FRZN: 'frozen',
  VEG: 'vegetables',
  BRD: 'bread',
  SPAG: 'spaghetti',
  SPGHTI: 'spaghetti',
  TOM: 'tomatoes',
  TOMS: 'tomatoes',
  POT: 'potatoes',
  YOG: 'yogurt',
  YGRT: 'yogurt',
  GRK: 'greek',
  CHED: 'cheddar',
  CHDR: 'cheddar',
  CHS: 'cheese',
  SHRD: 'shredded',
  PNT: 'peanut',
  BTR: 'butter',
  CRM: 'cream',
  OJ: 'orange juice',
  PPR: 'paper',
  TWL: 'towels',
  TWLS: 'towels',
  DTRGNT: 'detergent',
  BTRY: 'batteries',
  BAN: 'bananas',
  STRWB: 'strawberries',
  BLUEB: 'blueberries',
  SPIN: 'spinach',
  BSL: 'basil',
  OLV: 'olive',
  EVOO: 'extra virgin olive oil',
  SLMN: 'salmon',
  FLT: 'fillets',
  FLLT: 'fillets',
  CKD: 'cooked',
};

// Checked in this order: not food, then freezer, then the pantry exceptions,
// then fridge. Anything else goes in the pantry.
const NOT_FOOD = [
  /\bpaper towel/, /\btowels?\b/, /\btissues?\b/, /\btoilet paper/, /\bnapkins?\b/, /\bdetergent/,
  /\bsoap/, /\bdish ?wash/, /\bbleach/, /\bcleaner/, /\bsponges?\b/, /\bbatter(y|ies)\b/,
  /\bbags?\b/, /\bfoil\b/, /\bplastic wrap/, /\bcling/, /\btrash/, /\bgarbage/, /\bshampoo/,
  /\bconditioner/, /\btoothpaste/, /\btoothbrush/, /\brazors?\b/, /\bbulbs?\b/, /\bcandles?\b/,
  /\bdiapers?\b/, /\bwipes\b/, /\blitter\b/, /\bdog food/, /\bcat food/, /\bdeodorant/,
];
const FREEZER = [/\bfrozen\b/, /\bice cream/, /\bice\b/, /\bpopsicles?\b/, /\bsorbet/, /\bgelato/];
const PANTRY_FIRST = [
  /\bpeanut butter/, /\balmond butter/, /\bcoconut milk/, /\bevaporated/, /\bcondensed/,
  /\bpowdered milk/, /\bcream of\b/, /\bcanned\b/,
];
const FRIDGE = [
  /\bmilk/, /\bcheese/, /\bcheddar/, /\bfeta/, /\bmozzarella/, /\bparmesan/, /\byogh?urt/,
  /\bbutter/, /\beggs?\b/, /\bcream/, /\bchicken/, /\bbeef/, /\bpork/, /\bturkey/, /\bsalmon/,
  /\bfish/, /\bshrimp/, /\bbacon/, /\bham\b/, /\bsausages?/, /\btofu/, /\bspinach/, /\blettuce/,
  /\bbasil/, /\bherbs?\b/, /\bcilantro/, /\bparsley/, /\bmint\b/, /\bberr(y|ies)/,
  /\bstrawberr/, /\bblueberr/, /\braspberr/, /\bgrapes?\b/, /\btomato/, /\bpeppers?\b/,
  /\bcarrots?/, /\bcelery/, /\bcucumbers?/, /\bbroccoli/, /\bmushrooms?/, /\bkale/, /\bjuice/,
  /\bhummus/, /\bsalsa/, /\bleftovers?/,
];

/** Where a scanned item probably goes, or 'skip' when it isn't food. */
export function placeFor(name: string): Place | 'skip' {
  const n = name.toLowerCase();
  if (NOT_FOOD.some((r) => r.test(n))) return 'skip';
  if (FREEZER.some((r) => r.test(n))) return 'freezer';
  if (PANTRY_FIRST.some((r) => r.test(n))) return 'pantry';
  if (FRIDGE.some((r) => r.test(n))) return 'fridge';
  return 'pantry';
}

const PRICE_AT_END = /(-?)\$?\s?(\d{1,4}[.,]\d{2})(?:\s*[A-Z*]{1,2})?\s*$/;
const QTY_LINE = /^(\d{1,3})\s*[@xX]\s*\$?\s?\d{1,4}[.,]\d{2}(?:\s*(?:ea|each|\/\s*ea))?\b/i;
const WEIGHT_LINE = /^\d+(?:[.,]\d+)?\s*(?:lbs?|kg|g|oz)\b/i;
const WEIGHT_RATE = /^\d+(?:[.,]\d+)?\s*(?:lbs?|kg|g|oz)\b(?:\s*@\s*\$?\s?\d+[.,]\d{2}\s*\/\s*\w+)?/i;

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function toNumber(s: string): number {
  return Number(s.replace(',', '.'));
}

function hasWords(s: string): boolean {
  return (s.match(/[a-z]/gi) ?? []).length >= 2;
}

/** "CORNER MARKET" → "Corner Market". */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)[a-z]/g, (c) => c.toUpperCase()); // not \b: "Joe's", not "Joe'S"
}

/** The store's name: the first line near the top that isn't an address, date or phone number. */
function findStore(rows: string[]): string | null {
  for (const row of rows.slice(0, 4)) {
    if (PRICE_AT_END.test(row) || NOT_AN_ITEM.test(row) || !hasWords(row)) continue;
    if (/^\d/.test(row) || /\d{3}.?\d{3}.?\d{4}/.test(row) || /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(row)) continue;
    if (/\b(st|ave|rd|blvd|street|avenue|road|suite)\b\.?/i.test(row) && /\d/.test(row)) continue;
    return titleCase(row.replace(/[^\p{L}\p{N}&' -]/gu, ' ').replace(/\s+/g, ' ').trim());
  }
  return null;
}

/** OCR reads 0 as O and 1 as l or I; put them back in a price at the end of a row ("7.4O" → "7.40"). */
function fixPrice(row: string): string {
  return row.replace(/(^|[\s$])([\dOolI]{1,4}[.,][\dOolI]{2})(?=(?:\s*[A-Z*]{1,2})?$)/, (all, lead: string, p: string) =>
    /\d/.test(p) ? lead + p.replace(/[Oo]/g, '0').replace(/[lI]/g, '1') : all,
  );
}

type Pending = { name: string; qty: number; total: number };

/**
 * Pulls the quantity out of an item's text and returns the readable name.
 * Handles "2 @ 1.99", "x2", "2x", a leading "2 ", counts ("12CT", "DOZ"; a "6PK" is one pack),
 * sizes ("16OZ", "1 GAL", "LG") and weights ("0.45 lb @ 3.99/lb").
 */
function readName(raw: string): { name: string; qty: number | null } {
  let s = ` ${raw} `;
  let qty: number | null = null;
  let pack: number | null = null;

  s = s.replace(/\s(\d{1,3})\s*@\s*\$?\s?\d{1,4}[.,]\d{2}(?:\s*\/?\s*(?:ea|each))?(?=\s)/i, (_, n) => {
    qty = Number(n);
    return ' ';
  });
  s = s.replace(/\s[xX]\s?(\d{1,3})(?=\s)|\s(\d{1,3})\s?[xX](?=\s)/, (_, a, b) => {
    qty = Number(a ?? b);
    return ' ';
  });
  s = s.replace(/\s\d+(?:[.,]\d+)?\s?(?:lbs?|kg|oz|g|gal|qt|pt|ml|l|fl\s?oz)\b(?:\s*@\s*\$?\s?\d+[.,]\d{2}\s*\/\s*\w+)?/gi, ' ');
  s = s.replace(/\s\d{1,3}\s?(?:pk|pack)\b/gi, ' ');
  s = s.replace(/\s(\d{1,3})\s?ct\b/gi, (_, n) => {
    pack = Number(n);
    return ' ';
  });
  s = s.replace(/\s(?:doz|dozen|dz)\b/gi, () => {
    pack = 12;
    return ' ';
  });
  s = s.replace(/\s\d{4,}(?=\s)/g, ' ');
  s = s.replace(/^\s+(\d{1,2})\s+(?=[a-z])/i, (_, n) => {
    qty ??= Number(n);
    return ' ';
  });
  s = s.replace(/\s(?:gal|qt|ct|pk|ea|lg|xl|xlg|med|sm|jmbo|jumbo)\b/gi, ' ');

  const words = s
    .replace(/[^\p{L}\p{N}%&' -]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w.toUpperCase()] ?? w.toLowerCase());
  const text = words.join(' ').trim();
  const name = text.charAt(0).toUpperCase() + text.slice(1);
  return { name, qty: qty ?? pack };
}

/**
 * Reads receipt text into Check your scan lines. Never throws: text with no
 * items in it gives an empty list, which means "Couldn't read this receipt".
 */
export function parseReceipt(text: string): ParsedReceipt {
  const rows = (text ?? '')
    .split(/\r?\n/)
    .map((r) => fixPrice(r.replace(/\s+/g, ' ').trim()))
    .filter(Boolean);

  const items: Pending[] = [];
  let waiting: string | null = null; // a name with its price on the next line

  for (const row of rows) {
    if (NOT_AN_ITEM.test(row)) {
      waiting = null;
      continue;
    }
    const price = row.match(PRICE_AT_END);
    const isQty = QTY_LINE.test(row);
    const isWeight = WEIGHT_LINE.test(row);

    if (isQty || isWeight) {
      const head = isQty ? row.match(QTY_LINE)! : row.match(WEIGHT_RATE)!;
      const n = isQty ? Number(head[1]) : 1;
      // Only a second price after "2 @ 1.99" or "0.45 lb @ 3.99/lb" is the line total.
      const rest = row.slice(head[0].length).match(PRICE_AT_END);
      const total = rest && !rest[1] ? toNumber(rest[2]) : null;
      if (waiting && total !== null) {
        const { name } = readName(waiting);
        if (hasWords(name)) items.push({ name, qty: n, total });
      } else if (items.length > 0) {
        const last = items[items.length - 1];
        if (isQty) last.qty = n;
        if (total !== null && waiting === null && last.total === 0) last.total = total;
      }
      waiting = null;
      continue;
    }

    if (!price) {
      waiting = hasWords(row) ? row : null;
      continue;
    }
    let { name, qty } = readName(row.slice(0, price.index));
    // A price on its own line belongs to the name just above it.
    if (!hasWords(name) && waiting) ({ name, qty } = readName(waiting));
    waiting = null;
    if (price[1]) continue; // a discount or refund line
    if (!hasWords(name)) continue;
    items.push({ name, qty: qty ?? 1, total: toNumber(price[2]) });
  }

  // The same thing rung up twice becomes one line.
  const merged: Pending[] = [];
  for (const item of items) {
    const same = merged.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
    if (same) {
      same.qty += item.qty;
      same.total += item.total;
    } else merged.push({ ...item });
  }

  const lines = merged.map((item, i): ScanLine => {
    const place = placeFor(item.name);
    return {
      id: `scan-${i + 1}`,
      name: item.name,
      price: place === 'skip' ? `Not food · ${money(item.total)}` : money(item.total),
      place,
      qty: Math.max(1, item.qty),
    };
  });

  return { store: lines.length > 0 ? findStore(rows) : null, lines };
}
