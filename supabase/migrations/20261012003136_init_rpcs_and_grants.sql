-- Cooked backend, applied as three migrations (3/3: RPCs that delete, and who can call what).
-- Column names are a contract the app codes against (src/data/remote.ts).

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

-- Members may rename and mark synced, but not change who made the kitchen.
revoke update on public.kitchens from anon, authenticated;
grant update (name, synced_at) on public.kitchens to authenticated;

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
