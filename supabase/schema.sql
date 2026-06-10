-- =========================================================
-- Prode Mundial 2026 - Esquema de base de datos (Supabase/Postgres)
-- =========================================================
-- Ejecutar este archivo completo en el SQL Editor de tu proyecto de
-- Supabase (una sola vez), y luego ejecutar supabase/seed.sql para
-- cargar los equipos y el fixture inicial.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PERFILES (uno por usuario de auth.users)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Crea automáticamente un perfil cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  begin
    insert into public.profiles (id, username) values (new.id, uname);
  exception when unique_violation then
    insert into public.profiles (id, username) values (new.id, uname || '_' || substr(new.id::text, 1, 4));
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- EQUIPOS
-- ---------------------------------------------------------
create table public.teams (
  id smallint primary key,
  name text not null,
  flag text not null default '',
  group_letter char(1)
);

alter table public.teams enable row level security;

create policy "teams_select_all" on public.teams
  for select using (true);

create policy "teams_admin_write" on public.teams
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- ---------------------------------------------------------
-- PARTIDOS
-- ---------------------------------------------------------
create type public.match_phase as enum ('group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final');
create type public.match_status as enum ('scheduled', 'finished');

create table public.matches (
  id integer primary key,
  phase public.match_phase not null,
  group_letter char(1),
  matchday smallint,
  home_team_id smallint references public.teams (id),
  away_team_id smallint references public.teams (id),
  home_placeholder text,
  away_placeholder text,
  venue text,
  kickoff_at timestamptz not null,
  home_score smallint,
  away_score smallint,
  status public.match_status not null default 'scheduled'
);

alter table public.matches enable row level security;

create policy "matches_select_all" on public.matches
  for select using (true);

create policy "matches_admin_write" on public.matches
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- ---------------------------------------------------------
-- LIGAS (pools privados para jugar con amigos)
-- ---------------------------------------------------------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

-- Funciones "security definer" para evitar recursión en las políticas RLS.
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_league_member(uuid) to authenticated, anon;

create or replace function public.shares_league(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.league_members lm1
    join public.league_members lm2 on lm1.league_id = lm2.league_id
    where lm1.user_id = auth.uid() and lm2.user_id = p_user_id
  );
$$;

grant execute on function public.shares_league(uuid) to authenticated;

create policy "leagues_select_member" on public.leagues
  for select using (public.is_league_member(id));

create policy "leagues_update_owner" on public.leagues
  for update using (owner_id = auth.uid());

create policy "leagues_delete_owner" on public.leagues
  for delete using (owner_id = auth.uid());

create policy "league_members_select" on public.league_members
  for select using (public.is_league_member(league_id));

create policy "league_members_delete_self" on public.league_members
  for delete using (user_id = auth.uid());

-- Crear una liga: genera un código de invitación único y suma al creador como miembro.
create or replace function public.create_league(p_name text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league public.leagues;
  new_code text;
begin
  if length(trim(p_name)) = 0 then
    raise exception 'El nombre de la liga no puede estar vacío';
  end if;

  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.leagues where code = new_code);
  end loop;

  insert into public.leagues (name, code, owner_id)
  values (trim(p_name), new_code, auth.uid())
  returning * into new_league;

  insert into public.league_members (league_id, user_id) values (new_league.id, auth.uid());

  return new_league;
end;
$$;

grant execute on function public.create_league(text) to authenticated;

-- Unirse a una liga existente mediante su código de invitación.
create or replace function public.join_league(p_code text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  found_league public.leagues;
begin
  select * into found_league from public.leagues where code = upper(trim(p_code));

  if not found then
    raise exception 'El código de liga ingresado no existe';
  end if;

  insert into public.league_members (league_id, user_id)
  values (found_league.id, auth.uid())
  on conflict do nothing;

  return found_league;
end;
$$;

grant execute on function public.join_league(text) to authenticated;

-- ---------------------------------------------------------
-- PRONÓSTICOS DE PARTIDOS
-- Un pronóstico por usuario y partido, compartido por todas sus ligas.
-- ---------------------------------------------------------
create table public.predictions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id integer not null references public.matches (id) on delete cascade,
  home_score smallint not null check (home_score between 0 and 99),
  away_score smallint not null check (away_score between 0 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.predictions enable row level security;

-- Se puede ver el propio pronóstico siempre. El de otros usuarios solo
-- una vez que el partido arrancó y compartiendo al menos una liga.
create policy "predictions_select" on public.predictions
  for select using (
    user_id = auth.uid()
    or (
      public.shares_league(user_id)
      and exists (
        select 1 from public.matches m
        where m.id = match_id and m.kickoff_at <= now()
      )
    )
  );

create policy "predictions_insert" on public.predictions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and now() < m.kickoff_at - interval '60 minutes'
    )
  );

create policy "predictions_update" on public.predictions
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and now() < m.kickoff_at - interval '60 minutes'
    )
  );

