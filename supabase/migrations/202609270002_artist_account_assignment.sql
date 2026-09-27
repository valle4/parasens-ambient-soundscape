begin;
-- Save artist details and its account assignments atomically. Never changes
-- account roles, display names, or memberships belonging to other artists.
create function public.portal_save_artist_accounts(
 p_name text, p_label text, p_genres uuid[], p_id uuid, p_accounts text[]
) returns uuid language plpgsql security definer set search_path='' as $$
declare artist uuid; addresses text[];
begin
 perform public.music_require_admin();
 if p_accounts is null then raise exception 'Choose account assignments before saving'; end if;
 select coalesce(array_agg(distinct lower(trim(value))), '{}'::text[]) into addresses from unnest(p_accounts) value;
 if exists(select 1 from unnest(addresses) address where address is null or not exists(select 1 from public.portal_accounts a where a.email=address)) then
  raise exception 'An account no longer exists. Reload accounts and try again.';
 end if;
 artist:=public.portal_save_artist(p_name,p_label,p_genres,p_id);
 delete from public.portal_artist_members where artist_id=artist and not(account_email=any(addresses));
 insert into public.portal_artist_members(artist_id,account_email) select artist,address from unnest(addresses) address on conflict do nothing;
 return artist;
end $$;
revoke all on function public.portal_save_artist_accounts(text,text,uuid[],uuid,text[]) from public,anon,authenticated;
grant execute on function public.portal_save_artist_accounts(text,text,uuid[],uuid,text[]) to authenticated;
commit;
