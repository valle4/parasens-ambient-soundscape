-- Delete unused artist identities without deleting releases, accounts or music.
begin;
create function public.portal_delete_artist(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public.music_require_admin();
  perform 1 from public.portal_artists where id=p_id for update;
  if not found then raise exception 'Artist no longer exists. Refresh the artist list.'; end if;
  if exists(select 1 from public.portal_releases where artist_id=p_id) then
    raise exception 'This artist has releases and cannot be deleted. Their releases and music have been kept.';
  end if;
  -- Genre and account assignments cascade; the accounts themselves remain.
  delete from public.portal_artists where id=p_id;
end $$;
revoke all on function public.portal_delete_artist(uuid) from public,anon;
grant execute on function public.portal_delete_artist(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