-- ---------------------------------------------------------
-- PRONÓSTICOS ESPECIALES (campeón, subcampeón, goleador/Balón de Oro)
-- ---------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true,
  special_predictions_lock_at timestamptz not null,
  champion_team_id smallint references public.teams (id),
  runner_up_team_id smallint references public.teams (id),
  top_scorer text,
  constraint app_settings_single_row check (id)
);

alter table public.app_settings enable row level security;

create policy "app_settings_select_all" on public.app_settings
  for select using (true);

create policy "app_settings_admin_write" on public.app_settings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- Por defecto, los pronósticos especiales cierran con el partido inaugural
-- (México vs. Sudáfrica, partido #1 del fixture).
insert into public.app_settings (id, special_predictions_lock_at)
values (true, '2026-06-11T13:00:00+00');

create table public.special_predictions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  champion_team_id smallint references public.teams (id),
  runner_up_team_id smallint references public.teams (id),
  top_scorer text,
  updated_at timestamptz not null default now()
);

alter table public.special_predictions enable row level security;

create policy "special_predictions_select" on public.special_predictions
  for select using (
    user_id = auth.uid()
    or (
      public.shares_league(user_id)
      and now() >= (select special_predictions_lock_at from public.app_settings limit 1)
    )
  );

create policy "special_predictions_insert" on public.special_predictions
  for insert with check (
    user_id = auth.uid()
    and now() < (select special_predictions_lock_at from public.app_settings limit 1)
  );

create policy "special_predictions_update" on public.special_predictions
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and now() < (select special_predictions_lock_at from public.app_settings limit 1)
  );

-- ---------------------------------------------------------
-- VISTAS DE PUNTAJE
-- security_invoker = true: las vistas respetan las políticas RLS del
-- usuario que consulta, no las del dueño de la vista.
-- ---------------------------------------------------------

-- Puntos por pronóstico de partido:
--   5 puntos: resultado exacto
--   2 puntos: acierta el signo (1X2) sin acertar el marcador
--   0 puntos: no acierta
--   null: el partido todavía no terminó
create view public.prediction_points
with (security_invoker = true)
as
select
  p.user_id,
  p.match_id,
  m.phase,
  m.group_letter,
  m.kickoff_at,
  case
    when m.status = 'finished' and p.home_score = m.home_score and p.away_score = m.away_score then 5
    when m.status = 'finished' and sign((p.home_score - p.away_score)::int) = sign((m.home_score - m.away_score)::int) then 2
    when m.status = 'finished' then 0
    else null
  end as points,
  (m.status = 'finished' and p.home_score = m.home_score and p.away_score = m.away_score) as is_exact,
  (m.status = 'finished' and sign((p.home_score - p.away_score)::int) = sign((m.home_score - m.away_score)::int)) as is_hit
from public.predictions p
join public.matches m on m.id = p.match_id;

-- Puntaje total por usuario: partidos + pronósticos especiales.
--   Campeón acertado: 20 puntos
--   Subcampeón acertado: 10 puntos
--   Goleador / Balón de Oro acertado: 10 puntos
create view public.user_totals
with (security_invoker = true)
as
select
  pr.id as user_id,
  pr.username,
  coalesce(mp.match_points, 0)::int as match_points,
  coalesce(mp.exact_count, 0)::int as exact_count,
  coalesce(mp.hit_count, 0)::int as hit_count,
  coalesce(sp.special_points, 0)::int as special_points,
  coalesce(sp.champion_hit, false) as champion_hit,
  coalesce(mp.match_points, 0)::int + coalesce(sp.special_points, 0)::int as total_points
from public.profiles pr
left join (
  select
    user_id,
    sum(points) as match_points,
    count(*) filter (where is_exact) as exact_count,
    count(*) filter (where is_hit) as hit_count
  from public.prediction_points
  where points is not null
  group by user_id
) mp on mp.user_id = pr.id
left join (
  select
    sp.user_id,
    (case when s.champion_team_id is not null and sp.champion_team_id = s.champion_team_id then 20 else 0 end)
    + (case when s.runner_up_team_id is not null and sp.runner_up_team_id = s.runner_up_team_id then 10 else 0 end)
    + (case when s.top_scorer is not null and sp.top_scorer is not null
            and lower(trim(sp.top_scorer)) = lower(trim(s.top_scorer)) then 10 else 0 end) as special_points,
    (s.champion_team_id is not null and sp.champion_team_id = s.champion_team_id) as champion_hit
  from public.special_predictions sp
  cross join public.app_settings s
) sp on sp.user_id = pr.id;

-- ---------------------------------------------------------
-- Convertir tu usuario en administrador (puede cargar resultados y
-- editar el fixture). Reemplazá el email por el tuyo y ejecutá esto
-- DESPUÉS de haberte registrado en la app:
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'tu@email.com');
-- ---------------------------------------------------------
