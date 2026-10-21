-- Just bought and not put away yet: shown under Just bought, not in its place. place holds the best guess.
alter table public.items add column unsorted boolean not null default false;
