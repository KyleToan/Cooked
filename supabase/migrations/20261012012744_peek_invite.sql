-- What Join shows before you join: the kitchen, who made it, and how full it is.
-- Null for an unknown, revoked, used or expired code (normalized the same way as join_kitchen).
create function public.peek_invite(code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'kitchen', k.name,
    'invitedBy', coalesce(p.name, ''),
    'items', (select count(*) from public.items it where it.kitchen_id = k.id and it.qty > 0),
    'toBuy', (select count(*) from public.to_buy tb where tb.kitchen_id = k.id and not tb.done)
  )
  from public.invites i
  join public.kitchens k on k.id = i.kitchen_id
  left join public.profiles p on p.id = k.created_by
  where i.code = lower(trim(peek_invite.code))
    and not i.revoked
    and i.used_by is null
    and i.expires_at >= now();
$$;

revoke execute on function public.peek_invite(text) from public, anon;
grant execute on function public.peek_invite(text) to authenticated;
