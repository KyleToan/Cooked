import {
  formatDuration,
  formatYield,
  foundList,
  importFromLink,
  ingredientAmount,
  ingredientName,
  normalizeUrl,
  parseRecipeFromHtml,
  parseRecipeFromText,
  readLink,
} from '@/data/recipeImport';
import type { Item } from '@/data/types';

const item = (name: string, place: Item['place'], qty = 1): Item => ({
  id: name,
  name,
  place,
  qty,
  unit: '',
  meta: '',
  daysLeft: 5,
  addedBy: 'alex',
});

const KITCHEN: Item[] = [
  item('Eggs', 'fridge'),
  item('Red pepper', 'fridge'),
  item('Onion', 'pantry'),
  item('Garlic', 'pantry'),
  item('Olive oil', 'pantry'),
  item('Cumin', 'pantry'),
  item('Feta', 'fridge', 0),
];

const page = (json: string) => `<html><head><title>x</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Blog"}</script>
<script type="application/ld+json">${json}</script></head><body></body></html>`;

describe('ingredientAmount', () => {
  test.each([
    ['2 large eggs, beaten', '2'],
    ['400g chopped tomatoes', '400g'],
    ['1 1/2 cups flour', '1 1/2 cups'],
    ['½ tsp salt', '½ tsp'],
    ['2-3 cloves garlic', '2-3 cloves'],
    ['1 (28 oz) can tomatoes', '1 can'],
    ['- 200 ml milk', '200 ml'],
    ['Salt and pepper', ''],
    ['A handful of basil', ''],
    ['³⁄₄ oz small tomatoes', '3/4 oz'],
    ['1³⁄₄ cups flour', '1 3/4 cups'],
    ['1 15-ounce can black beans', '1 can'],
    ['1 lb / 500g beef mince', '1 lb'],
    ['2 cups minus 2 tablespoons cake flour', '2 cups minus 2 tablespoons'],
    ['Small tomatoes 3/4 oz', '3/4 oz'],
    // Lines from the 100-page check (scripts/recipe-check).
    ['2 and 1/4 cups (281g) all-purpose flour', '2 1/4 cups'],
    ['0.333 cup ketchup', '1/3 cup'],
    ['1.5 pounds ground beef', '1 1/2 pounds'],
    ['.5tsp ground turmeric', '1/2tsp'],
    ['4 medium cloves garlic', '4 cloves'],
    ['1 heaped tsp hot chilli powder', '1 tsp'],
    ['2 x 400g tins plum tomatoes', '2 x 400g'],
    ['1 Tbsp + 1 tsp kosher salt', '1 Tbsp + 1 tsp'],
    ['1 & 1/2 -2 tablespoons instant coffee', '1 1/2-2 tablespoons'],
  ])('%s → %s', (line, amount) => expect(ingredientAmount(line)).toBe(amount));
});

