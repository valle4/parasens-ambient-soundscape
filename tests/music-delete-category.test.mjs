import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("genre deletion requires an admin, protects all song assignments and children, and cleans only its ordering", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001";
  const admin = "00000000-0000-0000-0000-000000000002";
  const artist = "00000000-0000-0000-0000-000000000003";
  const unconfirmed = "00000000-0000-0000-0000-000000000004";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create schema auth;
      create table auth.users(id uuid, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      insert into auth.users values
        ('${owner}','hello@parasens.com',now()), ('${admin}','editor@example.com',now()),
        ('${artist}','artist@example.com',now()), ('${unconfirmed}','unconfirmed@example.com',null);
    `);
    for (const file of ["202609200001_music_library.sql", "202610290001_music_delete_category.sql"])
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    await db.exec("insert into music_admins(email) values ('editor@example.com'),('unconfirmed@example.com')");
    const removeAs = async (user, id) => {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
      await db.exec(`set role ${user ? "authenticated" : "anon"}`);
      try {
        await db.query("select public.music_delete_category($1)", [id]);
      } finally {
        await db.exec("reset role");
      }
    };
    const category = async (name, parent = null) => (await db.query(
      "insert into music_categories(name,parent_id) values ($1,$2) returning id", [name, parent],
    )).rows[0].id;
    const snapshot = async () => {
      const result = {};
      for (const table of ["music_categories", "music_tracks", "music_track_categories", "music_orders"])
        result[table] = (await db.query(`select * from ${table} order by 1,2`)).rows;
      return result;
    };
    const empty = await category("Empty");
    const parent = await category("Parent");
    const child = await category("Child", parent);
    const before = await snapshot();
    await assert.rejects(removeAs(null, empty), /permission denied/);
    await assert.rejects(removeAs(artist, empty), /Administrator access required/);
    await assert.rejects(removeAs(unconfirmed, empty), /Administrator access required/);
    await assert.rejects(removeAs(owner, parent), /subgenres/);
    await assert.rejects(removeAs(owner, null), /no longer exists/);
    assert.deepEqual(await snapshot(), before);

    for (const [index, status] of ["draft", "published", "archived"].entries()) {
      const genre = await category(status);
      const track = String(index).repeat(22);
      await db.query("insert into music_tracks(id,title,artist,status) values ($1,$2,'Artist',$2)", [track, status]);
      await db.query("insert into music_track_categories values ($1,$2)", [track, genre]);
      await db.query("insert into music_orders values ($1,$2,0)", [genre, track]);
      const usedBefore = await snapshot();
      await assert.rejects(removeAs(owner, genre), /Remove this genre from its songs/);
      assert.deepEqual(await snapshot(), usedBefore);
    }

    const track = "0".repeat(22);
    await db.query("insert into music_orders values ($1,$2,1),('all',$2,2),($3,$2,3)", [empty, track, parent]);
    const beforeDelete = await snapshot();
    await removeAs(owner, empty);
    const afterDelete = await snapshot();
    assert.deepEqual(afterDelete.music_categories, beforeDelete.music_categories.filter((c) => c.id !== empty));
    assert.deepEqual(afterDelete.music_orders, beforeDelete.music_orders.filter((o) => o.scope !== empty));
    assert.deepEqual(afterDelete.music_tracks, beforeDelete.music_tracks);
    assert.deepEqual(afterDelete.music_track_categories, beforeDelete.music_track_categories);
    await assert.rejects(removeAs(owner, empty), /no longer exists/);
    await removeAs(admin, child);
    await removeAs(owner, parent);
    assert.equal((await db.query("select * from music_categories where id in ($1,$2)", [parent, child])).rows.length, 0);
    assert.equal((await db.query("select * from music_tracks")).rows.length, 3);
    assert.equal((await db.query("select * from music_track_categories")).rows.length, 3);
  } finally {
    await db.close();
  }
});
