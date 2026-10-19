-- 0001_schema.sql: tables, triggers, functions and RLS. Run once in the Supabase SQL editor.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now());
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  slug text not null unique,
  created_at timestamptz not null default now());
create unique index categories_name_ci on public.categories (lower(name));
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = lower(name)),
  slug text not null unique);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  channel_name text not null check (length(channel_name) between 1 and 60),
  channel_slug text not null,
  description text not null default '' check (length(description) <= 2000),
  video_key text not null unique check (video_key ~ '^videos/[0-9a-f-]{36}\.(mp4|webm)$'),
  video_bytes bigint,
  duration_seconds int,
  thumbnail_key text not null check (thumbnail_key ~ '^thumbs/[0-9a-f-]{36}\.webp$'),
  is_popular boolean not null default false,
  popular_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users on delete set null);
create table public.video_tags (
  video_id uuid references public.videos on delete cascade,
  tag_id uuid references public.tags on delete cascade,
  primary key (video_id, tag_id));
create table public.video_categories (
  video_id uuid references public.videos on delete cascade,
  category_id uuid references public.categories on delete cascade,
  primary key (video_id, category_id));
create index on public.video_tags (tag_id);
create index on public.video_categories (category_id);
create index videos_title_trgm on public.videos using gin (title gin_trgm_ops);
create index videos_channel_trgm on public.videos using gin (channel_name gin_trgm_ops);
create index videos_desc_trgm on public.videos using gin (description gin_trgm_ops);
create index tags_name_trgm on public.tags using gin (name gin_trgm_ops);
create index categories_name_trgm on public.categories using gin (name gin_trgm_ops);
create index on public.videos (created_at desc, id);
create index on public.videos (is_popular, popular_at desc);
create index on public.videos (channel_slug);

-- Helpers
create function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active) $$;
create function public.is_member() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active) $$;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger videos_touch before update on public.videos
  for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer
set search_path = public as $$
begin insert into profiles (id, email) values (new.id, new.email) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The last active admin can never be deleted, disabled or demoted.
create function public.protect_last_admin() returns trigger language plpgsql as $$
begin
  if old.role = 'admin' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.is_active)
     and (select count(*) from profiles where role = 'admin' and is_active and id <> old.id) = 0 then
    raise exception 'The last active administrator cannot be removed or disabled.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger profiles_protect_admin before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- Video writes (single transaction; 5 to 10 tags enforced here as well as in UI and zod)
create function public._link_video(p_id uuid, p jsonb) returns void language plpgsql as $$
declare t text; tid uuid;
begin
  delete from video_tags where video_id = p_id;
  for t in select distinct lower(trim(x)) from jsonb_array_elements_text(coalesce(p->'tags','[]'::jsonb)) x loop
    insert into tags (name, slug) values (t, regexp_replace(t, '\s+', '-', 'g'))
      on conflict (name) do update set name = excluded.name returning id into tid;
    insert into video_tags values (p_id, tid);
  end loop;
  if (select count(*) from video_tags where video_id = p_id) not between 5 and 10 then
    raise exception 'A video needs 5 to 10 distinct tags.'; end if;
  delete from video_categories where video_id = p_id;
  insert into video_categories select p_id, (c)::uuid
    from jsonb_array_elements_text(coalesce(p->'category_ids','[]'::jsonb)) c;
end $$;

create function public.create_video(p jsonb) returns uuid language plpgsql as $$
declare v uuid; pop boolean := coalesce((p->>'is_popular')::boolean, false);
begin
  if not is_admin() then raise exception 'Not allowed.'; end if;
  insert into videos (title, channel_name, channel_slug, description, video_key, video_bytes,
      duration_seconds, thumbnail_key, is_popular, popular_at, created_by)
  values (p->>'title', p->>'channel_name', p->>'channel_slug', coalesce(p->>'description',''),
      p->>'video_key', (p->>'video_bytes')::bigint, (p->>'duration_seconds')::int,
      p->>'thumbnail_key', pop, case when pop then now() end, auth.uid())
  returning id into v;
  perform _link_video(v, p);
  return v;
end $$;

-- Returns the OLD keys so the server can delete replaced files after a successful save.
create function public.update_video(p jsonb, p_expected timestamptz)
returns table (old_video_key text, old_thumbnail_key text) language plpgsql as $$
declare o videos; pid uuid := (p->>'id')::uuid; pop boolean := coalesce((p->>'is_popular')::boolean, false);
begin
  if not is_admin() then raise exception 'Not allowed.'; end if;
  select * into o from videos where id = pid for update;
  if not found then raise exception 'Video not found.'; end if;
  if o.updated_at <> p_expected then raise exception 'This video was changed by someone else. Reload.'; end if;
  update videos set title = p->>'title', channel_name = p->>'channel_name',
    channel_slug = p->>'channel_slug', description = coalesce(p->>'description',''),
    video_key = p->>'video_key', video_bytes = (p->>'video_bytes')::bigint,
    duration_seconds = (p->>'duration_seconds')::int, thumbnail_key = p->>'thumbnail_key',
    is_popular = pop,
    popular_at = case when pop and not o.is_popular then now() when pop then o.popular_at end
  where id = pid;
  perform _link_video(pid, p);
  return query select o.video_key, o.thumbnail_key;