describe('ingredientName', () => {
  test.each([
    ['2 large eggs, beaten', 'Eggs'],
    ['1 (28 oz) can crushed tomatoes', 'Tomatoes'],
    ['4 oz feta cheese, crumbled', 'Feta cheese'],
    ['2 cloves garlic, minced', 'Garlic'],
    ['1 tsp ground cumin', 'Cumin'],
    ['½ cup extra-virgin olive oil', 'Olive oil'],
    ['1 1/2 cups flour', 'Flour'],
    ['2-3 tbsp. butter', 'Butter'],
    ['- 1 red pepper, sliced', 'Red pepper'],
    ['Salt to taste', 'Salt'],
    ['A handful of fresh basil', 'Basil'],
    ['&frac12; onion', 'Onion'],
    // Lines from real recipe sites and pasted pages.
    ['³⁄₄ oz small tomatoes', 'Tomatoes'],
    ['3&frasl;4 oz small tomatoes', 'Tomatoes'],
    ['▢ 3/4 oz small tomatoes', 'Tomatoes'],
    ['Small tomatoes 3/4 oz', 'Tomatoes'],
    ['1 lb. boneless, skinless chicken breast ($6.25)', 'Chicken breast'],
    ['1  onion (, finely chopped (brown, yellow or white))', 'Onion'],
    ['1 lb / 500g   beef mince (ground beef) (OR half pork (Note 1))', 'Beef mince'],
    ['800g / 28 oz  can crushed tomato ((or tomato passata))', 'Tomato'],
    ['2 cups minus 2 tablespoons cake flour (8 ½ ounces)', 'Cake flour'],
    ['1¼ tsp. (4 g) Diamond Crystal or ¾ tsp. (4 g) Morton kosher salt', 'Morton kosher salt'],
    ['1 15-ounce can whole peeled tomatoes', 'Tomatoes'],
    ['1 pound 85% or 93% lean ground turkey', 'Turkey'],
    ['4 carrots cut into 2-inch chunks', 'Carrots'],
    ['4 ribs celery, finely chopped', 'Celery'],
    ['lemon wedges to serve (optional)', 'Lemon wedges'],
    ['3 oz. cream cheese*', 'Cream cheese'],
    ['1 cup thinly-sliced or shaved red cabbage', 'Red cabbage'],
    ['Dried or fresh pasta, preferably pappardelle', 'Pasta'],
    ['——', ''],
    // Lines from the 100-page check (scripts/recipe-check).
    ['1kg/2¼lb lean minced beef', 'Beef'],
    ['800g-1kg/1¾-2¼lb dried spaghetti', 'Spaghetti'],
    ['400ml/14fl oz vegetable stock, made with ½ stock cube', 'Vegetable stock'],
    ['2x400g cans chopped tomatoes', 'Tomatoes'],
    ['4 rashers smoked streaky bacon finely chopped', 'Smoked streaky bacon'],
    ['1 red chilli deseeded and finely chopped (optional)', 'Red chilli'],
    ['1  15 ounce can chick peas rinsed and husked**', 'Chick peas'],
    ['400ml brewed hojicha tea following pack instructions', 'Brewed hojicha tea'],
    ['1 large egg + 1 egg yolk, at room temperature', 'Egg'],
    ['4x5 inch dried kelp', 'Kelp'],
    ['Juice of 2 large lemons, (about ½ cup)', 'Lemons'],
    ['⅔ cup half and half', 'Half and half'],
    ['4 Strips thick-sliced center-cut bacon', 'Bacon'],
    ['20 cl de crème fraîche', 'Crème fraîche'],
    ['Mutti chopped tomatoes', 'Mutti chopped tomatoes'],
    ['1  14.5 oz can Basil, Garlic &amp; Oregano diced tomatoes', 'Tomatoes'],
    ['1 can (14 oz) diced tomatoes, drained', 'Tomatoes'],
    ['1 large carrot, finely diced or grated', 'Carrot'],
    ['1 onion, chopped and diced finely', 'Onion'],
    ['2 cloves garlic, minced', 'Garlic'],
    ['1 & 1/2 -2 tablespoons instant coffee', 'Instant coffee'],
    ['2 pounds chicken breasts {boneless skinless chicken thighs}', 'Chicken breasts'],
    ['{McCormick Paprika}', ''],
    ['2 tbps extra virgin olive oil', 'Olive oil'],
    ['For the Sauce:', ''],
    ['For serving', ''],
  ])('%s → %s', (line, name) => expect(ingredientName(line)).toBe(name));
});

describe('formatDuration and formatYield', () => {
  test('durations', () => {
    expect(formatDuration('PT25M')).toBe('25 min');
    expect(formatDuration('PT1H10M')).toBe('1 hr 10 min');
    expect(formatDuration('PT2H')).toBe('2 hr');
    expect(formatDuration('P0DT0H40M')).toBe('40 min');
    expect(formatDuration('nonsense')).toBe('');
    expect(formatDuration(undefined)).toBe('');
  });
  test('yields', () => {
    expect(formatYield(4)).toBe('4 servings');
    expect(formatYield('2')).toBe('2 servings');
    expect(formatYield('1')).toBe('1 serving');
    expect(formatYield(['4', '4 servings'])).toBe('4 servings');
    expect(formatYield('Serves 4-6')).toBe('4–6 servings');
    expect(formatYield('Makes 12 cookies')).toBe('12 cookies');
    expect(formatYield('Makes 16')).toBe('16 servings');
    expect(formatYield(undefined)).toBe('');
  });
});

