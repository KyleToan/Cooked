-- An item's amount is optional (Decisions #160): null means nobody counted it, 0 means used up.
alter table public.items alter column qty drop not null;
alter table public.items alter column qty drop default;

-- Uncounted items are still in the kitchen, so Join's preview counts them.
create or replace function public.peek_invite(code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'kitchen', k.name,
    'invitedBy', coalesce(p.name, ''),
    'items', (select count(*) from public.items it where it.kitchen_id = k.id and it.qty is distinct from 0),
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
