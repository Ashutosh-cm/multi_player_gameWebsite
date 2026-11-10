-- CloudArcade schema. Apply once through Supabase migrations or SQL Editor.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
 display_name text not null check (char_length(trim(display_name)) between 2 and 40),
 avatar_url text, created_at timestamptz not null default now()
);
create table public.games (
 id text primary key check (id in ('snake','2048','shooter')), title text not null,
 description text not null, category text not null, thumbnail_url text,
 is_active boolean not null default true
);
create table public.game_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 game_id text not null references public.games(id), started_at timestamptz not null default now(),
 ended_at timestamptz, status text not null default 'started' check(status in ('started','completed','abandoned')),
 final_score integer not null default 0 check(final_score between 0 and 10000000),
 max_tile integer not null default 0,
 check ((status='completed' and ended_at is not null) or status<>'completed')
);
create index sessions_user_time on public.game_sessions(user_id,started_at desc);
create index sessions_leaderboard on public.game_sessions(game_id,final_score desc) where status='completed';
create table public.achievements (id text primary key,name text not null,description text not null,game_id text references public.games(id));
create table public.user_achievements (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 achievement_id text not null references public.achievements(id),unlocked_at timestamptz not null default now(), unique(user_id,achievement_id)
);
create table public.saved_progress (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 game_id text not null references public.games(id) check(game_id='2048'),state_data jsonb not null check(octet_length(state_data::text)<16384),
 updated_at timestamptz not null default now(),unique(user_id,game_id)
);
create table public.admin_activity (id bigint generated always as identity primary key,actor_id uuid,game_id text,action text,created_at timestamptz not null default now());
insert into public.games(id,title,description,category) values
 ('snake','Neon Snake','Collect food and avoid collisions.','Arcade'),('2048','2048','Merge matching tiles to reach 2048.','Puzzle'),('shooter','Space Shooter','Survive sixty seconds in space.','Action');
insert into public.achievements(id,name,description,game_id) values
 ('first','First Flight','Complete your first game',null),('hundred','Triple Digits','Score 100 points',null),
 ('five','Getting Warm','Complete five games',null),('best','Personal Best','Beat a previous high score',null),
 ('puzzle','Puzzle Master','Create a 2048 tile','2048'),('space','Space Explorer','Score 500 in Space Shooter','shooter');
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare uname text; dname text;
begin
 uname:=coalesce(new.raw_user_meta_data->>'username','player_'||substr(replace(new.id::text,'-',''),1,16));
 dname:=coalesce(new.raw_user_meta_data->>'display_name','Player');
 insert into public.profiles(id,username,display_name) values(new.id,uname,dname);
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.is_admin() returns boolean language sql stable set search_path='' as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false);
$$;
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.saved_progress enable row level security;
alter table public.admin_activity enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy games_read on public.games for select to anon,authenticated using(true);
create policy games_admin on public.games for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy sessions_read on public.game_sessions for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy achievements_read on public.achievements for select to anon,authenticated using(true);
create policy unlocked_read on public.user_achievements for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy progress_read on public.saved_progress for select to authenticated using(user_id=auth.uid());
create policy progress_insert on public.saved_progress for insert to authenticated with check(user_id=auth.uid());
create policy progress_update on public.saved_progress for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy progress_delete on public.saved_progress for delete to authenticated using(user_id=auth.uid());
create policy audit_read on public.admin_activity for select to authenticated using(public.is_admin());
-- Explicit grants: browsers cannot insert sessions or unlock achievements.
revoke all on public.profiles,public.games,public.game_sessions,public.achievements,public.user_achievements,public.saved_progress,public.admin_activity from anon,authenticated;
grant select on public.games,public.achievements to anon,authenticated;
grant select on public.profiles,public.game_sessions,public.user_achievements,public.admin_activity to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
grant update(is_active) on public.games to authenticated;
grant select,insert,update,delete on public.saved_progress to authenticated;
create function public.audit_game_change() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.admin_activity(actor_id,game_id,action) values(auth.uid(),new.id,case when new.is_active then 'enabled' else 'disabled' end);return new;end; $$;
create trigger game_catalog_audit after update of is_active on public.games for each row execute function public.audit_game_change();
-- Only the Edge Function service role may execute these two operations.
create function public.start_game(p_user uuid,p_game text) returns public.game_sessions language plpgsql security definer set search_path='' as $$
declare result public.game_sessions;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from public.games where id=p_game and is_active) then raise exception 'Game is unavailable';end if;
 if (select count(*) from public.game_sessions where user_id=p_user and started_at>now()-interval '1 minute')>=12 then raise exception 'Too many starts. Please wait a minute.';end if;
 update public.game_sessions set status='abandoned' where user_id=p_user and game_id=p_game and status='started';
 insert into public.game_sessions(user_id,game_id) values(p_user,p_game) returning * into result;
 return result;
