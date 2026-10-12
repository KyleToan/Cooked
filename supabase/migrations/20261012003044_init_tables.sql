-- Cooked backend, applied as three migrations (1/3: tables).
-- Column names are a contract the app codes against (src/data/remote.ts).

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  last_name text,
  onboarded_at timestamptz,
  -- Matches SEED_NOTIFICATIONS in src/data/seed.ts.
  notifications jsonb not null default '{"toBuy":true,"useSoon":true,"joins":true,"weekly":false,"useSoonTime":"5:00 pm"}'
);

create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users on delete set null,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.kitchen_members (
  kitchen_id uuid not null references public.kitchens on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (kitchen_id, user_id),
  -- One kitchen per person.
  unique (user_id)
);

create table public.invites (
  code text primary key,
  kitchen_id uuid not null references public.kitchens on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users on delete set null,
  used_at timestamptz,
  revoked boolean not null default false
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens on delete cascade,
  name text not null,
  place text not null check (place in ('fridge', 'pantry', 'freezer')),
  qty numeric not null default 1 check (qty >= 0),
  unit text not null default '',
  amount_text text,
  meta text not null default '',
  best_by date,
  running_low boolean not null default false,
  use_soon boolean not null default false,
  added_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

create table public.to_buy (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens on delete cascade,
  name text not null,
  note text not null default '',
  place text not null check (place in ('fridge', 'pantry', 'freezer')),
  done boolean not null default false,
  added_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens on delete cascade,
  title text not null,
  time text not null default '',
  servings text,
  photo text,
  source_line text not null default '',
  source_link text not null default '',
  url text,
  -- [{ name, place, amount? }]. `have` is worked out in match.ts, never stored.
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  on_to_buy boolean not null default false,
  saved_by text,
  updated_at timestamptz not null default now()
);

create index on public.invites (kitchen_id);
create index on public.items (kitchen_id);
create index on public.to_buy (kitchen_id);
create index on public.recipes (kitchen_id);
-- kitchen_members is covered by its primary key (kitchen_id first).


alter table public.profiles enable row level security;
alter table public.kitchens enable row level security;
alter table public.kitchen_members enable row level security;
alter table public.invites enable row level security;
alter table public.items enable row level security;
alter table public.to_buy enable row level security;
alter table public.recipes enable row level security;
