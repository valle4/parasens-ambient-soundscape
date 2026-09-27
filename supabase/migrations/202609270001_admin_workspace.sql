-- Private artist workspace. All writes use checked RPCs; website publishing stays separate.
begin;
create table public.portal_accounts (
  email text primary key check(email=lower(trim(email)) and email like '%@%'),
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null default '',
  invited_at timestamptz,
  invitation_status text not null default 'existing' check(invitation_status in ('existing','pending','sent','failed','uncertain')),
  created_at timestamptz not null default now()
);
insert into public.portal_accounts(email,user_id) select lower(email),id from auth.users where email is not null;
create function public.portal_sync_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.email is not null then
    update public.portal_accounts set email=lower(new.email) where user_id=new.id and email<>lower(new.email);
    insert into public.portal_accounts(email,user_id) values(lower(new.email),new.id)
      on conflict(email) do update set user_id=excluded.user_id;
  end if;
  return new;
end $$;
create trigger portal_sync_account after insert or update of email on auth.users for each row execute function public.portal_sync_account();
create table public.portal_labels(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120));
create unique index portal_label_name on public.portal_labels(lower(trim(name)));
create table public.portal_artists(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 label_id uuid references public.portal_labels(id), created_at timestamptz not null default now()
);
create unique index portal_artist_name on public.portal_artists(lower(trim(name)));
create table public.portal_artist_members(
 artist_id uuid references public.portal_artists(id) on delete cascade,
 account_email text references public.portal_accounts(email) on update cascade on delete cascade,
 primary key(artist_id,account_email)
);
create index portal_member_email on public.portal_artist_members(account_email);
create table public.portal_artist_genres(
 artist_id uuid references public.portal_artists(id) on delete cascade,
 category_id uuid references public.music_categories(id) on delete restrict,
 primary key(artist_id,category_id)
);
create function public.portal_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null
$$;
create function public.portal_has_artist(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.music_admin_role() is not null or exists(select 1 from public.portal_artist_members where artist_id=p_id and account_email=public.portal_email())
$$;
create table public.portal_releases(
 id uuid primary key default gen_random_uuid(), artist_id uuid references public.portal_artists(id),
 suggested_artist text not null default '' check(length(suggested_artist)<=120),
 created_by uuid not null references auth.users(id),
 title text not null default 'Untitled release',
 status text not null default 'draft' check(status in ('draft','new','in_review','accepted','declined','delivered')),
 awaiting_changes boolean not null default false,
 content jsonb not null default '{}'::jsonb check(octet_length(content::text)<=262144),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), submitted_at timestamptz,
 check(not awaiting_changes or status='in_review')
);
create index portal_release_queue on public.portal_releases(status,updated_at desc);
create index portal_release_artist on public.portal_releases(artist_id);
create function public.portal_can_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_releases r where r.id=p_id and public.portal_email() is not null and
   (public.music_admin_role() is not null or (r.artist_id is not null and public.portal_has_artist(r.artist_id)) or (r.artist_id is null and r.created_by=auth.uid())))