end; $$;
create function public.complete_game(p_user uuid,p_session uuid,p_score integer,p_max_tile integer default 0) returns public.game_sessions language plpgsql security definer set search_path='' as $$
declare s public.game_sessions; previous_best integer; played integer; elapsed numeric; award text[]:=array['first'];
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into s from public.game_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Session not found';end if;
 if s.status='completed' then return s;end if;
 if s.status<>'started' then raise exception 'Session is no longer active';end if;
 elapsed:=extract(epoch from now()-s.started_at);
 if elapsed>86400 then raise exception 'Session expired; start a new game';end if;
 if p_score is null or p_score<0 or p_score>10000000 then raise exception 'Invalid score';end if;
 if s.game_id='snake' and (p_score%10<>0 or p_score>3970 or p_score>ceil(elapsed*8)*10) then raise exception 'Invalid Snake score';end if;
 if s.game_id='shooter' and (p_score%25<>0 or p_score>2150 or p_score>floor(elapsed/.7)*25) then raise exception 'Invalid shooter score';end if;
 if s.game_id='2048' and (p_score%4<>0 or p_max_tile is null or p_max_tile<2 or p_max_tile>131072 or (p_max_tile & (p_max_tile-1))<>0) then raise exception 'Invalid puzzle result';end if;
 select max(final_score),count(*) into previous_best,played from public.game_sessions where user_id=p_user and game_id=s.game_id and status='completed';
 if played>0 and p_score>previous_best then award:=array_append(award,'best');end if;
 if p_score>=100 then award:=array_append(award,'hundred');end if;
 if (select count(*) from public.game_sessions where user_id=p_user and status='completed')>=4 then award:=array_append(award,'five');end if;
 if s.game_id='2048' and p_max_tile>=2048 then award:=array_append(award,'puzzle');end if;
 if s.game_id='shooter' and p_score>=500 then award:=array_append(award,'space');end if;
 update public.game_sessions set status='completed',ended_at=now(),final_score=p_score,max_tile=case when s.game_id='2048' then p_max_tile else 0 end where id=s.id returning * into s;
 insert into public.user_achievements(user_id,achievement_id) select p_user,unnest(award) on conflict(user_id,achievement_id) do nothing;
 return s;
end; $$;
revoke all on function public.start_game(uuid,text),public.complete_game(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.start_game(uuid,text),public.complete_game(uuid,uuid,integer,integer) to service_role;
create function public.get_leaderboard(p_game text default null,p_weekly boolean default false)
returns table(user_id uuid,display_name text,score bigint,games_ranked bigint)
language sql stable security definer set search_path='' as $$
 with best as (select s.user_id,s.game_id,max(s.final_score) points from public.game_sessions s
 where s.status='completed' and (p_game is null or s.game_id=p_game) and (not p_weekly or s.ended_at>=now()-interval '7 days') group by s.user_id,s.game_id)
 select p.id,p.display_name,sum(best.points)::bigint,count(*) from best join public.profiles p on p.id=best.user_id
 group by p.id,p.display_name order by sum(best.points) desc,p.id limit 100;
$$;
revoke all on function public.get_leaderboard(text,boolean) from public;
grant execute on function public.get_leaderboard(text,boolean) to anon,authenticated;
create function public.get_personal_rank(p_game text default null,p_weekly boolean default false)
returns table("position" bigint,score bigint)
language sql stable security definer set search_path='' as $$
 with best as (select s.user_id,s.game_id,max(s.final_score) points from public.game_sessions s
 where s.status='completed' and (p_game is null or s.game_id=p_game) and (not p_weekly or s.ended_at>=now()-interval '7 days') group by s.user_id,s.game_id),
 totals as (select user_id,sum(points)::bigint total from best group by user_id),
 ranked as (select user_id,row_number() over(order by total desc,user_id) as "position",total from totals)
 select ranked."position",total from ranked where user_id=auth.uid();
$$;
revoke all on function public.get_personal_rank(text,boolean) from public,anon;
grant execute on function public.get_personal_rank(text,boolean) to authenticated;
create function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return jsonb_build_object('users',(select count(*) from public.profiles),'sessions',(select count(*) from public.game_sessions where status='completed'),
 'popular',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select game_id,count(*) sessions from public.game_sessions where status='completed' group by game_id order by count(*) desc)t),
 'recent',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select s.id,p.display_name,s.game_id,s.final_score,s.ended_at from public.game_sessions s join public.profiles p on p.id=s.user_id where s.status='completed' order by s.ended_at desc limit 20)t));
end; $$;
revoke all on function public.admin_stats() from public,anon;
grant execute on function public.admin_stats() to authenticated;
revoke all on function public.handle_new_user(),public.audit_game_change() from public,anon,authenticated;
