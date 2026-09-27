import assert from "node:assert/strict";
import test from "node:test";
import { sortTracks, tracksInScope } from "../src/lib/music/catalogue.ts";

const tracks = [
  { id: "a", title: "Zebra", artist: "Alpha" },
  { id: "b", title: "echo 10", artist: "beta" },
  { id: "c", title: "Echo 2", artist: "Beta" },
  { id: "d", title: "Alpha", artist: "Zebra" },
].map((track) => ({ ...track, status: "published", created_at: "2026-09-27", published_at: "2026-09-27" }));
const categories = [
  { id: "ambient", name: "Ambient", parent_id: null, position: 0 },
  { id: "piano", name: "Piano", parent_id: "ambient", position: 1 },
  { id: "jazz", name: "Jazz", parent_id: null, position: 2 },
];
const tags = [
  { track_id: "a", category_id: "jazz" },
  { track_id: "b", category_id: "jazz" },
  { track_id: "b", category_id: "piano" },
  { track_id: "c", category_id: "piano" },
];
const ids = (items) => items.map((track) => track.id);

test("artist and song sorting use their own field, natural numbers and case-insensitive ties", () => {
  assert.deepEqual(ids(sortTracks(tracks, "artist", categories, tags)), ["a", "c", "b", "d"]);
  assert.deepEqual(ids(sortTracks(tracks, "song", categories, tags)), ["d", "c", "b", "a"]);
});

test("genre sorting uses full category labels, first alphabetical tag and puts untagged last", () => {
  assert.deepEqual(ids(sortTracks(tracks, "genre", categories, tags)), ["c", "b", "a", "d"]);
  assert.deepEqual(ids(sortTracks(tracks, "genre", categories, [...tags].reverse())), ["c", "b", "a", "d"]);
});

test("descending reverses alphabetic ordering while untagged genres stay last", () => {
  assert.deepEqual(ids(sortTracks(tracks, "artist", categories, tags, "desc")), ["d", "b", "c", "a"]);
  assert.deepEqual(ids(sortTracks(tracks, "song", categories, tags, "desc")), ["a", "b", "c", "d"]);
  assert.deepEqual(ids(sortTracks(tracks, "genre", categories, tags, "desc")), ["a", "b", "c", "d"]);
  assert.deepEqual(ids(sortTracks(tracks, "manual", categories, tags, "desc")), ["a", "b", "c", "d"]);
});

test("alphabetical views preserve manual sequences and apply within the filtered genre", () => {
  const data = { tracks, categories, tags, orders: [{ scope: "all", track_id: "d", position: 1 }] };
  const manual = tracksInScope(data, "all");
  const original = ids(manual);
  for (const sort of ["artist", "song", "genre"]) sortTracks(manual, sort, categories, tags);
  assert.deepEqual(ids(manual), original);
  assert.deepEqual(ids(sortTracks(manual, "manual", categories, tags)), ["d", "a", "b", "c"]);
  assert.deepEqual(ids(sortTracks(tracksInScope(data, "ambient"), "song", categories, tags)), ["c", "b"]);
});