describe('parseRecipeFromHtml', () => {
  test('reads a Recipe inside @graph with HowToSteps', () => {
    const html = page(
      JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: 'Shakshuka page' },
          {
            '@type': ['Recipe'],
            name: 'Shakshuka &amp; feta',
            image: ['https://somekitchenblog.com/s.jpg'],
            totalTime: 'PT25M',
            recipeYield: ['2', '2 servings'],
            recipeIngredient: [
              'Flaky sea salt and freshly ground black pepper',
              '2 tbsp olive oil',
              '1 onion, diced',
              '1 red pepper, sliced',
              '2 cloves garlic',
              '1 tsp ground cumin',
              '1 (28 oz) can tomatoes',
              '4 large eggs',
              '50 g feta',
              'Salt and pepper',
            ],
            recipeInstructions: [
              { '@type': 'HowToStep', text: 'Soften the onion and pepper in olive oil.' },
              { '@type': 'HowToStep', text: '<p>Add garlic and cumin, then the tomatoes.</p>' },
              { '@type': 'HowToStep', name: 'Crack in the eggs.' },
            ],
          },
        ],
      }),
    );
    const r = parseRecipeFromHtml(html, 'https://www.somekitchenblog.com/shakshuka', KITCHEN)!;
    expect(r).not.toBeNull();
    expect(r.title).toBe('Shakshuka & feta');
    expect(r.time).toBe('25 min');
    expect(r.servings).toBe('2 servings');
    expect(r.photo).toBe('https://somekitchenblog.com/s.jpg');
    expect(r.imported).toBe(true);
    expect(r.sourceLine).toBe('Imported from somekitchenblog.com');
    expect(r.sourceLink).toBe('Open the original on somekitchenblog.com');
    expect(r.url).toBe('https://www.somekitchenblog.com/shakshuka');
    expect(r.need).toBe(8);
    expect(r.have).toBe(6);
    // Feta is in the fridge list but used up, so it's missing.
    expect(r.missing).toEqual(['Tomatoes', 'Feta']);
    expect(r.ingredients.find((g) => g.name === 'Eggs')).toEqual({ name: 'Eggs', place: 'fridge', have: true, amount: '4' });
    expect(r.ingredients.find((g) => g.name === 'Garlic')?.amount).toBe('2 cloves');
    expect(r.missingAmounts).toEqual({ Tomatoes: '1 can', Feta: '50 g' });
    expect(r.steps).toEqual([
      'Soften the onion and pepper in olive oil.',
      'Add garlic and cumin, then the tomatoes.',
      'Crack in the eggs.',
    ]);
    expect(r.onToBuy).toBe(false);
  });

  test('reads HowToSections, a string of instructions and prep plus cook time', () => {
    const html = page(
      JSON.stringify([
        {
          '@type': 'Recipe',
          name: 'Pancakes',
          prepTime: 'PT10M',
          cookTime: 'PT1H',
          recipeYield: 4,
          recipeIngredient: ['200 g flour', '2 eggs', '300 ml milk'],
          recipeInstructions: [
            {
              '@type': 'HowToSection',
              name: 'Batter',
              itemListElement: [{ '@type': 'HowToStep', text: 'Whisk everything.' }],
            },
            { '@type': 'HowToSection', name: 'Cook', itemListElement: [{ '@type': 'HowToStep', text: 'Fry in a hot pan.' }] },
          ],
        },
      ]),
    );
    const r = parseRecipeFromHtml(html, 'https://example.com/pancakes')!;
    expect(r.time).toBe('1 hr 10 min');
    expect(r.servings).toBe('4 servings');
    expect(r.steps).toEqual(['Whisk everything.', 'Fry in a hot pan.']);
    expect(r.missing).toEqual(['Flour', 'Eggs', 'Milk']);

    const plain = page(
      JSON.stringify({ '@type': 'Recipe', name: 'Toast', recipeIngredient: ['1 slice bread'], recipeInstructions: '1. Toast it.\n2. Butter it.' }),
    );
    expect(parseRecipeFromHtml(plain, 'https://example.com/toast')!.steps).toEqual(['Toast it.', 'Butter it.']);
  });

  test('photo: an ImageObject, a relative URL, or the og:image when the recipe has none', () => {
    const obj = page('{"@type":"Recipe","name":"Soup","image":{"@type":"ImageObject","url":"/img/soup.jpg"},"recipeIngredient":["1 onion"]}');
    expect(parseRecipeFromHtml(obj, 'https://example.com/soup')?.photo).toBe('https://example.com/img/soup.jpg');
    const og = page('{"@type":"Recipe","name":"Soup","recipeIngredient":["1 onion"]}').replace(
      '<head>',
      '<head><meta property="og:image" content="https://cdn.example.com/soup.jpg" />',
    );
    expect(parseRecipeFromHtml(og, 'https://example.com/soup')?.photo).toBe('https://cdn.example.com/soup.jpg');
    expect(parseRecipeFromHtml(page('{"@type":"Recipe","name":"Soup","recipeIngredient":["1 onion"]}'), 'https://example.com/soup')?.photo).toBeUndefined();
  });

  test('finds a Recipe under mainEntity and survives trailing commas', () => {
    const html = page(`{"@type":"WebPage","mainEntity":{"@type":"Recipe","name":"Soup","recipeIngredient":["1 onion",],},}`);
    expect(parseRecipeFromHtml(html, 'https://example.com/soup')?.title).toBe('Soup');
  });

  test('reads microdata when the page has no JSON-LD', () => {
    const html = `<html><head><title>Tacos | Blog</title></head><body><h1>simple chicken tacos</h1><ul>
<li itemprop="recipeIngredient">8 small flour tortillas</li><li itemprop="recipeIngredient">1 pound chicken thighs</li></ul>
<div class="jetpack-recipe-directions e-instructions"><p>Warm the tortillas.</p><p>Cook the chicken.</p></div></body></html>`;
    const r = parseRecipeFromHtml(html, 'https://smittenkitchen.com/tacos')!;
    expect(r.title).toBe('Simple chicken tacos');
    expect(foundList(r).map((g) => [g.name, g.amount])).toEqual([['Flour tortillas', '8'], ['Chicken thighs', '1 pound']]);
    expect(r.steps).toEqual(['Warm the tortillas.', 'Cook the chicken.']);
  });

  test('reads the lists under the headings when JSON-LD has no ingredients', () => {
    const html = page('{"@type":"Recipe","name":"Tiramisu","recipeYield":"9"}').replace(
      '<body>',
      `<body><nav><span>Ingredients</span><ul><li>Chicken recipes</li><li>Pasta recipes</li></ul></nav>
<h2 class="heading m">Ingredients</h2><p><strong>Cream:</strong></p><ul><li>1½ cups (360mL) heavy whipping cream</li><li>3 Tbsp (38g) granulated sugar</li></ul>
<h2>Directions</h2><ol><li>Whisk the cream and sugar.</li><li>Layer and chill.</li></ol><h2>More recipes</h2><ul><li>Cake</li></ul>`,
    );
    const r = parseRecipeFromHtml(html, 'https://example.com/tiramisu')!;
    expect(r.title).toBe('Tiramisu');
    expect(r.servings).toBe('9 servings');
    expect(foundList(r).map((g) => [g.name, g.amount])).toEqual([['Heavy whipping cream', '1½ cups'], ['Granulated sugar', '3 Tbsp']]);
    expect(r.steps).toEqual(['Whisk the cream and sugar.', 'Layer and chill.']);
  });

  test('null when the page has no recipe', () => {
    // A menu under the word "Ingredients" isn't a recipe.
    expect(parseRecipeFromHtml('<html><body><span>Ingredients</span><ul><li>Chicken recipes</li><li>Fish recipes</li></ul></body></html>', 'https://x.com')).toBeNull();
    expect(parseRecipeFromHtml('<html><body><h1>Best summer dinners</h1></body></html>', 'https://example-news.com')).toBeNull();
    expect(parseRecipeFromHtml(page('{"@type":"Article","name":"News"}'), 'https://example-news.com')).toBeNull();
    expect(parseRecipeFromHtml(page('{"@type":"Recipe","name":"Empty","recipeIngredient":[]}'), 'https://x.com')).toBeNull();
    expect(parseRecipeFromHtml(page('{not json'), 'https://x.com')).toBeNull();
  });
});

