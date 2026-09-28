begin;

-- Preserve the submitting account independently of later artist assignments.
alter table public.portal_releases add column uploader_name text not null default '', add column uploader_email text not null default '';
update public.portal_releases r set uploader_email=lower(u.email),uploader_name=coalesce(a.display_name,'') from auth.users u left join public.portal_accounts a on a.user_id=u.id where u.id=r.created_by;
create function public.portal_capture_uploader() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  select lower(u.email),coalesce(a.display_name,'') into new.uploader_email,new.uploader_name from auth.users u left join public.portal_accounts a on a.user_id=u.id where u.id=new.created_by;
 else new.uploader_email:=old.uploader_email; new.uploader_name:=old.uploader_name; new.created_by:=old.created_by;
 end if;
 return new;
end $$;
create trigger portal_capture_uploader before insert or update on public.portal_releases for each row execute function public.portal_capture_uploader();
alter table public.portal_files add column provider text not null default 'supabase' check(provider in ('supabase','dropbox')),
 add column uploaded_by uuid references auth.users(id), add column uploader_email text, add column uploader_name text,
 add column dropbox_id text, add column dropbox_web_path text;
-- Historical file uploaders are unknown; do not attribute a shared account's files to the release creator.
create function public.portal_capture_file_uploader() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.uploaded_by:=auth.uid();
 select lower(u.email),coalesce(a.display_name,'') into new.uploader_email,new.uploader_name from auth.users u left join public.portal_accounts a on a.user_id=u.id where u.id=new.uploaded_by;
 return new;
end $$;
create trigger portal_capture_file_uploader before insert on public.portal_files for each row execute function public.portal_capture_file_uploader();

create function public.portal_folder_part(p_text text) returns text language sql immutable set search_path='' as $$
 select coalesce(nullif(trim(both ' .' from left(regexp_replace(coalesce(p_text,''),'[[:cntrl:]/\\:*?"<>|]','_','g'),80)),''),'Unnamed')
$$;
create table public.portal_dropbox_folders (
 release_id uuid references public.portal_releases(id) on delete cascade,
 uploader_id uuid references auth.users(id), path text not null unique,
 primary key(release_id,uploader_id)
);
alter table public.portal_dropbox_folders enable row level security;
revoke all on public.portal_dropbox_folders from anon,authenticated;
grant all on public.portal_dropbox_folders to service_role;
create function public.portal_dropbox_folder(p_release uuid,p_user uuid) returns text language plpgsql security definer set search_path='' as $$
declare folder text; r public.portal_releases; account_name text; account_email text; artist_name text;
begin
 select path into folder from public.portal_dropbox_folders where release_id=p_release and uploader_id=p_user;
 if folder is not null then return folder; end if;
 select * into strict r from public.portal_releases where id=p_release;
 select coalesce(a.display_name,''),u.email into account_name,account_email from auth.users u left join public.portal_accounts a on a.user_id=u.id where u.id=p_user;
 if account_email is null then raise exception 'Uploader account not found'; end if;
 select name into artist_name from public.portal_artists where id=r.artist_id;
 folder:='/Parasens/'||public.portal_folder_part(account_name||' — '||account_email)||' ['||p_user||']/'||public.portal_folder_part(coalesce(artist_name,nullif(r.suggested_artist,''),'Artist to be confirmed'))||'/'||public.portal_folder_part(r.title)||' ['||r.id||']';
 insert into public.portal_dropbox_folders values(p_release,p_user,folder) on conflict(release_id,uploader_id) do nothing;
 select path into folder from public.portal_dropbox_folders where release_id=p_release and uploader_id=p_user;
 return folder;
