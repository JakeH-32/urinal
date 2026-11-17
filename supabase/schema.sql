-- URINAL crowd stats ("better than 72% of players", "most went with #7").
-- Paste this whole file into Supabase -> SQL Editor -> Run. Safe to run again.
-- See docs/STATS.md. The game talks to this over the REST API with the public anon key:
--   POST /rest/v1/picks, POST /rest/v1/finishes   (insert only; a repeat comes back 409)
--   POST /rest/v1/rpc/day_stats {"p_day": N}      (aggregate counts only)
-- Nothing personal is stored: day, round, slot, grade, points, clears, a new/yesterday/lapsed flag and a
-- random per-device id.
--   POST /rest/v1/rpc/forget_device {"p_device": "<uuid>"}   (deletes that device's rows)

-- One row per device per daily round.
create table if not exists public.picks (
  day        integer     not null check (day between 1 and 100000),
  round      smallint    not null check (round between 1 and 6),
  slot       smallint    not null check (slot between 0 and 9),
  grade      text        not null check (grade in ('clear', 'straw', 'amber', 'doctor')),
  device     uuid        not null,
  created_at timestamptz not null default now(),
  primary key (day, round, device)
);

-- One row per device per finished day. points: clear 3, lemonade 2, apple juice 1, see a doctor 0.
create table if not exists public.finishes (
  day        integer     not null check (day between 1 and 100000),
  device     uuid        not null,
  points     smallint    not null check (points between 0 and 18),
  clears     smallint    not null check (clears between 0 and 6),
  created_at timestamptz not null default now(),
  primary key (day, device),
  check (points between clears * 3 and clears * 3 + (6 - clears) * 2)
);

-- Was this player here before? Worked out on the device: 'new' (first finished daily), 'yesterday'
-- (also finished the day before) or 'lapsed' (came back after a gap). Null on rows from before this.
alter table public.finishes add column if not exists visit text
  check (visit is null or visit in ('new', 'yesterday', 'lapsed'));

-- Row-level security: the public key may INSERT and nothing else. No select/update/delete policies
-- exist, so nobody can read, change or delete raw rows through the API.
alter table public.picks enable row level security;
alter table public.finishes enable row level security;

revoke all on table public.picks, public.finishes from anon, authenticated;
-- SELECT is granted, but RLS has no select policy, so every read returns zero rows. (The game sends
-- plain inserts: "on conflict do nothing" would fail the RLS check without a select policy.)
grant select, insert on table public.picks, public.finishes to anon, authenticated;

-- Inserts are accepted only for "today" (Urinal #1 = 2026-10-28), with a day of slack each way for
-- time zones. If URINAL_EPOCH in src/engine/daily.ts ever changes, change the date here too.
drop policy if exists "players add picks" on public.picks;
create policy "players add picks" on public.picks
  for insert to anon, authenticated
  with check (
    day between ((now() at time zone 'utc')::date - date '2026-10-28') - 1
            and ((now() at time zone 'utc')::date - date '2026-10-28') + 3
  );

drop policy if exists "players add finishes" on public.finishes;
create policy "players add finishes" on public.finishes
  for insert to anon, authenticated
  with check (
    day between ((now() at time zone 'utc')::date - date '2026-10-28') - 1
            and ((now() at time zone 'utc')::date - date '2026-10-28') + 3
  );

-- Aggregates for one day. Runs as the table owner (security definer) so it can count rows the public
-- key can't read, and returns only counts:
--   {"players": 4, "rounds": [[round, slot, count], ...], "points": [[points, count], ...]}
create or replace function public.day_stats(p_day integer)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'players', (
      select count(*)
      from (
        select device from public.picks where day = p_day
        union
        select device from public.finishes where day = p_day
      ) as d
    ),
    'rounds', coalesce((
      select json_agg(json_build_array(r.round, r.slot, r.n) order by r.round, r.slot)
      from (
        select round, slot, count(*) as n
        from public.picks
        where day = p_day
        group by round, slot
      ) as r
    ), '[]'::json),
    'points', coalesce((
      select json_agg(json_build_array(f.points, f.n) order by f.points)
      from (
        select points, count(*) as n
        from public.finishes
        where day = p_day
        group by points
      ) as f
    ), '[]'::json)
  );
$$;

revoke all on function public.day_stats(integer) from public;
grant execute on function public.day_stats(integer) to anon, authenticated;

-- "Delete my crowd data" in Settings: removes every row sent with one device id. The id is a random
-- 122-bit value only that device holds, so knowing it is the proof of ownership.
create or replace function public.forget_device(p_device uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.picks where device = p_device;
  delete from public.finishes where device = p_device;
$$;

revoke all on function public.forget_device(uuid) from public;
grant execute on function public.forget_device(uuid) to anon, authenticated;

-- Make the REST API pick up the new tables and function right away.
notify pgrst, 'reload schema';
