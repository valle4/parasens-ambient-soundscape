begin;
-- Writable only by the server/operator. Existing development links stay valid.
create table public.portal_runtime_settings (
 singleton boolean primary key default true check (singleton),
 site_origin text not null check (site_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$')
);
alter table public.portal_runtime_settings enable row level security;
revoke all on public.portal_runtime_settings from public, anon, authenticated;
grant select, update on public.portal_runtime_settings to service_role;
insert into public.portal_runtime_settings values
 (true, 'https://development.parasens-ambient-soundscape.pages.dev');
create function public.portal_site_origin() returns text
language sql stable security definer set search_path='' as $$
 select site_origin from public.portal_runtime_settings where singleton
$$;
revoke all on function public.portal_site_origin() from public, anon, authenticated;
grant execute on function public.portal_site_origin() to service_role;

create or replace function public.portal_review(p_id uuid,p_revision integer,p_action text,p_message text,p_event uuid) returns void language plpgsql security definer set search_path='' as $$
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
    r.title||E'\n\n'||trim(p_message)||E'\n\nView your release in the artist portal: '||public.portal_site_origin()||'/portal');
  end loop;
 end if;
end $$;


-- New projects disable automatic grants. Give only the trusted server the direct
-- table privileges used by the existing adapters; browser roles retain their RLS.
grant select, insert, update, delete on public.portal_accounts,
 public.portal_invitations, public.portal_notifications to service_role;
grant select on public.portal_files to service_role;
commit;
