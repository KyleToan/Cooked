-- Cooked: schema, row level security and RPCs (Phase 1 of the backend plan).
-- Column names are a contract the app codes against (src/data/db.ts is generated from them).

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

-- ─── Profile for every new user ──────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row level security ──────────────────────────────────────────────────────

create function public.is_member(k uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.kitchen_members m
    where m.kitchen_id = k and m.user_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.kitchens enable row level security;
alter table public.kitchen_members enable row level security;
alter table public.invites enable row level security;
alter table public.items enable row level security;
alter table public.to_buy enable row level security;
alter table public.recipes enable row level security;

create policy "Members use items" on public.items for all to authenticated
  using (public.is_member(kitchen_id)) with check (public.is_member(kitchen_id));
create policy "Members use to buy" on public.to_buy for all to authenticated
  using (public.is_member(kitchen_id)) with check (public.is_member(kitchen_id));
create policy "Members use recipes" on public.recipes for all to authenticated
  using (public.is_member(kitchen_id)) with check (public.is_member(kitchen_id));

-- Kitchens are created and deleted only by the RPCs below.
create policy "Members read their kitchen" on public.kitchens for select to authenticated
  using (public.is_member(id));
create policy "Members update their kitchen" on public.kitchens for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
-- Members may rename and mark synced, but not change who made the kitchen.
revoke update on public.kitchens from anon, authenticated;
grant update (name, synced_at) on public.kitchens to authenticated;

create policy "Members see who shares their kitchen" on public.kitchen_members for select to authenticated
  using (public.is_member(kitchen_id));

create policy "Members see their invites" on public.invites for select to authenticated
  using (public.is_member(kitchen_id));

create policy "People read themselves and their kitchen" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.kitchen_members m
      where m.user_id = profiles.id and public.is_member(m.kitchen_id)
    )
  );
create policy "People update themselves" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ─── Realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table
  public.items, public.to_buy, public.recipes, public.kitchens, public.kitchen_members;

-- ─── Helpers (not callable by clients) ───────────────────────────────────────

-- Same as `slug` in src/data/store.tsx: "Peña" → "pena", "" → "my".
create function public.slug(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(
    trim(both '-' from regexp_replace(
      lower(regexp_replace(normalize(coalesce(t, ''), NFD), '[̀-ͯ]', '', 'g')),
      '[^a-z0-9]+', '-', 'g')),
    ''), 'my');
$$;