describe('parseRecipeFromText', () => {
  test('headings split ingredients and steps', () => {
    const text = `Shakshuka
Serves 2
Total time: 25 min

Ingredients:
2 tbsp olive oil
1 onion
• 4 eggs
Tomatoes, a can

Method
1. Soften the onion in oil.
2. Add the tomatoes and simmer.
Crack in the eggs and cover.`;
    const r = parseRecipeFromText(text, KITCHEN)!;
    expect(r.title).toBe('Shakshuka');
    expect(r.servings).toBe('2 servings');
    expect(r.time).toBe('25 min');
    expect(r.need).toBe(4);
    expect(r.missing).toEqual(['Tomatoes']);
    expect(r.steps).toEqual(['Soften the onion in oil.', 'Add the tomatoes and simmer.', 'Crack in the eggs and cover.']);
    expect(r.url).toBeUndefined();
    expect(r.sourceLine).toBe('Imported from pasted text');
  });

  test('works without headings: amounts and bullets are ingredients, numbers are steps', () => {
    const text = `Quick oats
- 1 cup oats
- 1 cup milk
2 tbsp honey
1) Mix it all in a jar.
2) Leave overnight in the fridge.`;
    const r = parseRecipeFromText(text)!;
    expect(r.title).toBe('Quick oats');
    expect(r.missing).toEqual(['Oats', 'Milk', 'Honey']);
    expect(r.missingAmounts).toEqual({ Oats: '1 cup', Milk: '1 cup', Honey: '2 tbsp' });
    expect(foundList(r)[2]).toEqual({ name: 'Honey', have: false, amount: '2 tbsp' });
    expect(r.steps).toEqual(['Mix it all in a jar.', 'Leave overnight in the fridge.']);
  });

  test('a photographed cookbook page: page header skipped, capitals title, wrapped steps joined', () => {
    // As readText returns it: the page number column joined to the running header, lines broken where the page breaks them.
    const text = `112   WEEKNIGHT DINNERS
LEMON CHICKEN TRAYBAKE
Serves 4   Total time: 50 min
INGREDIENTS
8 chicken thighs
2 lemons, cut into wedges
1 lb small potatoes, halved
4 garlic cloves, unpeeled
3 tbsp olive oil
METHOD
1. Heat the oven to 425°F. Put the
potatoes in a roasting tin with the
oil and toss to coat.
2. Add the chicken, lemon and garlic,
season well and roast for 40 minutes
until golden.
3. Squeeze over the roasted lemon
before serving.`;
    const r = parseRecipeFromText(text, KITCHEN)!;
    expect(r.title).toBe('Lemon chicken traybake');
    expect(r.servings).toBe('4 servings');
    expect(r.need).toBe(5);
    expect(r.missing).toEqual(['Chicken thighs', 'Lemons', 'Potatoes']);
    expect(r.steps).toEqual([
      'Heat the oven to 425°F. Put the potatoes in a roasting tin with the oil and toss to coat.',
      'Add the chicken, lemon and garlic, season well and roast for 40 minutes until golden.',
      'Squeeze over the roasted lemon before serving.',
    ]);
  });

  test('leaves out every way of writing salt, pepper and water', () => {
    const recipe = parseRecipeFromText(
      ['Soup', '1 onion', 'Cooking salt / kosher salt', '¼ tsp Diamond Crystal kosher salt', 'freshly cracked pepper ($0.03)', '2 teaspoons hot water', '1 standard ice cube', '1 pinch each salt and pepper', 'Sel'].join('\n'),
    );
    expect(recipe?.missing).toEqual(['Onion']);
  });

  test('splits steps numbered inside one block', () => {
    const recipe = parseRecipeFromHtml(
      page(JSON.stringify({ '@type': 'Recipe', name: 'Pasta bake', recipeIngredient: ['1 onion'], recipeInstructions: [{ '@type': 'HowToStep', text: '1. Preheat the oven to 400 degrees F. 2. Melt the butter for 5 minutes. 3. Bake for 25 minutes.' }] })),
      'https://example.com/r',
    );
    expect(recipe?.steps).toEqual(['Preheat the oven to 400 degrees F.', 'Melt the butter for 5 minutes.', 'Bake for 25 minutes.']);
  });

  test('null without an ingredient list', () => {
    expect(parseRecipeFromText('Just some words about dinner.')).toBeNull();
    expect(parseRecipeFromText('')).toBeNull();
  });
});

