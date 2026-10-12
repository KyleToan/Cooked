-- When the person who made a kitchen leaves it or deletes their account, the
-- member who joined earliest becomes the new maker (Decisions.md).

-- If `leaving` made the kitchen, hands it to the earliest-joined other member
-- (ties broken by user_id). With nobody else left, created_by stays as it is.
create function public.hand_over(kitchen_id uuid, leaving uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  heir uuid;
begin
  -- Lock the kitchen so two people leaving at once hand over one after the other.
  perform 1 from public.kitchens k where k.id = hand_over.kitchen_id for update;

  select m.user_id into heir
  from public.kitchen_members m
  where m.kitchen_id = hand_over.kitchen_id and m.user_id <> hand_over.leaving
  order by m.joined_at, m.user_id
  limit 1;

  if heir is not null then
    update public.kitchens k set created_by = heir
    where k.id = hand_over.kitchen_id and k.created_by = hand_over.leaving;
  end if;
end;
$$;

revoke execute on function public.hand_over(uuid, uuid) from public, anon, authenticated;

-- Same as before, plus the hand-over before leaving the current kitchen.
create or replace function public.join_kitchen(code text)
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

  perform public.hand_over(m.kitchen_id, uid) from public.kitchen_members m where m.user_id = uid;
  delete from public.kitchen_members m where m.user_id = uid;
  insert into public.kitchen_members (kitchen_id, user_id) values (inv.kitchen_id, uid);
  update public.invites i set used_by = uid, used_at = now() where i.code = inv.code;
  return inv.kitchen_id;
end;
$$;

-- Same as before, plus the hand-over before leaving.
create or replace function public.leave_kitchen()
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

  perform public.hand_over(m.kitchen_id, uid) from public.kitchen_members m where m.user_id = uid;
  delete from public.kitchen_members m where m.user_id = uid;
  return public.create_kitchen(coalesce(family, 'My') || ' kitchen');
end;
$$;

-- Same as before, plus the hand-over before the delete cascades the membership
-- away and sets created_by null.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform public.hand_over(m.kitchen_id, uid) from public.kitchen_members m where m.user_id = uid;
  delete from auth.users u where u.id = uid;
end;
$$;
