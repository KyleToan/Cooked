-- use_soon: null follows the best_by date; true/false is a person's own setting.
alter table public.items alter column use_soon drop default;
alter table public.items alter column use_soon drop not null;
update public.items set use_soon = null where use_soon = false;