describe('links', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  test('normalizeUrl adds https', () => {
    expect(normalizeUrl(' somekitchenblog.com/x ')).toBe('https://somekitchenblog.com/x');
    expect(normalizeUrl('http://a.com')).toBe('http://a.com');
  });

  test('importFromLink parses the fetched page, is null without a recipe, and unreachable offline', async () => {
    const html = page('{"@type":"Recipe","name":"Soup","recipeIngredient":["1 onion"]}');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }) as unknown as typeof fetch;
    expect(await importFromLink('example.com/soup', KITCHEN)).toMatchObject({ have: 1 });

    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') }) as unknown as typeof fetch;
    expect(await importFromLink('https://example.com/404')).toBeNull();

    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    expect(await importFromLink('https://example.com/offline')).toBe('unreachable');
  });

  const answer = (html: string, status = 200) =>
    jest.fn().mockResolvedValue({ ok: status < 300, status, url: '', text: () => Promise.resolve(html) }) as unknown as typeof fetch;

  test('readLink reads a recipe set as plain lines with no list or heading', async () => {
    global.fetch = answer(`<html><h1>Recipe: Salted Goat Caramel</h1><p>Some story about the sauce, the farm and the goats.</p>
      <p>Salted Goat Caramel<br>makes 1/2 cup<br>1 quart goat milk<br>1/2 cup sugar<br>1/4 teaspoon baking soda, dissolved in warm water<br>
      1 tablespoon fish sauce<br>salt and pepper, to taste</p><p>In a thick-bottomed sauce pot, combine milk and sugar and bring to a boil.</p>
      <p>Whisk in the baking soda and simmer, stirring often, for about an hour.</p><p>Share this</p></html>`);
    const { recipe } = await readLink('https://example.com/caramel');
    expect(recipe?.title).toBe('Recipe: Salted Goat Caramel');
    expect(recipe?.missing).toEqual(['Goat milk', 'Sugar', 'Baking soda', 'Fish sauce']);
    expect(recipe?.steps).toHaveLength(2);
  });

  test('readLink reads a YouTube description, or follows its link to the written recipe', async () => {
    const video = (description: string) =>
      `<html><head><meta property="og:image" content="https://i.ytimg.com/vi/x/hq.jpg"></head>
      <script>var ytInitialPlayerResponse = {"videoDetails":{"title":"Pasta Aglio e Olio","shortDescription":${JSON.stringify(description)}}};</script></html>`;
    global.fetch = answer(video('Recipe below!\n\n*Ingredients*\n\n1/2 head garlic\n1 bunch parsley\n1/2 cup olive oil\n\n*Method*\n\nCook pasta to al dente.\n\nInstagram: http://bit.ly/x'));
    const { recipe } = await readLink('https://www.youtube.com/watch?v=x');
    expect(recipe?.title).toBe('Pasta Aglio e Olio');
    expect(recipe?.missing).toEqual(['Garlic', 'Parsley', 'Olive oil']);
    expect(recipe?.steps).toEqual(['Cook pasta to al dente.']);
    expect(recipe?.photo).toBe('https://i.ytimg.com/vi/x/hq.jpg');

    const written = page('{"@type":"Recipe","name":"51 Hour Focaccia","recipeIngredient":["900g bread flour","5g instant yeast"]}');
    global.fetch = jest.fn(async (url: string) =>
      url.includes('youtube')
        ? { ok: true, status: 200, url, text: async () => video('Get the recipe: https://www.joshuaweissman.com/recipes/focaccia\nPatreon: https://patreon.com/x') }
        : { ok: true, status: 200, url, text: async () => written },
    ) as unknown as typeof fetch;
    const linked = await readLink('https://www.youtube.com/watch?v=y');
    expect(linked.recipe?.title).toBe('51 Hour Focaccia');
    expect(jest.mocked(global.fetch).mock.calls.map((c) => c[0])).toEqual(['https://www.youtube.com/watch?v=y', 'https://www.joshuaweissman.com/recipes/focaccia']);
  });

  test('readLink reads a TikTok caption, bulleted on one line or run on', async () => {
    const tiktok = (desc: string) =>
      `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{"itemStruct":{"desc":${JSON.stringify(desc)},"video":{"cover":"https://p16.tiktokcdn.com/c.jpg"}}}</script></html>`;
    global.fetch = answer(
      tiktok('30-Min Marry Me Chicken 🔥 Early access to the CLUB👌🏻 Ingredients: - 4 chicken breasts @MagnessFarms - 1 tsp smoked paprika - salt & pepper - 250ml double cream 1. Season and sear your chicken for a few mins each side 2. Add the cream and simmer #marrymechicken'),
    );
    const { recipe } = await readLink('https://www.tiktok.com/@tylerbutt_eats/video/1');
    expect(recipe?.title).toBe('30-Min Marry Me Chicken');
    expect(recipe?.missing).toEqual(['Chicken breasts', 'Smoked paprika', 'Double cream']);
    expect(recipe?.steps).toEqual(['Season and sear your chicken for a few mins each side', 'Add the cream and simmer']);
    expect(recipe?.photo).toBe('https://p16.tiktokcdn.com/c.jpg');

    global.fetch = answer(tiktok("Homemade chicken nuggets. $2 for 4 pieces! here's the recipe 1lb chicken breast 1 egg 2Tbsp hot sauce 1C cornstarch 1tsp paprika deep fry at 390F for 3-4 minutes until golden brown!"));
    const runOn = await readLink('https://www.tiktok.com/@jose.elcook/video/2');
    expect(runOn.recipe?.missing).toEqual(['Chicken breast', 'Egg', 'Hot sauce', 'Cornstarch', 'Paprika']);
    expect(runOn.recipe?.steps).toEqual(['deep fry at 390F for 3-4 minutes until golden brown!']);
  });

  test('readLink reads an Instagram caption from the page description', async () => {
    const caption = 'Lemon Orzo ✨ Ingredients: - 1 cup orzo - 2 cups chicken stock - 1 lemon - 30g parmesan 1. Toast the orzo in butter 2. Add the stock and simmer';
    global.fetch = answer(
      `<html><head><meta property="og:image" content="https://scontent.cdninstagram.com/o.jpg"><meta property="og:description" content="1,234 likes, 56 comments - recipeincaption on March 1, 2025: &quot;${caption}&quot;. "></head></html>`,
    );
    const { recipe } = await readLink('https://www.instagram.com/reel/abc123/');
    expect(recipe?.title).toBe('Lemon Orzo');
    expect(recipe?.missing).toEqual(['Orzo', 'Chicken stock', 'Lemon', 'Parmesan']);
    expect(recipe?.steps).toHaveLength(2);
    expect(recipe?.photo).toBe('https://scontent.cdninstagram.com/o.jpg');
  });

  test('readLink hands blocked, unanswered and recipe-less pages to the browser, but not missing ones', async () => {
    const recipe = page('{"@type":"Recipe","name":"Egg Fried Rice","recipeIngredient":["5 cups cooked rice","5 eggs"]}');
    const browse = jest.fn().mockResolvedValue(recipe);
    global.fetch = answer('<title>Security Verification</title>', 403);
    expect((await readLink('https://thewoksoflife.com/egg-fried-rice/', [], undefined, browse)).recipe?.title).toBe('Egg Fried Rice');
    global.fetch = answer('<div id="root"></div>');
    expect((await readLink('https://realfood.tesco.com/recipes/simple-lasagne.html', [], undefined, browse)).recipe?.title).toBe('Egg Fried Rice');
    global.fetch = jest.fn().mockRejectedValue(new TypeError('The request timed out.')) as unknown as typeof fetch;
    expect(await readLink('https://slow.example.com/r', [], undefined, browse)).toMatchObject({ reached: true });
    expect(browse).toHaveBeenCalledTimes(3);

    global.fetch = answer('', 404);
    expect(await readLink('https://example.com/gone', [], undefined, browse)).toEqual({ recipe: null, reached: true });
    expect(browse).toHaveBeenCalledTimes(3);

    // Offline: the browser can't load it either, so it still reads as never reached.
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    expect(await readLink('https://example.com/offline', [], undefined, jest.fn().mockResolvedValue(null))).toEqual({ recipe: null, reached: false });
  });

  test('readLink tells a page with no recipe apart from a page it never reached', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<html><p>Hi</p></html>') }) as unknown as typeof fetch;
    expect(await readLink('https://example.com/about')).toEqual({ recipe: null, reached: true });

    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') }) as unknown as typeof fetch;
    expect(await readLink('https://example.com/404')).toEqual({ recipe: null, reached: true });

    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    expect(await readLink('https://example.com/offline')).toEqual({ recipe: null, reached: false });
  });
});
