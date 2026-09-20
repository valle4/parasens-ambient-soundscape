import {
  legacyTracks,
  legacyGenres,
  legacySubCategories,
} from "../src/data/legacy-music.ts";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
const uuid = (value) => {
  const h = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const categories = new Map();
function category(genre, sub = "") {
  const key = sub ? `${genre}/${sub}` : genre;
  if (!categories.has(key))
    categories.set(key, {
      id: uuid(key),
      name: sub || genre,
      parent: sub ? category(genre) : null,
      position: categories.size,
    });
  return categories.get(key).id;
}
for (const name of legacyGenres.filter((g) => g !== "All")) {
  category(name);
  for (const sub of legacySubCategories[name] ?? []) category(name, sub);
}
const tracks = new Map(),
  tags = new Set(),
  orders = new Map();
for (const [index, t] of legacyTracks.entries()) {
  const id = t.spotifyId.split("?")[0];
  if (!/^[a-zA-Z0-9]{22}$/.test(id)) throw Error(`Invalid Spotify ID: ${id}`);
  if (!tracks.has(id)) tracks.set(id, { ...t, id, index });
  const c = category(t.genre, t.subCategory);
  tags.add(`${id},${c}`);
  for (const scope of new Set(["all", category(t.genre), c]))
    if (!orders.has(`${scope},${id}`)) orders.set(`${scope},${id}`, index);
}
const sql = [
  "-- One-time migration: preserve the existing catalogue as published songs. Do not rerun after curation.",
  "insert into public.music_categories(id,name,parent_id,position) values\n" +
    [...categories.values()]
      .map(
        (c) =>
          `(${quote(c.id)},${quote(c.name)},${c.parent ? quote(c.parent) : "null"},${c.position})`,
      )
      .join(",\n") +
    "\non conflict do nothing;",
  "insert into public.music_tracks(id,title,artist,status,published_at) values\n" +
    [...tracks.values()]
      .map(
        (t) =>
          `(${quote(t.id)},${quote(t.title)},${quote(t.artist)},'published','2026-09-20T00:00:00Z')`,
      )
      .join(",\n") +
    "\non conflict do nothing;",
  "insert into public.music_track_categories(track_id,category_id) values\n" +
    [...tags].map((v) => `(${v.split(",").map(quote).join(",")})`).join(",\n") +
    "\non conflict do nothing;",
  "insert into public.music_orders(scope,track_id,position) values\n" +
    [...orders]
      .map(([k, v]) => `(${k.split(",").map(quote).join(",")},${v})`)
      .join(",\n") +
    "\non conflict do nothing;",
].join("\n\n");
writeFileSync(
  new URL(
    "../supabase/migrations/202609200002_music_seed.sql",
    import.meta.url,
  ),
  sql + "\n",
);
console.log(
  `Seeded ${tracks.size} unique songs, ${categories.size} genres/subgenres and ${tags.size} tags.`,
);
