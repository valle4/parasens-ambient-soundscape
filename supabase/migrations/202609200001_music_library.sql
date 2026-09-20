-- The public catalogue is readable; drafts, imports and administration are private.
create table public.music_admins (
  email text primary key check (email = lower(trim(email)) and email like '%@%'),
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);
insert into public.music_admins(email, role) values ('hello@parasens.com', 'owner');

create function public.music_admin_role() returns text
language sql stable security definer set search_path = '' as $$
  select a.role from public.music_admins a join auth.users u on lower(u.email) = a.email
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;
revoke all on function public.music_admin_role() from public, anon, authenticated;
grant execute on function public.music_admin_role() to anon, authenticated;
alter table public.music_admins enable row level security;
create policy music_owner_read on public.music_admins for select to authenticated using ((select public.music_admin_role()) = 'owner');
grant select on public.music_admins to authenticated;

create table public.music_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  parent_id uuid references public.music_categories(id) on delete restrict,
  position integer not null default 0,
  check (parent_id is distinct from id)
);
create unique index music_category_name on public.music_categories(coalesce(parent_id::text, ''), lower(trim(name)));
create function public.music_category_depth() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null and (exists(select 1 from public.music_categories where id = new.parent_id and parent_id is not null)
    or exists(select 1 from public.music_categories where parent_id = new.id)) then
    raise exception 'A subgenre must belong directly to a genre.';
  end if;
  return new;
end $$;
create trigger music_category_depth before insert or update on public.music_categories for each row execute function public.music_category_depth();

