-- DEV / LOCAL ONLY. Never run this in production.
-- Recreates the Rivera sample kitchen from src/data/seed.ts so the design screenshots can be reproduced.
-- Alex (alex.rivera@gmail.com) made the kitchen; Sam (sam.rivera@example.com) joined Oct 3.
-- Invite code: rivera-kitchen. Joining marks it used, so reset the database to use it again.

-- People. The on_auth_user_created trigger makes their profiles.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000a1e1', 'authenticated', 'authenticated',
   'alex.rivera@gmail.com', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Alex"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000005a11', 'authenticated', 'authenticated',
   'sam.rivera@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Sam"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u
where u.id in ('00000000-0000-4000-a000-00000000a1e1', '00000000-0000-4000-a000-000000005a11');

update public.profiles set last_name = 'Rivera', onboarded_at = now()
where id = '00000000-0000-4000-a000-00000000a1e1';
update public.profiles set onboarded_at = now()
where id = '00000000-0000-4000-a000-000000005a11';

-- The kitchen, synced 2h ago from a receipt.
insert into public.kitchens (id, name, created_by, synced_at, created_at) values
  ('00000000-0000-4000-b000-000000000001', 'Rivera kitchen', '00000000-0000-4000-a000-00000000a1e1',
   now() - interval '2 hours', date_trunc('year', now()) + interval '8 months');

insert into public.kitchen_members (kitchen_id, user_id, joined_at) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-00000000a1e1', date_trunc('year', now()) + interval '8 months'),
  -- "Joined Oct 3".
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000005a11', date_trunc('year', now()) + interval '9 months 2 days');

insert into public.invites (code, kitchen_id, expires_at) values
  ('rivera-kitchen', '00000000-0000-4000-b000-000000000001', now() + interval '10 years');

-- Items: best_by = today + daysLeft.
insert into public.items (kitchen_id, name, place, meta, qty, unit, amount_text, best_by, running_low, use_soon, added_by)
select '00000000-0000-4000-b000-000000000001'::uuid, v.name, v.place, v.meta, v.qty, v.unit, v.amount_text,
       current_date + v.days_left, v.running_low, v.use_soon,
       case v.who when 'sam' then '00000000-0000-4000-a000-000000005a11'::uuid else '00000000-0000-4000-a000-00000000a1e1'::uuid end
from (values
  ('Spinach',         'fridge',  'Best by tomorrow',                1, 'bag',     null,          1,   false, false, 'alex'),
  ('Chicken thighs',  'fridge',  'Best in 2 days',                  1, 'pack',    null,          2,   false, false, 'alex'),
  ('Milk 2%',         'fridge',  'Best in 3 days',                  1, 'carton',  null,          3,   false, false, 'alex'),
  ('Eggs',            'fridge',  'Best in 9 days',                  8, 'eggs',    null,          9,   false, false, 'alex'),
  ('Greek yogurt',    'fridge',  'Sam used the last one · 9:40 am', 0, 'tubs',    null,          5,   false, false, 'sam'),
  ('Cheddar',         'fridge',  'Best in 3 weeks',                 1, 'block',   null,          21,  false, false, 'alex'),
  ('Basil',           'fridge',  'Best in 4 days',                  1, 'bunch',   null,          4,   false, false, 'alex'),
  ('Rice',            'pantry',  'Bought 3 weeks ago',              1, 'cup',     'About 1 cup', 0,   true,  false, 'alex'),
  ('Chickpeas',       'pantry',  'Canned',                          3, 'cans',    null,          400, false, false, 'alex'),
  ('Flour',           'pantry',  'Opened in May',                   1, 'bag',     null,          120, false, false, 'alex'),
  ('Olive oil',       'pantry',  'About half left',                 1, 'bottle',  null,          200, false, false, 'alex'),
  ('Spaghetti',       'pantry',  'From today’s receipt',            2, 'boxes',   null,          300, false, false, 'alex'),
  ('Bread',           'pantry',  'Best in 3 days',                  1, 'loaf',    null,          3,   false, false, 'sam'),
  ('Chili leftovers', 'freezer', 'Frozen 3 months ago',             2, 'tubs',    null,          7,   false, true,  'alex'),
  ('Frozen peas',     'freezer', 'From today’s receipt',            1, 'bag',     null,          180, false, false, 'alex'),
  ('Ice cream',       'freezer', 'Opened',                          1, 'tub',     null,          60,  false, false, 'sam'),
  ('Salmon fillets',  'freezer', 'Frozen a month ago',              4, 'fillets', null,          60,  false, false, 'alex')
) as v(name, place, meta, qty, unit, amount_text, days_left, running_low, use_soon, who);