end $$;
create function public.portal_prepare_dropbox_file(p_release uuid,p_track text,p_kind text,p_name text,p_size bigint,p_mime text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.portal_files; reservation jsonb; folder text; filename text;
begin
 if p_size>52428800 then raise exception 'The upload limit is 50 MB per file'; end if;
 reservation:=public.portal_prepare_file(p_release,p_track,p_kind,p_name,p_size,p_mime);
 folder:=public.portal_dropbox_folder(p_release,auth.uid());
 filename:=regexp_replace(p_name,'[[:cntrl:]/\\:*?"<>|]','_','g');
 if length(filename)>180 then filename:=left(filename,140)||'_'||right(filename,39); end if;
 update public.portal_files set provider='dropbox',path=folder||'/'||case p_kind when 'stereo' then 'Audio' when 'stems' then 'Stems' else 'Artwork' end||'/'||(reservation->>'id')||' — '||filename where id=(reservation->>'id')::uuid returning * into f;
 return to_jsonb(f);
end $$;
create function public.portal_finish_dropbox_file(p_id uuid,p_user uuid,p_dropbox_id text,p_size bigint,p_web_root text default '') returns void language plpgsql security definer set search_path='' as $$
declare f public.portal_files; r public.portal_releases;
begin
 select * into strict f from public.portal_files where id=p_id for update;
 select * into strict r from public.portal_releases where id=f.release_id for update;
 if not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and
  (exists(select 1 from public.music_admins a where a.email=lower(u.email)) or exists(select 1 from public.portal_artist_members m where m.artist_id=r.artist_id and m.account_email=lower(u.email)) or (r.artist_id is null and r.created_by=p_user))) then raise exception 'Release access required'; end if;
 if r.status<>'draft' and not (r.status='in_review' and r.awaiting_changes) then raise exception 'Release is not editable'; end if;
 if f.provider<>'dropbox' or f.uploaded_by<>p_user or f.size<>p_size or p_dropbox_id not like 'id:%' then raise exception 'File verification failed'; end if;
 update public.portal_files set uploaded=true,dropbox_id=p_dropbox_id,dropbox_web_path=rtrim(p_web_root,'/')||f.path where id=p_id;
end $$;
-- The legacy completion RPC must never certify a Dropbox reservation.
create or replace function public.portal_finish_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.portal_files;
begin
 select * into f from public.portal_files where id=p_id;
 perform 1 from public.portal_releases where id=f.release_id for update;
 if not public.portal_can_edit(f.release_id) then raise exception 'Release is not editable' using errcode='42501'; end if;
 if f.provider<>'supabase' or not exists(select 1 from storage.objects where bucket_id='portal-releases' and name=f.path and (metadata->>'size')::bigint=f.size) then raise exception 'File upload is incomplete'; end if;
 update public.portal_files set uploaded=true where id=p_id;
end $$;

-- One transactional snapshot includes every matching row, independent of UI paging.
create function public.portal_export_data(p_status text default 'all',p_artist uuid default null,p_release uuid default null,p_private boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 -- SECURITY DEFINER current_user is the owner; check caller JWT role instead.
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' and coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role' is distinct from 'service_role' then
  perform public.music_require_admin();
 end if;
 if p_status not in ('all','pending','changes','draft','new','in_review','accepted','declined','delivered') then raise exception 'Unknown status filter'; end if;
 with selected as (
  select r.*,coalesce(a.name,nullif(r.suggested_artist,''),'Artist to be confirmed') artist_name from public.portal_releases r left join public.portal_artists a on a.id=r.artist_id
  where (p_release is null or r.id=p_release) and (p_artist is null or r.artist_id=p_artist) and
   (p_status='all' or p_status=r.status or (p_status='pending' and r.status in ('new','in_review')) or (p_status='changes' and r.awaiting_changes))
 ) select jsonb_build_object(
  'generated_at',now(),
  'releases',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at,s.id) from selected s),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at,f.id) from public.portal_files f join selected s on s.id=f.release_id),'[]'::jsonb),
  'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.portal_messages m join selected s on s.id=m.release_id),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.portal_events e join selected s on s.id=e.release_id),'[]'::jsonb),
  'notes',case when p_private then coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at,n.id) from public.portal_admin_notes n join selected s on s.id=n.release_id),'[]'::jsonb) else '[]'::jsonb end
 ) into result;
 return result;