create table public.music_tracks (
  id text primary key check (id ~ '^[A-Za-z0-9]{22}$'),
  title text not null check (length(trim(title)) between 1 and 500),
  artist text not null check (length(trim(artist)) between 1 and 1000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index music_track_status on public.music_tracks(status);
create table public.music_track_categories (
  track_id text not null references public.music_tracks(id) on delete cascade,
  category_id uuid not null references public.music_categories(id) on delete restrict,
  primary key (track_id, category_id)
);
create index music_tag_category on public.music_track_categories(category_id);
create table public.music_orders (
  scope text not null,
  track_id text not null references public.music_tracks(id) on delete cascade,
  position integer not null,
  primary key (scope, track_id)
);
create table public.music_playlists (
  id text primary key check (id ~ '^[A-Za-z0-9]{22}$'),
  name text not null,
  imported_at timestamptz not null default now(),
  added_count integer not null default 0
);
create table public.music_playlist_tracks (
  playlist_id text not null references public.music_playlists(id) on delete cascade,
  track_id text not null references public.music_tracks(id) on delete cascade,
  primary key (playlist_id, track_id)
);

alter table public.music_categories enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_track_categories enable row level security;
alter table public.music_orders enable row level security;
alter table public.music_playlists enable row level security;
alter table public.music_playlist_tracks enable row level security;
create policy music_categories_read on public.music_categories for select to anon, authenticated using (true);
create policy music_tracks_read on public.music_tracks for select to anon, authenticated using (status = 'published' or (select public.music_admin_role()) is not null);
create policy music_tags_read on public.music_track_categories for select to anon, authenticated using (exists(select 1 from public.music_tracks t where t.id = track_id));
create policy music_orders_read on public.music_orders for select to anon, authenticated using (exists(select 1 from public.music_tracks t where t.id = track_id));
create policy music_playlists_read on public.music_playlists for select to authenticated using ((select public.music_admin_role()) is not null);
create policy music_playlist_tracks_read on public.music_playlist_tracks for select to authenticated using ((select public.music_admin_role()) is not null);
revoke all on public.music_admins, public.music_categories, public.music_tracks, public.music_track_categories, public.music_orders, public.music_playlists, public.music_playlist_tracks from anon, authenticated;
grant select on public.music_admins to authenticated;
grant select on public.music_categories, public.music_tracks, public.music_track_categories, public.music_orders to anon, authenticated;
grant select on public.music_playlists, public.music_playlist_tracks to authenticated;
-- All writes go through checked, atomic functions, never browser-side role checks.


create function public.music_require_admin() returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.music_admin_role() is null then raise exception 'Administrator access required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(20920001);
end $$;
revoke all on function public.music_require_admin() from public, anon, authenticated;

create function public.music_import_playlist(p_id text, p_name text, p_tracks jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare added integer; total integer;
begin
  perform public.music_require_admin();
  if jsonb_typeof(p_tracks) <> 'array' or jsonb_array_length(p_tracks) > 10000 then raise exception 'Invalid playlist'; end if;
  insert into public.music_playlists(id, name) values (p_id, left(p_name,500)) on conflict(id) do update set name = excluded.name, imported_at = now();
  -- This is deliberately DO NOTHING. Existing metadata, tags, state and order survive every import.
  insert into public.music_tracks(id, title, artist)
    select distinct on (x.id) x.id, x.title, x.artist from jsonb_to_recordset(p_tracks) as x(id text, title text, artist text)
    on conflict(id) do nothing;
  get diagnostics added = row_count;
  insert into public.music_playlist_tracks(playlist_id, track_id)
    select p_id, x.id from jsonb_to_recordset(p_tracks) as x(id text) on conflict do nothing;
  select count(distinct x.id) into total from jsonb_to_recordset(p_tracks) as x(id text);
  update public.music_playlists set added_count = added where id = p_id;
  return jsonb_build_object('added', added, 'existing', total - added);
end $$;

create function public.music_set_status(p_ids text[], p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.music_require_admin();
  if p_status not in ('draft','published','archived') then raise exception 'Invalid status'; end if;
  if p_status = 'published' and exists(select 1 from public.music_tracks t where t.id = any(p_ids)
    and not exists(select 1 from public.music_track_categories tc where tc.track_id = t.id)) then
    raise exception 'Tag every selected song before publishing.';
  end if;
  -- Republished songs are appended to each view, while imports never touch existing order.
  delete from public.music_orders o using public.music_tracks t where o.track_id = t.id and t.id = any(p_ids) and t.status <> 'published' and p_status = 'published';
  update public.music_tracks set published_at = case when p_status = 'published' and status <> 'published' then clock_timestamp() else published_at end,
    status = p_status where id = any(p_ids);
end $$;

create function public.music_tag_tracks(p_ids text[], p_categories uuid[], p_mode text default 'add') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.music_require_admin();
  if p_mode not in ('add','replace','remove') then raise exception 'Invalid tagging mode'; end if;
  if p_mode = 'replace' then delete from public.music_track_categories where track_id = any(p_ids); end if;
  if p_mode = 'remove' then
    delete from public.music_track_categories where track_id = any(p_ids) and category_id = any(p_categories);
  else
    insert into public.music_track_categories(track_id,category_id) select t.id, c.id from public.music_tracks t cross join unnest(p_categories) c(id) where t.id = any(p_ids) on conflict do nothing;
  end if;
  if exists(select 1 from public.music_tracks t where t.id = any(p_ids) and t.status = 'published'
    and not exists(select 1 from public.music_track_categories tc where tc.track_id = t.id)) then raise exception 'Published songs must have at least one genre.'; end if;
end $$;

create function public.music_save_category(p_name text, p_parent uuid default null, p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform public.music_require_admin();
  if p_id is null then
    insert into public.music_categories(name,parent_id,position) values(trim(p_name),p_parent,(select coalesce(max(position),0)+1 from public.music_categories)) returning id into result;
  else
    update public.music_categories set name=trim(p_name),parent_id=p_parent where id=p_id returning id into result;
    if result is null then raise exception 'Category no longer exists'; end if;
  end if;
  return result;
end $$;

create function public.music_move_track(p_id text, p_scope text, p_position integer) returns void
language plpgsql security definer set search_path = '' as $$
declare ids text[]; others text[]; target integer;
begin
  perform public.music_require_admin();
  select array_agg(t.id order by o.position nulls last, t.published_at, t.id) into ids
  from public.music_tracks t left join public.music_orders o on o.track_id=t.id and o.scope=p_scope
  where t.status='published' and (p_scope='all' or exists(
    select 1 from public.music_track_categories tc join public.music_categories c on c.id=tc.category_id
    where tc.track_id=t.id and (c.id::text=p_scope or c.parent_id::text=p_scope)));
  if ids is null or not(p_id=any(ids)) then raise exception 'Song is no longer published in this view. Refresh and try again.'; end if;
  target := greatest(1,least(coalesce(p_position,1),cardinality(ids)));
  others := array_remove(ids,p_id);
  ids := coalesce(others[1:target-1],array[]::text[]) || array[p_id] || coalesce(others[target:cardinality(others)],array[]::text[]);
  delete from public.music_orders where scope=p_scope;
  insert into public.music_orders(scope,track_id,position) select p_scope,id,ordinality from unnest(ids) with ordinality as x(id,ordinality);
end $$;

create function public.music_manage_admin(p_email text, p_remove boolean default false) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
  perform public.music_require_admin();
  if public.music_admin_role() <> 'owner' then raise exception 'Only the owner can invite or remove administrators' using errcode='42501'; end if;
  if exists(select 1 from public.music_admins where email=lower(trim(p_email)) and role='owner') then raise exception 'The owner cannot be changed here'; end if;
  if p_remove then delete from public.music_admins where email=lower(trim(p_email)) returning true into changed;
  else insert into public.music_admins(email) values(lower(trim(p_email))) on conflict do nothing returning true into changed; end if;
  return coalesce(changed, false);
end $$;

revoke all on function public.music_import_playlist(text,text,jsonb), public.music_set_status(text[],text), public.music_tag_tracks(text[],uuid[],text), public.music_save_category(text,uuid,uuid), public.music_move_track(text,text,integer), public.music_manage_admin(text,boolean) from public, anon, authenticated;
grant execute on function public.music_import_playlist(text,text,jsonb), public.music_set_status(text[],text), public.music_tag_tracks(text[],uuid[],text), public.music_save_category(text,uuid,uuid), public.music_move_track(text,text,integer), public.music_manage_admin(text,boolean) to authenticated;