$$;
create function public.portal_can_edit(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.portal_can_read(p_id) and exists(select 1 from public.portal_releases r where r.id=p_id and (r.status='draft' or (r.status='in_review' and r.awaiting_changes)))
$$;
create table public.portal_files(
 id uuid primary key default gen_random_uuid(), release_id uuid not null references public.portal_releases(id) on delete cascade,
 track_id text, kind text not null check(kind in ('stereo','stems','artwork')),
 name text not null check(length(name) between 1 and 255), path text not null unique,
 size bigint not null check(size>0 and size<=524288000), mime text not null,
 uploaded boolean not null default false, created_at timestamptz not null default now()
);
create index portal_files_release on public.portal_files(release_id);
create table public.portal_messages(
 id uuid primary key default gen_random_uuid(), release_id uuid not null references public.portal_releases(id) on delete cascade,
 author_id uuid not null references auth.users(id), author_role text not null check(author_role in ('admin','artist')),
 body text not null check(length(trim(body)) between 1 and 10000), created_at timestamptz not null default now()
);
create index portal_messages_release on public.portal_messages(release_id,created_at);
create table public.portal_admin_notes(
 id uuid primary key default gen_random_uuid(), release_id uuid not null references public.portal_releases(id) on delete cascade,
 author_id uuid not null references auth.users(id), body text not null check(length(trim(body)) between 1 and 10000), created_at timestamptz not null default now()
);
create index portal_notes_release on public.portal_admin_notes(release_id,created_at);
create table public.portal_events(
 id uuid primary key, release_id uuid not null references public.portal_releases(id) on delete cascade,
 actor_id uuid not null references auth.users(id), action text not null, message text not null default '', created_at timestamptz not null default now()
);
create index portal_events_release on public.portal_events(release_id,created_at);
create table public.portal_notifications(
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.portal_events(id),
 release_id uuid not null references public.portal_releases(id), recipient text not null, subject text not null, body text not null,
 state text not null default 'pending' check(state in ('pending','sending','sent','failed','uncertain')),
 first_attempt_at timestamptz, claimed_at timestamptz, claim_id uuid, sent_at timestamptz, provider_id text, error text,
 unique(event_id,recipient)
);
create index portal_notifications_release on public.portal_notifications(release_id);

-- Read-only policies, with notes and email recipients restricted to administrators.
alter table public.portal_accounts enable row level security;
alter table public.portal_labels enable row level security;
alter table public.portal_artists enable row level security;
alter table public.portal_artist_members enable row level security;
alter table public.portal_artist_genres enable row level security;
alter table public.portal_releases enable row level security;
alter table public.portal_files enable row level security;
alter table public.portal_messages enable row level security;
alter table public.portal_admin_notes enable row level security;
alter table public.portal_events enable row level security;
alter table public.portal_notifications enable row level security;
create policy portal_account_read on public.portal_accounts for select to authenticated using(public.music_admin_role() is not null or email=public.portal_email());
create policy portal_label_read on public.portal_labels for select to authenticated using(public.portal_email() is not null);
create policy portal_artist_read on public.portal_artists for select to authenticated using(public.portal_has_artist(id));
create policy portal_member_read on public.portal_artist_members for select to authenticated using(public.music_admin_role() is not null or account_email=public.portal_email());
create policy portal_artist_genre_read on public.portal_artist_genres for select to authenticated using(public.portal_has_artist(artist_id));
create policy portal_release_read on public.portal_releases for select to authenticated using(public.portal_can_read(id));
create policy portal_file_read on public.portal_files for select to authenticated using(public.portal_can_read(release_id));
create policy portal_message_read on public.portal_messages for select to authenticated using(public.portal_can_read(release_id));
create policy portal_note_read on public.portal_admin_notes for select to authenticated using(public.music_admin_role() is not null);
create policy portal_event_read on public.portal_events for select to authenticated using(public.portal_can_read(release_id));
create policy portal_notification_read on public.portal_notifications for select to authenticated using(public.music_admin_role() is not null);
revoke all on public.portal_accounts,public.portal_labels,public.portal_artists,public.portal_artist_members,public.portal_artist_genres,public.portal_releases,public.portal_files,public.portal_messages,public.portal_admin_notes,public.portal_events,public.portal_notifications from anon,authenticated;
grant select on public.portal_accounts,public.portal_labels,public.portal_artists,public.portal_artist_members,public.portal_artist_genres,public.portal_releases,public.portal_files,public.portal_messages,public.portal_admin_notes,public.portal_events,public.portal_notifications to authenticated;
grant all on public.portal_accounts,public.portal_notifications to service_role;

create function public.portal_save_artist(p_name text,p_label text default '',p_genres uuid[] default '{}',p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; label uuid;
begin
 perform public.music_require_admin();
 if trim(p_label)<>'' then
  insert into public.portal_labels(name) values(trim(p_label)) on conflict do nothing;
  select id into label from public.portal_labels where lower(trim(name))=lower(trim(p_label));
 end if;
 if p_id is null then insert into public.portal_artists(name,label_id) values(trim(p_name),label) returning id into result;
 else update public.portal_artists set name=trim(p_name),label_id=label where id=p_id returning id into result;
 end if;
 if result is null then raise exception 'Artist no longer exists'; end if;
 delete from public.portal_artist_genres where artist_id=result;
 insert into public.portal_artist_genres select result,x from unnest(p_genres) x on conflict do nothing;
 return result;
end $$;
create function public.portal_save_account(p_email text,p_name text,p_artists uuid[],p_admin boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare address text:=lower(trim(p_email));
begin
 perform public.music_require_admin();
 if length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
 insert into public.portal_accounts(email,display_name) values(address,left(trim(p_name),120))
 on conflict(email) do update set display_name=excluded.display_name;
 if exists(select 1 from public.music_admins where email=address and role='owner') and not p_admin then raise exception 'The owner must retain administrator access'; end if;
 if address=public.portal_email() and not p_admin then raise exception 'Ask another administrator to change your own access'; end if;
 delete from public.portal_artist_members where account_email=address;
 insert into public.portal_artist_members select x,address from unnest(p_artists) x on conflict do nothing;
 if p_admin then insert into public.music_admins(email) values(address) on conflict do nothing;
 else delete from public.music_admins where email=address and role<>'owner'; end if;
end $$;
-- Every administrator has the same management tools. Protect the owner and self-revocation.
drop policy music_owner_read on public.music_admins;
create policy music_admin_read on public.music_admins for select to authenticated using(public.music_admin_role() is not null);
create or replace function public.music_manage_admin(p_email text,p_remove boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare changed boolean; address text:=lower(trim(p_email));
begin
 perform public.music_require_admin();
 if exists(select 1 from public.music_admins where email=address and role='owner') then raise exception 'The owner cannot be changed here'; end if;
 if p_remove and address=public.portal_email() then raise exception 'Ask another administrator to change your own access'; end if;
 if p_remove then delete from public.music_admins where email=address returning true into changed;
 else insert into public.music_admins(email) values(address) on conflict do nothing returning true into changed; end if;
 return coalesce(changed,false);
end $$;

create function public.portal_save_release(p_id uuid,p_revision integer,p_artist uuid,p_suggestion text,p_content jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.portal_releases; v_title text;
begin
 if public.portal_email() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_artist is not null and not public.portal_has_artist(p_artist) then raise exception 'Artist access required' using errcode='42501'; end if;
 if coalesce(jsonb_typeof(p_content),'')<>'object' or coalesce(jsonb_typeof(p_content->'tracks'),'')<>'array' or jsonb_array_length(p_content->'tracks')>100 then raise exception 'Invalid release'; end if;
 if exists(select 1 from jsonb_array_elements(p_content->'tracks') t where coalesce(t->>'id','') !~ '^[a-f0-9-]{36}$') then raise exception 'Invalid track identifier'; end if;
 if (select count(*)<>count(distinct t->>'id') from jsonb_array_elements(p_content->'tracks') t) then raise exception 'Duplicate tracks'; end if;
 v_title:=coalesce(nullif(trim(p_content->>'releaseTitle'),''),'Untitled release');
 if length(v_title)>500 then raise exception 'Release title is too long'; end if;
 select * into r from public.portal_releases where id=p_id for update;
 if found then
  if not public.portal_can_edit(p_id) then raise exception 'This release is not editable' using errcode='42501'; end if;
  if r.revision is distinct from p_revision then raise exception 'This release changed. Reload before saving to avoid overwriting another person.'; end if;
  if r.status<>'draft' and p_artist is distinct from r.artist_id then raise exception 'An administrator must change the submitted artist'; end if;
  update public.portal_releases set artist_id=p_artist,suggested_artist=trim(p_suggestion),content=p_content,title=v_title,
   revision=revision+1,updated_at=now() where id=p_id returning * into r;
 else
  if p_revision is distinct from 0 then raise exception 'Release no longer exists'; end if;
  insert into public.portal_releases(id,artist_id,suggested_artist,created_by,title,content)
   values(p_id,p_artist,trim(p_suggestion),auth.uid(),v_title,p_content) returning * into r;
 end if;
 return to_jsonb(r);
end $$;

create function public.portal_prepare_file(p_release uuid,p_track text,p_kind text,p_name text,p_size bigint,p_mime text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.portal_files; fid uuid:=gen_random_uuid();
begin
 perform 1 from public.portal_releases where id=p_release for update;
 if not public.portal_can_edit(p_release) then raise exception 'Release is not editable' using errcode='42501'; end if;
 if p_kind<>'artwork' and not exists(select 1 from public.portal_releases r,jsonb_array_elements(r.content->'tracks') t where r.id=p_release and t->>'id'=p_track) then raise exception 'Track not found'; end if;
 if p_kind='artwork' and lower(p_name) !~ '\.(jpg|jpeg|png|pdf)$' then raise exception 'Use JPG, PNG or PDF artwork'; end if;
 if p_kind='stereo' and lower(p_name) !~ '\.(wav|aif|aiff|flac)$' then raise exception 'Use WAV, AIFF or FLAC audio'; end if;
 if p_kind='stems' and lower(p_name) !~ '\.(wav|aif|aiff|flac|zip)$' then raise exception 'Use audio files or a ZIP for stems'; end if;
 insert into public.portal_files(id,release_id,track_id,kind,name,size,mime,path)
 values(fid,p_release,p_track,p_kind,p_name,p_size,left(p_mime,120),p_release::text||'/'||fid::text||'/'||regexp_replace(p_name,'[^a-zA-Z0-9._-]','_','g')) returning * into f;
 return to_jsonb(f);
end $$;
create function public.portal_finish_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.portal_files;
begin
 select * into f from public.portal_files where id=p_id;
 perform 1 from public.portal_releases where id=f.release_id for update;
 if not public.portal_can_edit(f.release_id) then raise exception 'Release is not editable' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='portal-releases' and name=f.path and (metadata->>'size')::bigint=f.size) then raise exception 'File upload is incomplete'; end if;
 update public.portal_files set uploaded=true where id=p_id;
end $$;
create function public.portal_remove_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 select release_id into rid from public.portal_files where id=p_id;
 perform 1 from public.portal_releases where id=rid for update;
 if not public.portal_can_edit(rid) then raise exception 'Release is not editable' using errcode='42501'; end if;
 -- Metadata removal immediately revokes access. Storage cleanup can run separately.
 delete from public.portal_files where id=p_id;
end $$;

create function public.portal_submit_release(p_id uuid,p_revision integer) returns void language plpgsql security definer set search_path='' as $$
declare r public.portal_releases; t jsonb;
begin
 select * into r from public.portal_releases where id=p_id for update;
 if not public.portal_can_edit(p_id) then raise exception 'Release is not editable' using errcode='42501'; end if;
 if r.revision is distinct from p_revision then raise exception 'This release changed. Reload before submitting.'; end if;
 if r.artist_id is null and trim(r.suggested_artist)='' and not coalesce((r.content->>'parasensChoosesArtist')::boolean,false) then raise exception 'Choose or suggest an artist'; end if;
 if r.title='Untitled release' and not coalesce((r.content->>'parasensChoosesTitle')::boolean,false) then raise exception 'Enter a release title'; end if;
 if coalesce(r.content->>'releaseType','') not in ('Single','EP','Album') or jsonb_array_length(r.content->'tracks')=0 then raise exception 'Add release information and at least one track'; end if;
 for t in select * from jsonb_array_elements(r.content->'tracks') loop
  if trim(coalesce(t->>'title',''))='' or trim(coalesce(t->>'composers',''))='' then raise exception 'Every track needs a title and songwriter names'; end if;
  if coalesce(t->>'audioDelivery','') not in ('stereo','stems','both') then raise exception 'Choose audio delivery for every track'; end if;
  if t->>'audioDelivery' in ('stereo','both') then
   if coalesce(t->>'stereoStatus','') not in ('rough','mixed','mastered') then raise exception 'Choose the stereo mix status'; end if;
   if not exists(select 1 from public.portal_files where release_id=p_id and track_id=t->>'id' and kind='stereo' and uploaded) then raise exception 'Upload a stereo mix for every track that requires one'; end if;
  end if;
  if t->>'audioDelivery' in ('stems','both') and not exists(select 1 from public.portal_files where release_id=p_id and track_id=t->>'id' and kind='stems' and uploaded) then raise exception 'Upload stems for every track that requires them'; end if;
 end loop;
 update public.portal_releases set status=case when r.status='draft' then 'new' else 'in_review' end,awaiting_changes=false,
  submitted_at=coalesce(submitted_at,now()),updated_at=now(),revision=revision+1 where id=p_id;
 insert into public.portal_events values(gen_random_uuid(),p_id,auth.uid(),case when r.status='draft' then 'submitted' else 'changes_returned' end,'',now());
end $$;
create function public.portal_add_message(p_release uuid,p_body text,p_private boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.portal_can_read(p_release) then raise exception 'Release access required' using errcode='42501'; end if;
 if p_private then
  perform public.music_require_admin();
  insert into public.portal_admin_notes(release_id,author_id,body) values(p_release,auth.uid(),trim(p_body));
 else insert into public.portal_messages(release_id,author_id,author_role,body) values(p_release,auth.uid(),case when public.music_admin_role() is not null then 'admin' else 'artist' end,trim(p_body)); end if;
end $$;
create function public.portal_approve_artist(p_release uuid,p_artist uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.portal_releases; address text;
begin
 perform public.music_require_admin();
 select * into r from public.portal_releases where id=p_release for update;
 if not found then raise exception 'Release not found'; end if;
 if r.artist_id is not null then raise exception 'An artist is already assigned'; end if;
 if not exists(select 1 from public.portal_artists where id=p_artist) then raise exception 'Choose an approved artist'; end if;
 select lower(email) into address from auth.users where id=r.created_by;
 insert into public.portal_artist_members values(p_artist,address) on conflict do nothing;
 update public.portal_releases set artist_id=p_artist,suggested_artist='',updated_at=now(),revision=revision+1 where id=p_release;
 insert into public.portal_events values(gen_random_uuid(),p_release,auth.uid(),'artist_approved','Artist name approved and assigned.',now());
end $$;
create function public.portal_review(p_id uuid,p_revision integer,p_action text,p_message text,p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.portal_releases; next_status text; address text;
begin
 perform public.music_require_admin();
 select * into r from public.portal_releases where id=p_id for update;
 if exists(select 1 from public.portal_events where id=p_event and release_id=p_id and actor_id=auth.uid() and action=p_action) then return; end if;
 if r.id is null or r.revision is distinct from p_revision then raise exception 'This release changed. Reload before reviewing.'; end if;
 if p_action not in ('start_review','request_changes','accept','decline','deliver') then raise exception 'Unknown review action'; end if;
 if p_action='deliver' then
  if r.status<>'accepted' then raise exception 'Only accepted music can be marked delivered'; end if;
  next_status:='delivered';
 else
  if r.status not in ('new','in_review') then raise exception 'This release is not awaiting review'; end if;
  next_status:=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'in_review' end;
 end if;
 if p_action in ('decline','request_changes') and trim(coalesce(p_message,''))='' then raise exception 'Explain the reason to the artist'; end if;
 if length(p_message)>10000 then raise exception 'Message is too long'; end if;
 if p_action='accept' and r.artist_id is null then raise exception 'Approve an artist name before accepting'; end if;
 update public.portal_releases set status=next_status,awaiting_changes=(p_action='request_changes'),revision=revision+1,updated_at=now() where id=p_id;
 insert into public.portal_events values(p_event,p_id,auth.uid(),p_action,coalesce(trim(p_message),''),now());
 if p_action in ('decline','request_changes') then
  for address in select account_email from public.portal_artist_members where artist_id=r.artist_id
   union select lower(email) from auth.users where id=r.created_by and r.artist_id is null loop
   insert into public.portal_notifications(event_id,release_id,recipient,subject,body)
   values(p_event,p_id,address,case p_action when 'decline' then 'PARASENS: submission declined' else 'PARASENS: changes requested' end,
    r.title||E'\n\n'||trim(p_message)||E'\n\nView your release in the artist portal: https://development.parasens-ambient-soundscape.pages.dev/portal');
  end loop;
 end if;
end $$;

-- Only the server may claim/send email jobs. Stale attempts beyond provider deduplication are not retried blindly.
create function public.portal_claim_notifications(p_release uuid,p_claim uuid) returns setof public.portal_notifications
language plpgsql security definer set search_path='' as $$
begin
 update public.portal_notifications set state='uncertain',error='Delivery needs checking before another send.'
 where release_id=p_release and state in ('sending','failed') and first_attempt_at<now()-interval '23 hours';
 return query update public.portal_notifications set state='sending',claimed_at=now(),claim_id=p_claim,first_attempt_at=coalesce(first_attempt_at,now()),error=null
 where id in (select id from public.portal_notifications where release_id=p_release and
  (state in ('pending','failed') or (state='sending' and claimed_at<now()-interval '2 minutes')) order by id for update skip locked limit 5)
 returning *;
end $$;

-- Private storage uses reserved paths and current release/artist permissions, never public URLs.
insert into storage.buckets(id,name,public,file_size_limit) values('portal-releases','portal-releases',false,524288000);
create policy portal_storage_read on storage.objects for select to authenticated using(bucket_id='portal-releases' and exists(select 1 from public.portal_files f where f.path=storage.objects.name and f.uploaded and public.portal_can_read(f.release_id)));
create policy portal_storage_insert on storage.objects for insert to authenticated with check(bucket_id='portal-releases' and exists(select 1 from public.portal_files f where f.path=storage.objects.name and not f.uploaded and public.portal_can_edit(f.release_id)));

-- Functions are private by default, then expose only the checked entry points.
revoke all on function public.portal_sync_account(),public.portal_email(),public.portal_has_artist(uuid),public.portal_can_read(uuid),public.portal_can_edit(uuid),public.portal_save_artist(text,text,uuid[],uuid),public.portal_save_account(text,text,uuid[],boolean),public.portal_save_release(uuid,integer,uuid,text,jsonb),public.portal_prepare_file(uuid,text,text,text,bigint,text),public.portal_finish_file(uuid),public.portal_remove_file(uuid),public.portal_submit_release(uuid,integer),public.portal_add_message(uuid,text,boolean),public.portal_approve_artist(uuid,uuid),public.portal_review(uuid,integer,text,text,uuid),public.portal_claim_notifications(uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_email(),public.portal_has_artist(uuid),public.portal_can_read(uuid),public.portal_can_edit(uuid),public.portal_save_artist(text,text,uuid[],uuid),public.portal_save_account(text,text,uuid[],boolean),public.portal_save_release(uuid,integer,uuid,text,jsonb),public.portal_prepare_file(uuid,text,text,text,bigint,text),public.portal_finish_file(uuid),public.portal_remove_file(uuid),public.portal_submit_release(uuid,integer),public.portal_add_message(uuid,text,boolean),public.portal_approve_artist(uuid,uuid),public.portal_review(uuid,integer,text,text,uuid) to authenticated;
grant execute on function public.portal_claim_notifications(uuid,uuid) to service_role;
commit;