end $$;

create table public.portal_workbook_jobs (
 release_id uuid primary key references public.portal_releases(id) on delete cascade,
 version bigint not null default 1, synced_version bigint not null default 0,
 lease_id uuid, lease_until timestamptz, synced_at timestamptz, error text,
 updated_at timestamptz not null default now()
);
alter table public.portal_workbook_jobs enable row level security;
create policy portal_workbook_read on public.portal_workbook_jobs for select to authenticated using(public.portal_can_read(release_id));
revoke all on public.portal_workbook_jobs from anon,authenticated;
grant select on public.portal_workbook_jobs to authenticated;
grant all on public.portal_workbook_jobs to service_role;
create function public.portal_queue_workbook() returns trigger language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 if TG_TABLE_NAME='portal_releases' then rid:=new.id;
 elsif TG_OP='DELETE' then rid:=old.release_id; else rid:=new.release_id; end if;
 insert into public.portal_workbook_jobs(release_id) values(rid) on conflict(release_id) do update set version=portal_workbook_jobs.version+1,updated_at=now(),error=null;
 return null;
end $$;
create trigger portal_workbook_release after insert or update on public.portal_releases for each row execute function public.portal_queue_workbook();
create trigger portal_workbook_files after insert or update or delete on public.portal_files for each row execute function public.portal_queue_workbook();
create trigger portal_workbook_events after insert on public.portal_events for each row execute function public.portal_queue_workbook();
create trigger portal_workbook_messages after insert on public.portal_messages for each row execute function public.portal_queue_workbook();
insert into public.portal_workbook_jobs(release_id) select id from public.portal_releases;
create function public.portal_claim_workbook(p_release uuid,p_lease uuid) returns setof public.portal_workbook_jobs language sql security definer set search_path='' as $$
 update public.portal_workbook_jobs set lease_id=p_lease,lease_until=now()+interval '10 minutes',error=null where release_id=p_release and version>synced_version and (lease_until is null or lease_until<now()) returning *
$$;
create function public.portal_finish_workbook(p_release uuid,p_lease uuid,p_version bigint,p_error text default null) returns void language sql security definer set search_path='' as $$
 update public.portal_workbook_jobs set synced_version=case when p_error is null then p_version else synced_version end,synced_at=case when p_error is null then now() else synced_at end,error=p_error,lease_id=null,lease_until=null,updated_at=now() where release_id=p_release and lease_id=p_lease
$$;
create function public.portal_pending_workbooks() returns setof uuid language sql security definer set search_path='' as $$
 select release_id from public.portal_workbook_jobs where version>synced_version and (lease_until is null or lease_until<now()) order by updated_at limit 3
$$;
revoke all on function public.portal_pending_workbooks() from public,anon,authenticated;
grant execute on function public.portal_pending_workbooks() to service_role;

revoke all on function public.portal_capture_uploader(),public.portal_capture_file_uploader(),public.portal_folder_part(text),public.portal_dropbox_folder(uuid,uuid),public.portal_prepare_dropbox_file(uuid,text,text,text,bigint,text),public.portal_finish_dropbox_file(uuid,uuid,text,bigint,text),public.portal_export_data(text,uuid,uuid,boolean),public.portal_queue_workbook(),public.portal_claim_workbook(uuid,uuid),public.portal_finish_workbook(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.portal_prepare_dropbox_file(uuid,text,text,text,bigint,text),public.portal_export_data(text,uuid,uuid,boolean) to authenticated;
grant execute on function public.portal_dropbox_folder(uuid,uuid),public.portal_finish_dropbox_file(uuid,uuid,text,bigint,text),public.portal_export_data(text,uuid,uuid,boolean),public.portal_claim_workbook(uuid,uuid),public.portal_finish_workbook(uuid,uuid,bigint,text) to service_role;
grant select on public.portal_releases,public.portal_files to service_role;
commit;