end $$;

create function public.delete_video(p_id uuid) returns table (video_key text, thumbnail_key text)
language plpgsql as $$
begin
  if not is_admin() then raise exception 'Not allowed.'; end if;
  return query delete from videos where id = p_id returning videos.video_key, videos.thumbnail_key;
end $$;

create function public.set_video_popular(p_id uuid, p_value boolean) returns void language plpgsql as $$
begin
  if not is_admin() then raise exception 'Not allowed.'; end if;
  update videos set is_popular = p_value, popular_at = case when p_value then now() end where id = p_id;
end $$;

create function public.delete_category(p_id uuid, p_reassign_to uuid default null) returns void
language plpgsql as $$
begin
  if not is_admin() then raise exception 'Not allowed.'; end if;
  if p_reassign_to is not null then
    insert into video_categories select video_id, p_reassign_to from video_categories
      where category_id = p_id on conflict do nothing;
  end if;
  delete from categories where id = p_id;
end $$;

create function public.list_tags_with_counts() returns table (name text, slug text, video_count bigint)
language sql stable as $$
  select t.name, t.slug, count(vt.video_id) from tags t join video_tags vt on vt.tag_id = t.id
  group by t.id order by t.name $$;
create function public.list_categories_with_counts() returns table (id uuid, name text, slug text, video_count bigint)
language sql stable as $$
  select c.id, c.name, c.slug, count(vc.video_id) from categories c
  left join video_categories vc on vc.category_id = c.id group by c.id order by c.name $$;

-- Search: every word must match somewhere. Scores: title 5, tag 4, channel 3, category 2, description 1.
-- pat is an escaped ILIKE pattern (backslash is ILIKE's default escape character).
create function public.video_word_score(v public.videos, pat text) returns int language sql stable as $$
  select (case when v.title ilike pat then 5 else 0 end)
    + (case when exists (select 1 from video_tags vt join tags t on t.id = vt.tag_id
         where vt.video_id = v.id and t.name ilike pat) then 4 else 0 end)
    + (case when v.channel_name ilike pat then 3 else 0 end)
    + (case when exists (select 1 from video_categories vc join categories c on c.id = vc.category_id
         where vc.video_id = v.id and c.name ilike pat) then 2 else 0 end)
    + (case when v.description ilike pat then 1 else 0 end) $$;

create function public.search_videos(p_q text, p_sort text default 'relevance',
  p_limit int default 24, p_offset int default 0) returns setof public.videos language sql stable as $$
  with w as (
    select '%' || replace(replace(replace(x, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
    from unnest(regexp_split_to_array(trim(p_q), '\s+')) x where x <> '')
  select v.* from videos v
  where exists (select 1 from w)
    and not exists (select 1 from w where video_word_score(v, w.pat) = 0)
  order by case when p_sort = 'newest' then 0
                else (select sum(video_word_score(v, w.pat)) from w) end desc,
           v.created_at desc
  limit p_limit offset p_offset $$;

-- Similar videos: shared tags first, then popular filler up to p_min. No self, no duplicates.
create function public.similar_videos(p_video_id uuid, p_min int default 10, p_max int default 20)
returns table (id uuid, match_type text) language sql stable as $$
  with tagged as (
    select v.id, row_number() over (order by count(*) desc, v.is_popular desc, v.created_at desc) rn
    from videos v join video_tags vt on vt.video_id = v.id
    where v.id <> p_video_id
      and vt.tag_id in (select tag_id from video_tags where video_id = p_video_id)
    group by v.id),
  t as (select * from tagged order by rn limit p_max),
  filler as (
    select v.id, 1000 + row_number() over
      (order by v.is_popular desc, v.popular_at desc nulls last, v.created_at desc) rn
    from videos v where v.id <> p_video_id and v.id not in (select t.id from t)
    order by rn limit greatest(least(p_min, p_max) - (select count(*) from t), 0)),
  u as (select t.id, 'tags'::text mt, t.rn from t union all select f.id, 'popular', f.rn from filler f)
  select u.id, u.mt from u order by u.rn $$;

-- Row Level Security: active members read content, only admins write, anon gets nothing.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.videos enable row level security;
alter table public.video_tags enable row level security;
alter table public.video_categories enable row level security;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or is_admin());
do $$ declare t text; begin
  foreach t in array array['categories','tags','videos','video_tags','video_categories'] loop
    execute format('create policy %I_read on public.%I for select to authenticated using (is_member())', t, t);
    execute format('create policy %I_write on public.%I for all to authenticated using (is_admin()) with check (is_admin())', t, t);
  end loop; end $$;
