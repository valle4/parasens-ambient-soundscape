-- Save checkbox changes together without replacing untouched genres on other songs.
create function public.music_edit_track_genres(
  p_ids text[],
  p_add_categories uuid[],
  p_remove_categories uuid[]
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  -- Both calls enforce administrator access. Add first so a published song can
  -- change its only genre without temporarily violating the publication rule.
  -- Any failure rolls back the complete edit, including the additions.
  perform public.music_tag_tracks(p_ids, p_add_categories, 'add');
  perform public.music_tag_tracks(p_ids, p_remove_categories, 'remove');
end $$;

revoke all on function public.music_edit_track_genres(text[],uuid[],uuid[]) from public, anon, authenticated;
grant execute on function public.music_edit_track_genres(text[],uuid[],uuid[]) to authenticated;