-- To Buy, in the order Home shows it (updated_at keeps the order).
insert into public.to_buy (kitchen_id, name, note, place, done, added_by, updated_at)
select '00000000-0000-4000-b000-000000000001'::uuid, v.name, v.note, v.place, v.done,
       case v.who when 'sam' then '00000000-0000-4000-a000-000000005a11'::uuid else '00000000-0000-4000-a000-00000000a1e1'::uuid end,
       now() - make_interval(mins => v.n)
from (values
  (1, 'Tomatoes',       'For Shakshuka', 'fridge',  false, 'alex'),
  (2, 'Feta',           'For Shakshuka', 'fridge',  false, 'alex'),
  (3, 'Frozen berries', 'Added by Sam',  'freezer', false, 'sam'),
  (4, 'Rice',           'Running low',   'pantry',  false, 'alex'),
  (5, 'Bread',          'Added by Sam',  'pantry',  true,  'sam'),
  (6, 'Olive oil',      'Running low',   'pantry',  true,  'alex')
) as v(n, name, note, place, done, who);

-- Recipes. Ingredients list everything the recipe uses; match.ts works out have / missing.
insert into public.recipes (kitchen_id, title, time, servings, source_line, source_link, url, ingredients, steps, saved_by) values
  ('00000000-0000-4000-b000-000000000001', 'Spinach & chicken pasta', '30 min', '2 servings',
   'Saved by Sam', 'Saved by Sam from a cookbook', null,
   '[{"name":"Spinach","place":"fridge","amount":"2 handfuls"},
     {"name":"Chicken thighs","place":"fridge","amount":"2"},
     {"name":"Spaghetti","place":"pantry","amount":"200 g"},
     {"name":"Garlic","place":"pantry","amount":"2 cloves"},
     {"name":"Cheddar","place":"fridge","amount":"60 g"},
     {"name":"Milk 2%","place":"fridge","amount":"150 ml"},
     {"name":"Olive oil","place":"pantry","amount":"1 tbsp"},
     {"name":"Basil","place":"fridge","amount":"A few leaves"}]',
   '["Boil the spaghetti in salted water.",
     "Brown the chicken in olive oil, 6 to 7 minutes a side, then slice.",
     "Soften the garlic, add milk and cheddar, and stir until smooth.",
     "Stir in spinach until it wilts, then the pasta, chicken and basil."]',
   'saved by Sam'),
  ('00000000-0000-4000-b000-000000000001', 'Shakshuka', '25 min', '2 servings',
   'Imported from somekitchenblog.com', 'Open the original on somekitchenblog.com', 'https://somekitchenblog.com/shakshuka',
   '[{"name":"Eggs","place":"fridge","amount":"4"},
     {"name":"Onion","place":"pantry","amount":"1"},
     {"name":"Red pepper","place":"fridge","amount":"1"},
     {"name":"Garlic","place":"pantry","amount":"2 cloves"},
     {"name":"Cumin","place":"pantry","amount":"1 tsp"},
     {"name":"Olive oil","place":"pantry","amount":"2 tbsp"},
     {"name":"Tomatoes","place":"fridge","amount":"400 g"},
     {"name":"Feta","place":"fridge","amount":"50 g"}]',
   '["Soften the onion and pepper in olive oil, about 8 minutes.",
     "Add garlic and cumin, then the tomatoes. Simmer 10 minutes until thick.",
     "Make 4 wells and crack in the eggs. Cover and cook 5 to 7 minutes.",
     "Crumble feta on top and serve with bread."]',
   null),
  -- List-only recipes: seed.ts has no full ingredient lists, only what's missing.
  ('00000000-0000-4000-b000-000000000001', 'Chickpea curry', '35 min', null,
   'Saved by Sam', 'Saved by Sam', null, '[]', '[]', null),
  ('00000000-0000-4000-b000-000000000001', 'Berry overnight oats', '10 min', null,
   'Scanned from a cookbook', 'Scanned from a cookbook', null,
   '[{"name":"Frozen berries","place":"freezer","amount":"1 cup"}]', '[]', null),
  ('00000000-0000-4000-b000-000000000001', 'Pesto pasta', '20 min', null,
   'Imported from a link', 'Imported from a link', null,
   '[{"name":"Pine nuts","place":"pantry","amount":"30 g"},
     {"name":"Parmesan","place":"fridge","amount":"40 g"},
     {"name":"Garlic","place":"pantry","amount":"1 clove"}]',
   '[]', null);
