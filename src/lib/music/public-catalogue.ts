import type { Catalogue, Category, MusicTrack, TrackOrder, TrackTag } from "./catalogue";

// This reader deliberately never uses the signed-in portal client. Both SSR and
// the public player see exactly what an anonymous visitor is allowed to read.
export async function fetchPublicCatalogue(
  projectUrl: string,
  publishableKey: string,
  request: typeof fetch = fetch,
): Promise<Catalogue> {
  if (!projectUrl || !publishableKey?.startsWith("sb_publishable_")) {
    throw new Error("Public music is not configured.");
  }
  const signal = AbortSignal.timeout(8_000);
  async function rows<T>(table: string, select: string, order: string, published = false): Promise<T[]> {
    const result: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const url = new URL(`/rest/v1/${table}`, projectUrl);
      url.search = new URLSearchParams({ select, order, offset: String(offset), limit: "500" }).toString();
      if (published) url.searchParams.set("status", "eq.published");
      const response = await request(url, {
        headers: { apikey: publishableKey },
        credentials: "omit",
        signal,
      });
      if (!response.ok) throw new Error("Public music is temporarily unavailable.");
      const page = await response.json() as T[];
      if (!Array.isArray(page)) throw new Error("Invalid public music response.");
      result.push(...page);
      if (page.length < 500) return result;
    }
  }
  const [tracks, categories, tags, orders] = await Promise.all([
    rows<MusicTrack>("music_tracks", "id,title,artist,status,created_at,published_at", "id.asc", true),
    rows<Category>("music_categories", "id,name,parent_id,position", "id.asc"),
    rows<TrackTag>("music_track_categories", "track_id,category_id", "track_id.asc,category_id.asc"),
    rows<TrackOrder>("music_orders", "track_id,scope,position", "track_id.asc,scope.asc"),
  ]);
  const published = tracks.filter((track) => track.status === "published");
  const ids = new Set(published.map((track) => track.id));
  return {
    tracks: published,
    categories: categories.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "en")),
    tags: tags.filter((tag) => ids.has(tag.track_id)),
    orders: orders.filter((order) => ids.has(order.track_id)),
  };
}

export const loadPublicCatalogue = () => fetchPublicCatalogue(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
