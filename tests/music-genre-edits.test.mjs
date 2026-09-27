import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("genre edits preserve untouched assignments and save atomically with admin access", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001";
  const artist = "00000000-0000-0000-0000-000000000002";
  const a = "a".repeat(22), b = "b".repeat(22), outside = "c".repeat(22);
  try {
    await db.exec(`
      create role anon; create role authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create schema auth;
      create table auth.users(id uuid, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      insert into auth.users values ('${owner}','hello@parasens.com',now()), ('${artist}','artist@example.com',now());
    `);
    for (const file of ["202609200001_music_library.sql", "202609270003_music_genre_edits.sql"])
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    await db.exec(`insert into music_tracks(id,title,artist) values
      ('${a}','First','Artist'), ('${b}','Second','Artist'), ('${outside}','Outside','Artist');`);
    const { rows: categories } = await db.query(
      "insert into music_categories(name,position) values ('Piano',0),('Jazz',1),('Classical',2) returning id",
    );
    const [piano, jazz, classical] = categories.map((c) => c.id);
    const editAs = async (user, ids, add, remove) => {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
      await db.exec(`set role ${user ? "authenticated" : "anon"}`);
      try {
        await db.query("select public.music_edit_track_genres($1,$2,$3)", [ids, add, remove]);
      } finally {
        await db.exec("reset role");
      }
    };
    const tags = async () => (await db.query(
      "select track_id, category_id from music_track_categories order by track_id, category_id",
    )).rows;
    const forTrack = async (id) => (await tags()).filter((t) => t.track_id === id).map((t) => t.category_id).sort();

    await editAs(owner, [a, outside], [piano], []);
    await editAs(owner, [b], [jazz], []);
    await editAs(owner, [a, b], [classical], []);
    assert.deepEqual(await forTrack(a), [piano, classical].sort());
    assert.deepEqual(await forTrack(b), [jazz, classical].sort());
    assert.deepEqual(await forTrack(outside), [piano]);
    await editAs(owner, [a, b], [], [classical]);
    assert.deepEqual(await forTrack(a), [piano]);
    assert.deepEqual(await forTrack(b), [jazz]);

    // Removing the last genre from a draft is allowed.
    await editAs(owner, [b], [], [jazz]);
    assert.deepEqual(await forTrack(b), []);
    await db.query("update music_tracks set status='published' where id=$1", [a]);
    // Switching a published song's only genre succeeds in one transaction.
    await editAs(owner, [a], [jazz], [piano]);
    assert.deepEqual(await forTrack(a), [jazz]);
    const before = await tags();
    // A final invalid state rolls back additions and removals across the group.
    await assert.rejects(editAs(owner, [a, b], [classical], [jazz, classical]), /at least one genre/);
    assert.deepEqual(await tags(), before);
    await assert.rejects(editAs(owner, [a], [], [jazz]), /at least one genre/);
    await assert.rejects(editAs(artist, [a], [piano], []), /Administrator access required/);
    await assert.rejects(editAs(null, [a], [piano], []), /permission denied/);
    assert.deepEqual(await tags(), before);
  } finally {
    await db.close();
  }
});