-- "Rivera kitchen" → "rivera".
create function public.family_slug(kitchen_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select public.slug(regexp_replace(kitchen_name, '\s*kitchen\s*$', '', 'i'));
$$;

-- An invite code that isn't taken: `base` itself, or `base` + "-xxxx" if forced or taken.
create function public.free_code(base text, always_suffix boolean)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  c text := base;
begin
  if always_suffix then
    c := base || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end if;
  while exists (select 1 from public.invites i where i.code = c) loop
    c := base || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end loop;
  return c;
end;
$$;

-- ─── RPCs ────────────────────────────────────────────────────────────────────
-- Exceptions carry stable messages the app matches on.

-- Makes a kitchen with you in it and its first invite ("rivera-kitchen"). Returns the kitchen id.
create function public.create_kitchen(name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  k uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.kitchen_members m where m.user_id = uid) then
    raise exception 'already_in_kitchen';
  end if;

  insert into public.kitchens (name, created_by) values (create_kitchen.name, uid) returning id into k;
  insert into public.kitchen_members (kitchen_id, user_id) values (k, uid);
  insert into public.invites (code, kitchen_id)
  values (public.free_code(public.family_slug(create_kitchen.name) || '-kitchen', false), k);
  return k;
end;
$$;

-- Joins the kitchen behind an invite code, leaving your current one. Returns the kitchen id.
create function public.join_kitchen(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
begin
  if uid is null then raise exception 'not_signed_in'; end if;

  select * into inv from public.invites i where i.code = lower(trim(join_kitchen.code)) for update;
  if not found or inv.revoked then raise exception 'invite_not_found'; end if;
  if inv.used_by is not null then raise exception 'invite_used'; end if;
  if inv.expires_at < now() then raise exception 'invite_expired'; end if;

  if public.is_member(inv.kitchen_id) then return inv.kitchen_id; end if;

  delete from public.kitchen_members m where m.user_id = uid;
  insert into public.kitchen_members (kitchen_id, user_id) values (inv.kitchen_id, uid);
  update public.invites i set used_by = uid, used_at = now() where i.code = inv.code;
  return inv.kitchen_id;
end;
$$;

-- Revokes the kitchen's open invites and makes a new code ("rivera-k7m2"). Returns the code.
create function public.new_invite(kitchen_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  kname text;
  c text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_member(new_invite.kitchen_id) then raise exception 'not_member'; end if;

  select k.name into kname from public.kitchens k where k.id = new_invite.kitchen_id;
  update public.invites i set revoked = true
  where i.kitchen_id = new_invite.kitchen_id and i.used_by is null and not i.revoked;

  c := public.free_code(public.family_slug(kname), true);
  insert into public.invites (code, kitchen_id) values (c, new_invite.kitchen_id);
  return c;
end;
$$;

-- Only the person who made the kitchen can remove people (Decisions.md).
create function public.remove_member(kitchen_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (
    select 1 from public.kitchens k
    where k.id = remove_member.kitchen_id and k.created_by = uid and public.is_member(k.id)
  ) then
    raise exception 'not_creator';
  end if;
  if remove_member.user_id = uid then raise exception 'cannot_remove_self'; end if;

  delete from public.kitchen_members m
  where m.kitchen_id = remove_member.kitchen_id and m.user_id = remove_member.user_id;
end;
$$;

-- Undo for remove_member. Fails if they've joined another kitchen since.
create function public.restore_member(kitchen_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (
    select 1 from public.kitchens k
    where k.id = restore_member.kitchen_id and k.created_by = uid and public.is_member(k.id)
  ) then
    raise exception 'not_creator';
  end if;
  if exists (
    select 1 from public.kitchen_members m
    where m.user_id = restore_member.user_id and m.kitchen_id <> restore_member.kitchen_id
  ) then
    raise exception 'in_other_kitchen';
  end if;

  insert into public.kitchen_members (kitchen_id, user_id)
  values (restore_member.kitchen_id, restore_member.user_id)
  on conflict do nothing;
end;
$$;

-- Leaves your kitchen and makes you a new, empty one ("Rivera kitchen"). Returns its id.
create function public.leave_kitchen()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  family text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;

  select coalesce(nullif(trim(p.last_name), ''), nullif(trim(p.name), ''), 'My') into family
  from public.profiles p where p.id = uid;

  delete from public.kitchen_members m where m.user_id = uid;
  return public.create_kitchen(coalesce(family, 'My') || ' kitchen');
end;
$$;

-- Deletes your account. Kitchen rows you added stay (added_by is set null).
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  delete from auth.users u where u.id = uid;
end;
$$;

-- ─── Who can call what ───────────────────────────────────────────────────────

revoke execute on function
  public.handle_new_user(),
  public.slug(text),
  public.family_slug(text),
  public.free_code(text, boolean)
from public, anon, authenticated;

revoke execute on function
  public.is_member(uuid),
  public.create_kitchen(text),
  public.join_kitchen(text),
  public.new_invite(uuid),
  public.remove_member(uuid, uuid),
  public.restore_member(uuid, uuid),
  public.leave_kitchen(),
  public.delete_account()
from public, anon;

grant execute on function
  public.is_member(uuid),
  public.create_kitchen(text),
  public.join_kitchen(text),
  public.new_invite(uuid),
  public.remove_member(uuid, uuid),
  public.restore_member(uuid, uuid),
  public.leave_kitchen(),
  public.delete_account()
to authenticated;
