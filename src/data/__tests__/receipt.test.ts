import { describe, expect, it } from '@jest/globals';

import { parseReceipt, placeFor } from '@/data/receipt';
import { SAMPLE_SCAN } from '@/data/seed';

const CORNER_MARKET = `
CORNER MARKET
1420 Valencia St
San Francisco CA  (415) 555-0134
10/11/26  6:42 PM

MILK 2% 1GAL           3.49 F
EGGS LG 12CT           4.29 F
BASIL                  2.99 F
SPAGHETTI 16OZ         1.89 F
BREAD                  3.79 F
FRZN PEAS              2.49 F
PAPER TOWELS 6PK       5.99 T

SUBTOTAL              24.93
TAX                    0.53
TOTAL                 25.46
VISA ****1234         25.46
CHANGE                 0.00
THANK YOU FOR SHOPPING
`;

describe('parseReceipt', () => {
  it('reads the Corner Market receipt the same way as the sample scan', () => {
    const { store, lines } = parseReceipt(CORNER_MARKET);
    expect(store).toBe('Corner Market');
    expect(lines.map(({ name, price, place, qty }) => ({ name, price, place, qty }))).toEqual(
      SAMPLE_SCAN.map(({ name, price, place, qty }) => ({ name, price, place, qty })),
    );
  });

  it('gives each line its own id', () => {
    const ids = parseReceipt(CORNER_MARKET).lines.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns no lines for text it cannot read', () => {
    expect(parseReceipt('')).toEqual({ store: null, lines: [] });
    expect(parseReceipt('#@!~ ||| ::: \n ~~~ ... ,,,\n 0101 1110').lines).toEqual([]);
    expect(parseReceipt('SUBTOTAL 12.00\nTAX 0.80\nTOTAL 12.80').lines).toEqual([]);
  });

  it('reads short receipt words', () => {
    const { lines } = parseReceipt('ORG BNLS CHKN THGH   8.99\nGRK YGRT    5.49\nSHRD CHDR CHS  3.99');
    expect(lines.map((l) => [l.name, l.place])).toEqual([
      ['Organic boneless chicken thighs', 'fridge'],
      ['Greek yogurt', 'fridge'],
      ['Shredded cheddar cheese', 'fridge'],
    ]);
  });

  it('reads quantities written inline or on the next line', () => {
    const { lines } = parseReceipt(
      ['LIMES 4 @ 0.50   2.00', 'AVOCADO x3   4.50', '2 MILK 2%   6.98', 'BANANAS', '2 @ 0.59   1.18', 'TOMATO SAUCE   1.29', '3 @ 1.29'].join('\n'),
    );
    expect(lines.map((l) => [l.name, l.qty, l.price])).toEqual([
      ['Limes', 4, '$2.00'],
      ['Avocado', 3, '$4.50'],
      ['Milk 2%', 2, '$6.98'],
      ['Bananas', 2, '$1.18'],
      ['Tomato sauce', 3, '$1.29'],
    ]);
  });

  it('drops weights and keeps the line total', () => {
    const { lines } = parseReceipt('APPLES\n0.45 lb @ 3.99/lb   1.80\nGRAPES 2.10 lb   4.18');
    expect(lines.map((l) => [l.name, l.qty, l.price])).toEqual([
      ['Apples', 1, '$1.80'],
      ['Grapes', 1, '$4.18'],
    ]);
  });

  it('skips discounts and merges an item rung up twice', () => {
    const { lines } = parseReceipt('BREAD   3.79\nCOUPON   -1.00\nSALE   -0.50\nBREAD   3.79');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ name: 'Bread', qty: 2, price: '$7.58' });
  });

  it('marks things that are not food as skipped', () => {
    const { lines } = parseReceipt('DISH SOAP  2.99\nAA BATTERIES 4PK  6.49\nBAG FEE  0.10\nBAGELS  3.49');
    expect(lines.map((l) => [l.name, l.place])).toEqual([
      ['Dish soap', 'skip'],
      ['Aa batteries', 'skip'],
      ['Bag fee', 'skip'],
      ['Bagels', 'pantry'],
    ]);
    expect(lines[0].price).toBe('Not food · $2.99');
  });
});

describe('placeFor', () => {
  it.each([
    ['Frozen peas', 'freezer'],
    ['Ice cream', 'freezer'],
    ['Peanut butter', 'pantry'],
    ['Coconut milk', 'pantry'],
    ['Butter', 'fridge'],
    ['Rice', 'pantry'],
    ['Olive oil', 'pantry'],
    ['Paper towels', 'skip'],
  ])('%s goes in %s', (name, place) => {
    expect(placeFor(name)).toBe(place);
  });
});
