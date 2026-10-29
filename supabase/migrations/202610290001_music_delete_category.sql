-- Delete only unused categories; keep songs and their genre assignments intact.
create function public.music_delete_category(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.music_require_admin();
  if p_id is null or not exists(select 1 from public.music_categories where id = p_id) then
    raise exception 'Genre no longer exists';
  end if;
  if exists(select 1 from public.music_categories where parent_id = p_id) then
    raise exception 'Move or delete the subgenres before deleting this genre';
  end if;
  if exists(select 1 from public.music_track_categories where category_id = p_id) then
    raise exception 'Remove this genre from its songs before deleting it (including drafts and archived songs)';
  end if;
  delete from public.music_orders where scope = p_id::text;
  delete from public.music_categories where id = p_id;
end;
$$;

revoke all on function public.music_delete_category(uuid) from public, anon, authenticated;
grant execute on function public.music_delete_category(uuid) to authenticated;
