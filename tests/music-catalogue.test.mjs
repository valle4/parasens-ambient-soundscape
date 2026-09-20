import assert from "node:assert/strict";
import test from "node:test";
import {
  spotifyId,
  normalisePlaylistItems,
  tracksInScope,
} from "../src/lib/music/catalogue.ts";
const id = "a".repeat(22);
test("normalises Spotify links while rejecting other origins and malformed IDs", () => {
  for (const input of [
    id,
    `spotify:track:${id}`,
    `https://open.spotify.com/track/${id}?si=test`,
    `https://open.spotify.com/intl-en/track/${id}`,
  ])
    assert.equal(spotifyId(input, "track"), id);
  for (const input of [
    "short",
    `https://evil.example/track/${id}`,
    `https://open.spotify.com/playlist/${id}`,
    `http://open.spotify.com/track/${id}`,
  ])
    assert.equal(spotifyId(input, "track"), null);
});
test("handles new and legacy playlist responses, deduplicates and skips unavailable items", () => {
  const track = {
    id,
    type: "track",
    name: "A song",
    artists: [{ name: "Artist" }, { name: "Guest" }],
  };
  assert.deepEqual(
    normalisePlaylistItems([
      { item: track },
      { track },
      null,
      { item: null },
      { item: { ...track, type: "episode" } },
      { item: { ...track, is_local: true } },
    ]),
    { tracks: [{ id, title: "A song", artist: "Artist, Guest" }], skipped: 4 },
  );
});
test("multiple genres and independent orders include child tags without duplicating songs", () => {
  const tracks = ["a", "b", "c", "d"].map((id, i) => ({
    id,
    title: id,
    artist: "Artist",
    status: i === 3 ? "archived" : "published",
    created_at: `2026-09-${20 + i}`,
    published_at: `2026-09-${20 + i}`,
  }));
  const data = {
    tracks,
    categories: [
      { id: "p", parent_id: null },
      { id: "s", parent_id: "p" },
      { id: "q", parent_id: null },
    ],
    tags: [
      { track_id: "a", category_id: "s" },
      { track_id: "a", category_id: "p" },
      { track_id: "b", category_id: "q" },
      { track_id: "d", category_id: "p" },
    ],
    orders: [
      { track_id: "b", scope: "all", position: 1 },
      { track_id: "a", scope: "all", position: 2 },
    ],
  };
  assert.deepEqual(
    tracksInScope(data, "all", true).map((t) => t.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    tracksInScope(data, "p", true).map((t) => t.id),
    ["a"],
  );
  assert.deepEqual(
    tracksInScope(data, "s", true).map((t) => t.id),
    ["a"],
  );
  assert.deepEqual(
    tracksInScope(data, "q", true).map((t) => t.id),
    ["b"],
  );
});
