import { supabase } from "@/lib/supabase";
import type {
  Catalogue,
  Category,
  MusicTrack,
  TrackTag,
  TrackOrder,
  SavedPlaylist,
} from "./catalogue";

export function musicClient() {
  if (!supabase)
    throw new Error("The portal connection is not configured yet.");
  return supabase;
}

// Explicit paging avoids Supabase's default 1,000-row response cap.
async function allRows<T>(
  table: string,
  order: string,
  publishedOnly = false,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    let request = musicClient()
      .from(table)
      .select("*")
      .order(order)
      .range(start, start + 499);
    if (publishedOnly) request = request.eq("status", "published");
    // Composite keys need a stable secondary order across page boundaries.
    if (table === "music_track_categories")
      request = request.order("category_id");
    if (table === "music_orders") request = request.order("scope");
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    rows.push(...(data as T[]));
    if (data.length < 500) return rows;
  }
}
export async function loadCatalogue(publicOnly = false): Promise<Catalogue> {
  const [tracks, categories, tags, orders] = await Promise.all([
    allRows<MusicTrack>("music_tracks", "id", publicOnly),
    allRows<Category>("music_categories", "id"),
    allRows<TrackTag>("music_track_categories", "track_id"),
    allRows<TrackOrder>("music_orders", "track_id"),
  ]);
  return {
    tracks,
    categories: categories.sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    ),
    tags,
    orders,
  };
}
export const loadPlaylists = () =>
  allRows<SavedPlaylist>("music_playlists", "id");
export async function musicRpc<T = void>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await musicClient().rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}
