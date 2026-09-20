import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const owner = "00000000-0000-0000-0000-000000000001",
  artist = "00000000-0000-0000-0000-000000000002",
  invited = "00000000-0000-0000-0000-000000000003",
  unverified = "00000000-0000-0000-0000-000000000004";
const playlist = "P".repeat(22),
  trackId = (n) => `NewTrack${String(n).padStart(14, "0")}`;

test("music database permissions and complete curation lifecycle", async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    insert into auth.users values ('${owner}','hello@parasens.com',now()),('${artist}','artist@example.com',now()),('${invited}','admin@example.com',now()),('${unverified}','unverified@example.com',null);`);
  for (const file of [
    "202609200001_music_library.sql",
    "202609200002_music_seed.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  async function asUser(id, fn) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  }
  const query = (sql, args = []) => db.query(sql, args);
  const rpc = async (name, args = []) => {
    const { rows } = await query(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    );
    return rows[0].result;
  };
  const rows = async (sql, args = []) => (await query(sql, args)).rows;
  const initial = await rows("select * from music_tracks order by id");
  const existingId = initial[0].id;
  const category = (
    await rows(
      "select id from music_categories where parent_id is null order by position",
    )
  )[0].id;
  await t.test(
    "seeds all 147 songs and grants only the verified owner administration",
    async () => {
      assert.equal(initial.length, 147);
      assert.ok(initial.every((t) => t.status === "published"));
      assert.equal(await asUser(owner, () => rpc("music_admin_role")), "owner");
      assert.equal(await asUser(artist, () => rpc("music_admin_role")), null);
      assert.equal(await asUser(null, () => rpc("music_admin_role")), null);
    },
  );
  await t.test(
    "ordinary artists and anonymous visitors cannot mutate or see private library records",
    async () => {
      await assert.rejects(
        asUser(artist, () =>
          rpc("music_set_status", [[existingId], "archived"]),
        ),
        /Administrator access required/,
      );
      await assert.rejects(
        asUser(null, () =>
          rpc("music_import_playlist", [playlist, "Private", []]),
        ),
        /permission denied/,
      );
      await assert.rejects(
        asUser(artist, () =>
          query("insert into music_admins(email) values('artist@example.com')"),
        ),
        /permission denied/,
      );
      await assert.rejects(
        asUser(owner, () => query("update music_tracks set status='archived'")),
        /permission denied/,
      );
      await assert.rejects(
        asUser(artist, () => query("truncate music_orders")),
        /permission denied/,
      );
      assert.equal(
        (await asUser(artist, () => rows("select * from music_admins"))).length,
        0,
      );
    },
  );
  await t.test(
    "imports new songs once, preserves existing published songs and archives",
    async () => {
      await asUser(owner, () =>
        rpc("music_set_status", [[existingId], "archived"]),
      );
      const tracks = [
        {
          id: existingId,
          title: "Do not overwrite",
          artist: "Do not overwrite",
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: trackId(i),
          title: `Song ${i}`,
          artist: "Test artist",
        })),
      ];
      assert.deepEqual(
        await asUser(owner, () =>
          rpc("music_import_playlist", [
            playlist,
            "Mixed playlist",
            JSON.stringify(tracks),
          ]),
        ),
        { added: 10, existing: 1 },
      );
      const before = await rows("select * from music_tracks order by id");
      assert.deepEqual(
        await asUser(owner, () =>
          rpc("music_import_playlist", [
            playlist,
            "Mixed playlist",
            JSON.stringify([...tracks, tracks[1]]),
          ]),
        ),
        { added: 0, existing: 11 },
      );
      assert.deepEqual(
        await rows("select * from music_tracks order by id"),
        before,
      );
      assert.equal(
        (await rows("select * from music_tracks where id=$1", [existingId]))[0]
          .status,
        "archived",
      );
      assert.equal(
        (await rows("select * from music_tracks where id=$1", [existingId]))[0]
          .title,
        initial[0].title,
      );
      assert.equal(
        (await asUser(null, () => rows("select * from music_tracks"))).length,
        146,
      );
      assert.equal(
        (await asUser(artist, () => rows("select * from music_playlists")))
          .length,
        0,
      );
      assert.equal(
        (
          await asUser(null, () =>
            rows("select * from music_track_categories where track_id=$1", [
              existingId,
            ]),
          )
        ).length,
        0,
      );
      assert.equal(
        (
          await asUser(null, () =>
            rows("select * from music_orders where track_id=$1", [existingId]),
          )
        ).length,
        0,
      );
    },
  );
  await t.test(
    "a later import adds exactly ten new drafts across overlapping playlists",
    async () => {
      const tracks = Array.from({ length: 20 }, (_, i) => ({
        id: trackId(i),
        title: `Song ${i}`,
        artist: "Test artist",
      }));
      assert.deepEqual(
        await asUser(owner, () =>
          rpc("music_import_playlist", [
            playlist,
            "Mixed playlist",
            JSON.stringify(tracks),
          ]),
        ),
        { added: 10, existing: 10 },
      );
      assert.deepEqual(
        await asUser(owner, () =>
          rpc("music_import_playlist", [
            "Q".repeat(22),
            "Second playlist",
            JSON.stringify(tracks),
          ]),
        ),
        { added: 0, existing: 20 },
      );
      assert.equal(
        (await rows("select * from music_tracks where status='draft'")).length,
        20,
      );
      // Removing items from a playlist is not deletion from the catalogue or its import history.
      await asUser(owner, () =>
        rpc("music_import_playlist", [playlist, "Mixed playlist", "[]"]),
      );
      assert.equal((await rows("select * from music_tracks")).length, 167);
      assert.equal(
        (
          await rows(
            "select * from music_playlist_tracks where playlist_id=$1",
            [playlist],
          )
        ).length,
        21,
      );
    },
  );
  await t.test(
    "bulk publishing requires tags and supports rare multiple genre assignments",
    async () => {
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_set_status", [[trackId(0), trackId(1)], "published"]),
        ),
        /Tag every/,
      );
      const extra = await asUser(owner, () =>
        rpc("music_save_category", ["Test genre", null, null]),
      );
      await asUser(owner, () =>
        rpc("music_tag_tracks", [
          [trackId(0), trackId(1)],
          [category, extra],
          "add",
        ]),
      );
      await asUser(owner, () =>
        rpc("music_set_status", [[trackId(0), trackId(1)], "published"]),
      );
      assert.equal(
        (
          await rows("select * from music_track_categories where track_id=$1", [
            trackId(0),
          ])
        ).length,
        2,
      );
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_tag_tracks", [[trackId(0)], [], "replace"]),
        ),
        /Published songs must/,
      );
      assert.equal(
        (
          await rows("select * from music_track_categories where track_id=$1", [
            trackId(0),
          ])
        ).length,
        2,
      );
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_save_category", ["test GENRE", null, null]),
        ),
        /duplicate key/,
      );
    },
  );
  await t.test(
    "reordering is atomic and independent for All, genres and subgenres",
    async () => {
      const oldOther = await rows(
        "select * from music_orders where scope=$1 order by position",
        [category],
      );
      await asUser(owner, () =>
        rpc("music_move_track", [trackId(0), "all", 1]),
      );
      assert.equal(
        (
          await rows(
            "select * from music_orders where scope='all' order by position",
          )
        )[0].track_id,
        trackId(0),
      );
      assert.deepEqual(
        await rows(
          "select * from music_orders where scope=$1 order by position",
          [category],
        ),
        oldOther,
      );
      await asUser(owner, () =>
        rpc("music_move_track", [trackId(1), category, 1]),
      );
      assert.equal(
        (
          await rows(
            "select * from music_orders where scope=$1 order by position",
            [category],
          )
        )[0].track_id,
        trackId(1),
      );
      const child = await asUser(owner, () =>
        rpc("music_save_category", ["Test subgenre", category, null]),
      );
      await asUser(owner, () =>
        rpc("music_tag_tracks", [[trackId(0)], [child], "replace"]),
      );
      await asUser(owner, () =>
        rpc("music_move_track", [trackId(0), category, 1]),
      );
      await asUser(owner, () =>
        rpc("music_move_track", [trackId(0), child, 1]),
      );
      assert.equal(
        (await rows("select * from music_orders where scope=$1", [child]))
          .length,
        1,
      );
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_save_category", ["Too deep", child, null]),
        ),
        /subgenre must/,
      );
      await assert.rejects(
        asUser(owner, () => rpc("music_move_track", [trackId(2), "all", 1])),
        /no longer published/,
      );
    },
  );
  await t.test(
    "archiving remains sticky and restoring does not publish automatically",
    async () => {
      await asUser(owner, () =>
        rpc("music_set_status", [[trackId(0)], "archived"]),
      );
      await asUser(owner, () =>
        rpc("music_import_playlist", [
          playlist,
          "Mixed playlist",
          JSON.stringify([
            { id: trackId(0), title: "Changed", artist: "Changed" },
          ]),
        ]),
      );
      assert.equal(
        (
          await rows("select status from music_tracks where id=$1", [
            trackId(0),
          ])
        )[0].status,
        "archived",
      );
      await asUser(owner, () =>
        rpc("music_set_status", [[trackId(0)], "draft"]),
      );
      assert.equal(
        (
          await asUser(null, () =>
            rows("select * from music_tracks where id=$1", [trackId(0)]),
          )
        ).length,
        0,
      );
    },
  );
  await t.test(
    "owner can grant and revoke invited admin access; admins cannot invite or escalate",
    async () => {
      await asUser(owner, () =>
        rpc("music_manage_admin", ["admin@example.com", false]),
      );
      assert.equal(
        await asUser(invited, () => rpc("music_admin_role")),
        "admin",
      );
      await asUser(invited, () =>
        rpc("music_set_status", [[trackId(2)], "archived"]),
      );
      await assert.rejects(
        asUser(invited, () =>
          rpc("music_manage_admin", ["artist@example.com", false]),
        ),
        /Only the owner/,
      );
      await asUser(owner, () =>
        rpc("music_manage_admin", ["unverified@example.com", false]),
      );
      assert.equal(
        await asUser(unverified, () => rpc("music_admin_role")),
        null,
      );
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_manage_admin", ["hello@parasens.com", true]),
        ),
        /owner cannot/,
      );
      await asUser(owner, () =>
        rpc("music_manage_admin", ["admin@example.com", true]),
      );
      assert.equal(await asUser(invited, () => rpc("music_admin_role")), null);
      await assert.rejects(
        asUser(invited, () =>
          rpc("music_set_status", [[trackId(3)], "archived"]),
        ),
        /Administrator access required/,
      );
    },
  );
  await t.test(
    "invalid imports roll back completely without altering a previous import",
    async () => {
      const before = await rows("select * from music_playlists where id=$1", [
        playlist,
      ]);
      await assert.rejects(
        asUser(owner, () =>
          rpc("music_import_playlist", [
            playlist,
            "Broken",
            JSON.stringify([{ id: "bad", title: "Bad", artist: "Bad" }]),
          ]),
        ),
        /check constraint/,
      );
      assert.deepEqual(
        await rows("select * from music_playlists where id=$1", [playlist]),
        before,
      );
    },
  );
  await db.close();
});
