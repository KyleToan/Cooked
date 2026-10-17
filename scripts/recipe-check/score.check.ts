// Scores link import (readLink, as the app runs it) against the pages fetch.swift saved. Not part of
// `npm test`, since it needs the cache. Run until nothing is left to fetch or browse:
//   swift scripts/recipe-check/fetch.swift
//   npx jest --rootDir . --testRegex 'scripts/recipe-check/score\.check\.ts$'
//   swift scripts/recipe-check/webview-probe.swift   (when it says there are links to browse)
// URLS=urls-holdout.txt scores another list. Links readLink asks for that aren't cached yet go to misses.txt; run fetch.swift again to get them.
// Links readLink hands to the hidden browser go to browse.txt; webview-probe.swift loads them.
// Writes report.txt with every recipe read, for checking the names by eye.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { readLink } from '../../src/data/recipeImport';

const dir = __dirname;
const cache = path.join(dir, 'cache');
const misses = new Set<string>();
const browsed = new Set<string>();

/** A name that still carries an amount, unit, note or markup instead of just the food. */
const BAD_NAME = /^(?:or|and|with|of|the|a)$|^\d|^(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|g|kg|ml|grams?|lbs?|pounds?|of|x|recipe)\b|[()[\]{}<>|+]|https?:|\/\d|\b(?:divided|to taste|optional|for the)\b|\b(?:chopped|minced|diced|sliced|peeled|trimmed|rinsed|drained|separated|husked)$/i;
/** Lines every kitchen has, which import leaves out on purpose. */
const ALWAYS = /^[^a-z]*(?:\S+\s+){0,4}?(?:salt|pepper|water|ice)\b[^,]{0,25}(?:,|$)/i;

/** How many ingredient lines (other than salt, pepper and water) the page's own JSON-LD lists. */
function ldCount(html: string): number {
  const m = html.match(/"recipeIngredient"\s*:\s*\[([\s\S]*?)\]/);
  const lines = m ? (m[1].match(/"(?:[^"\\]|\\.)*"/g) ?? []) : [];
  // The same food listed twice (butter for the base and the topping) is one thing to buy.
  const food = (l: string) => l.toLowerCase().replace(/\(.*$/, '').replace(/^[^a-z]*(?:\S+\s+)?/, '').trim();
  return new Set(lines.filter((l) => !ALWAYS.test(l.slice(1, -1))).map(food)).size;
}

const key = (url: string) => createHash('sha256').update(url).digest('hex');

function cached(url: string): { meta: { status: number; final: string; error: string }; html: string } | null {
  const base = path.join(cache, key(url));
  if (!fs.existsSync(`${base}.json`)) return null;
  return { meta: JSON.parse(fs.readFileSync(`${base}.json`, 'utf8')), html: fs.readFileSync(`${base}.html`, 'utf8') };
}

beforeAll(() => {
  global.fetch = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const page = cached(url);
    if (!page) {
      misses.add(url);
      throw new TypeError('Network request failed');
    }
    if (page.meta.status === 0) throw new TypeError(page.meta.error || 'Network request failed');
    return {
      ok: page.meta.status >= 200 && page.meta.status < 300,
      status: page.meta.status,
      url: page.meta.final,
      text: async () => page.html,
    } as Response;
  }) as typeof fetch;
});

/** The hidden browser, played by the pages webview-probe.swift saved. */
async function browse(url: string): Promise<string | null> {
  const file = path.join(cache, `${key(url)}.browser.html`);
  if (!fs.existsSync(file)) {
    browsed.add(url);
    return null;
  }
  return fs.readFileSync(file, 'utf8') || null;
}

test('link import score', async () => {
  const links = fs.readFileSync(path.join(dir, process.env.URLS ?? 'urls.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const lines: string[] = [];
  let pass = 0;
  for (const [i, link] of links.entries()) {
    const page = cached(link);
    const { recipe, reached } = await readLink(link, [], undefined, browse);
    const names = recipe ? [...recipe.missing, ...recipe.ingredients.map((g) => g.name)] : [];
    const bad = names.filter((n) => BAD_NAME.test(n) || n.length > 60);
    const expected = page ? ldCount(page.html) : 0;
    const problems = [
      !page && 'not fetched yet',
      page && page.meta.status !== 200 && `status ${page.meta.status} ${page.meta.error}`,
      !reached && 'not reached',
      reached && !recipe && 'no recipe',
      recipe && names.length < 2 && `only ${names.length} ingredients`,
      recipe && expected && names.length < expected * 0.7 && `${names.length} of ${expected} ingredients`,
      recipe && bad.length && `messy names: ${bad.join(' | ')}`,
      recipe && !recipe.steps.length && 'no steps',
      recipe && !recipe.photo && 'no photo',
    ].filter((p): p is string => !!p);
    // A missing photo or a status the fallback got past doesn't stop the recipe working.
    const ok = !!recipe && problems.every((p) => p === 'no photo' || p.startsWith('status'));
    if (ok) pass++;
    lines.push(
      `${ok ? 'PASS' : 'FAIL'} ${i} ${link}`,
      ...(problems.length ? [`  ! ${problems.join('; ')}`] : []),
      ...(recipe
        ? [
            `  ${recipe.title} · ${recipe.time || '-'} · ${recipe.servings || '-'} · ${recipe.steps.length} steps`,
            `  ${names.map((n) => (recipe.missingAmounts?.[n] ? `${recipe.missingAmounts[n]} ${n}` : n)).join(' | ')}`,
          ]
        : []),
    );
  }
  const summary = `${pass}/${links.length} pass`;
  fs.writeFileSync(path.join(dir, process.env.URLS ? `report-${process.env.URLS}` : 'report.txt'), [summary, ...lines].join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'browse.txt'), [...browsed].join('\n') + (browsed.size ? '\n' : ''));
  fs.writeFileSync(path.join(dir, 'misses.txt'), [...misses].join('\n') + (misses.size ? '\n' : ''));
  console.log(summary, misses.size ? `(${misses.size} links to fetch)` : '', browsed.size ? `(${browsed.size} to browse)` : '');
});
