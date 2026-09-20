export type MusicStatus = "draft" | "published" | "archived";
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  status: MusicStatus;
  created_at: string;
  published_at: string | null;
};
export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
};
export type TrackTag = { track_id: string; category_id: string };
export type TrackOrder = { scope: string; track_id: string; position: number };
export type SavedPlaylist = {
  id: string;
  name: string;
  imported_at: string;
  added_count: number;
};
export type Catalogue = {
  tracks: MusicTrack[];
  categories: Category[];
  tags: TrackTag[];
  orders: TrackOrder[];
};
export type ImportTrack = Pick<MusicTrack, "id" | "title" | "artist">;

export function spotifyId(
  value: string,
  kind: "track" | "playlist",
): string | null {
  const raw = value.trim();
  if (/^[A-Za-z0-9]{22}$/.test(raw)) return raw;
  if (raw.startsWith(`spotify:${kind}:`))
    return spotifyId(raw.slice(`spotify:${kind}:`.length), kind);
  try {
    const url = new URL(raw);
    if (url.hostname !== "open.spotify.com" || url.protocol !== "https:")
      return null;
    const match = url.pathname.match(
      new RegExp(`^/(?:intl-[^/]+/)?${kind}/([A-Za-z0-9]{22})/?$`),
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function categoryLabel(
  category: Category,
  categories: Category[],
): string {
  const parent = categories.find((c) => c.id === category.parent_id);
  return parent ? `${parent.name} → ${category.name}` : category.name;
}

export function tracksInScope(
  data: Catalogue,
  scope: string,
  publishedOnly = false,
): MusicTrack[] {
  const categoryIds = new Set(
    data.categories
      .filter((c) => c.id === scope || c.parent_id === scope)
      .map((c) => c.id),
  );
  const tagged = new Set(
    data.tags
      .filter((t) => categoryIds.has(t.category_id))
      .map((t) => t.track_id),
  );
  const ranks = new Map(
    data.orders
      .filter((o) => o.scope === scope)
      .map((o) => [o.track_id, o.position]),
  );
  return data.tracks
    .filter(
      (t) =>
        (!publishedOnly || t.status === "published") &&
        (scope === "all" || tagged.has(t.id)),
    )
    .sort(
      (a, b) =>
        (ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        (a.published_at ?? a.created_at).localeCompare(
          b.published_at ?? b.created_at,
        ) ||
        a.id.localeCompare(b.id),
    );
}

export function normalisePlaylistItems(items: unknown[]): {
  tracks: ImportTrack[];
  skipped: number;
} {
  const tracks = new Map<string, ImportTrack>();
  let skipped = 0;
  for (const entry of items) {
    const row = entry as {
      is_local?: boolean;
      item?: unknown;
      track?: unknown;
    } | null;
    const t = (row?.item ?? row?.track) as {
      id?: string;
      type?: string;
      is_local?: boolean;
      name?: string;
      artists?: { name?: string }[];
    } | null;
    if (
      !t ||
      row?.is_local ||
      t.is_local ||
      t.type !== "track" ||
      !t.id ||
      !spotifyId(t.id, "track") ||
      !t.name ||
      !t.artists?.some((a) => a.name)
    ) {
      skipped++;
      continue;
    }
    tracks.set(t.id, {
      id: t.id,
      title: t.name,
      artist: t.artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(", "),
    });
  }
  return { tracks: [...tracks.values()], skipped };
}
