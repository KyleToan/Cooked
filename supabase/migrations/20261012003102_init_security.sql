-- Cooked backend, applied as three migrations (2/3: row level security, realtime, helpers, safe RPCs).
-- Column names are a contract the app codes against (src/data/remote.ts).

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
