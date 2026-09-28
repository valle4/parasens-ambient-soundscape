import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const owner = "00000000-0000-0000-0000-000000000001",
  a = "00000000-0000-0000-0000-000000000002",
  b = "00000000-0000-0000-0000-000000000003",
  admin = "00000000-0000-0000-0000-000000000004";
test("private admin workspace, submissions and permissions", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint); create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb); alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated; insert into auth.users values('${owner}','hello@parasens.com',now()),('${a}','a@example.com',now()),('${b}','b@example.com',now()),('${admin}','admin@example.com',now());`,
  );
  for (const file of [
    "202609200001_music_library.sql",
    "202609270001_admin_workspace.sql",
    "202609270002_artist_account_assignment.sql",
    "202609270004_delete_artist.sql",
    "202609280001_dropbox_exports.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  const q = async (s, v = []) => (await db.query(s, v)).rows;
  const rpc = async (n, v = []) =>
    (
      await q(
        `select public.${n}(${v.map((_, i) => "$" + (i + 1)).join(",")}) result`,
        v,
      )
    )[0].result;
  async function as(id, fn) {
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  }
  let act, other, r;
  const rid = "10000000-0000-0000-0000-000000000001",
    tid = "20000000-0000-0000-0000-000000000001";
  const content = {
    releaseTitle: "Test music",
    releaseType: "Single",
    tracks: [
      {
        id: tid,
        title: "Test song",
        composers: "Example Writer",
        audioDelivery: "stereo",
        stereoStatus: "mixed",
      },
    ],
  };
  await t.test(
    "all admins manage artists and shared account assignments",
    async () => {
      await as(owner, () =>
        rpc("portal_save_account", ["admin@example.com", "Admin", [], true]),
      );
      act = await as(admin, () =>
        rpc("portal_save_artist", ["Shared act", "Test label", [], null]),
      );
      other = await as(admin, () =>
        rpc("portal_save_artist", ["Other act", "", [], null]),
      );
      await as(admin, () =>
        rpc("portal_save_account", ["a@example.com", "Artist A", [act], false]),
      );
      await as(admin, () =>
        rpc("portal_save_account", [
          "b@example.com",
          "Artist B",
          [other],
          false,
        ]),
      );
      assert.equal(
        (await as(a, () => q("select * from portal_artists"))).length,
        1,
      );
      assert.equal(
        (await as(a, () => q("select * from portal_accounts"))).length,
        1,
      );
      await assert.rejects(
        as(a, () => rpc("portal_save_artist", ["Illegal", "", [], null])),
        /Administrator/,
      );
      await assert.rejects(
        as(a, () =>
          rpc("portal_save_account", ["a@example.com", "", [act], true]),
        ),
        /Administrator/,
      );
      await assert.rejects(
        as(admin, () =>
          rpc("portal_save_account", ["hello@parasens.com", "", [], false]),
        ),
        /owner/,
      );
    },
  );
  await t.test(
    "drafts persist, require membership, and reject stale saves",
    async () => {
      r = await as(a, () =>
        rpc("portal_save_release", [rid, 0, act, "", content]),
      );
      assert.equal(r.status, "draft");
      assert.equal(
        (await as(b, () => q("select * from portal_releases"))).length,
        0,
      );
      await assert.rejects(
        as(b, () => rpc("portal_save_release", [rid, 1, other, "", content])),
        /not editable/,
      );
      await assert.rejects(
        as(a, () => rpc("portal_save_release", [rid, 0, act, "", content])),
        /changed/,
      );
      await assert.rejects(
        as(a, () => q("update portal_releases set status='accepted'")),
        /permission denied/,
      );
      await assert.rejects(
        as(a, () => rpc("portal_submit_release", [rid, 1])),
        /Upload a stereo/,
      );
    },
  );
  await t.test(
    "private file reservations, upload completion and immutable submitted files",
    async () => {
      const f = await as(a, () =>
        rpc("portal_prepare_file", [
          rid,
          tid,
          "stereo",
          "test.wav",
          20,
          "audio/wav",
        ]),
      );
      await assert.rejects(
        as(b, () =>
          q(
            "insert into storage.objects(bucket_id,name,metadata) values('portal-releases',$1,$2)",
            [f.path, { size: 20 }],
          ),
        ),
        /row-level/,
      );
      await as(a, () =>
        q(
          "insert into storage.objects(bucket_id,name,metadata) values('portal-releases',$1,$2)",
          [f.path, { size: 20 }],
        ),
      );
      await as(a, () => rpc("portal_finish_file", [f.id]));
      assert.equal(
        (await as(a, () => q("select * from storage.objects"))).length,
        1,
      );
      assert.equal(
        (await as(b, () => q("select * from storage.objects"))).length,
        0,
      );
      await as(a, () => rpc("portal_submit_release", [rid, 1]));
      await assert.rejects(
        as(a, () => rpc("portal_remove_file", [f.id])),
        /not editable/,
      );
      await assert.rejects(
        as(a, () => rpc("portal_save_release", [rid, 2, act, "", content])),
        /not editable/,
      );
    },
  );
  await t.test(
    "notes stay private, messages are visible, requesting changes creates deduplicated emails",
    async () => {
      await as(admin, () =>
        rpc("portal_add_message", [rid, "Private note", true]),
      );
      await as(admin, () =>
        rpc("portal_add_message", [rid, "Hello artist", false]),
      );
      assert.equal(
        (await as(a, () => q("select * from portal_admin_notes"))).length,
        0,
      );
      assert.equal(
        (await as(a, () => q("select * from portal_messages"))).length,
        1,
      );
      await assert.rejects(
        as(a, () => rpc("portal_add_message", [rid, "Not allowed", true])),
        /Administrator/,
      );
      const event = "30000000-0000-0000-0000-000000000001";
      await assert.rejects(
        as(admin, () => rpc("portal_review", [rid, 2, "decline", "", event])),
        /Explain/,
      );
      await as(admin, () =>
        rpc("portal_review", [
          rid,
          2,
          "request_changes",
          "Please revise the mix",
          event,
        ]),
      );
      await as(admin, () =>
        rpc("portal_review", [
          rid,
          2,
          "request_changes",
          "Please revise the mix",
          event,
        ]),
      );
      assert.equal((await q("select * from portal_notifications")).length, 1);
      assert.equal(
        (await as(a, () => q("select * from portal_notifications"))).length,
        0,
      );
      assert.equal(
        (await q("select awaiting_changes from portal_releases"))[0]
          .awaiting_changes,
        true,
      );
    },
  );
  await t.test(
    "resubmit clears awaiting badge; acceptance and manual delivery send no email",
    async () => {
      r = await as(a, () =>
        rpc("portal_save_release", [rid, 3, act, "", content]),
      );
      await as(a, () => rpc("portal_submit_release", [rid, r.revision]));
      r = (await q("select * from portal_releases"))[0];
      assert.equal(r.awaiting_changes, false);
      assert.equal(r.status, "in_review");
      await as(admin, () =>
        rpc("portal_review", [
          rid,
          r.revision,
          "accept",
          "",
          "30000000-0000-0000-0000-000000000002",
        ]),
      );
      await as(admin, () =>
        rpc("portal_review", [
          rid,
          r.revision + 1,
          "deliver",
          "",
          "30000000-0000-0000-0000-000000000003",
        ]),
      );
      assert.equal(
        (await q("select status from portal_releases"))[0].status,
        "delivered",
      );
      assert.equal((await q("select * from portal_notifications")).length, 1);
    },
  );
  await t.test(
    "shared acts grant access, reassignment revokes release and file access immediately",
    async () => {
      await as(admin, () =>
        rpc("portal_save_account", ["b@example.com", "B", [act, other], false]),
      );
      assert.equal(
        (await as(b, () => q("select * from portal_releases"))).length,
        1,
      );
      await as(admin, () =>
        rpc("portal_save_account", ["a@example.com", "A", [], false]),
      );
      assert.equal(
        (await as(a, () => q("select * from portal_releases"))).length,
        0,
      );
      assert.equal(
        (await as(a, () => q("select * from storage.objects"))).length,
        0,
      );
      await assert.rejects(
        as(null, () => q("select * from portal_releases")),
        /permission denied/,
      );
    },
  );
  await t.test(
    "artist suggestions remain private until approval assigns the submitting account",
    async () => {
      const draft = "10000000-0000-0000-0000-000000000002";
      await as(a, () =>
        rpc("portal_save_release", [draft, 0, null, "Suggested act", content]),
      );
      assert.equal(
        (
          await as(b, () =>
            q("select * from portal_releases where id=$1", [draft]),
          )
        ).length,
        0,
      );
      await as(admin, () => rpc("portal_approve_artist", [draft, other]));
      assert.equal(
        (
          await as(a, () =>
            q("select * from portal_artists where id=$1", [other]),
          )
        ).length,
        1,
      );
      await assert.rejects(
        as(a, () =>
          rpc("portal_save_release", [draft, null, other, "", content]),
        ),
        /changed/,
      );
    },
  );
  await t.test(
    "email claims cannot be made by artists or admins; provider retry window is bounded",
    async () => {
      const claim = "40000000-0000-0000-0000-000000000001";
      await assert.rejects(
        as(admin, () => rpc("portal_claim_notifications", [rid, claim])),
        /permission denied/,
      );
      await db.exec("set role service_role");
      const first = await q("select * from portal_claim_notifications($1,$2)", [
        rid,
        claim,
      ]);
      const second = await q(
        "select * from portal_claim_notifications($1,$2)",
        [rid, claim],
      );
      await db.exec("reset role");
      assert.equal(first.length, 1);
      assert.equal(second.length, 0);
      await q(
        "update portal_notifications set first_attempt_at=now()-interval '24 hours',claimed_at=now()-interval '10 minutes'",
      );
      await db.exec("set role service_role");
      assert.equal(
        (
          await q("select * from portal_claim_notifications($1,$2)", [
            rid,
            claim,
          ])
        ).length,
        0,
      );
      await db.exec("reset role");
      assert.equal(
        (await q("select state from portal_notifications"))[0].state,
        "uncertain",
      );
    },
  );
  await t.test(
    "artist creation and account assignment are atomic, admin-only, and preserve other access",
    async () => {
      const original = await q(
        "select * from portal_artist_members order by artist_id,account_email",
      );
      const roles = await q(
        "select email,role from music_admins order by email",
      );
      const created = await as(admin, () =>
        rpc("portal_save_artist_accounts", [
          "Inline act",
          "Label",
          [],
          null,
          [" A@example.com ", "b@example.com", "a@example.com"],
        ]),
      );
      assert.equal(
        (
          await q("select * from portal_artist_members where artist_id=$1", [
            created,
          ])
        ).length,
        2,
      );
      assert.deepEqual(
        await q(
          "select * from portal_artist_members where artist_id<>$1 order by artist_id,account_email",
          [created],
        ),
        original,
      );
      await as(admin, () =>
        rpc("portal_save_artist_accounts", [
          "Inline act",
          "Updated label",
          [],
          created,
          ["b@example.com"],
        ]),
      );
      assert.deepEqual(
        await q(
          "select account_email from portal_artist_members where artist_id=$1",
          [created],
        ),
        [{ account_email: "b@example.com" }],
      );
      assert.deepEqual(
        await q("select email,role from music_admins order by email"),
        roles,
      );
      await assert.rejects(
        as(a, () =>
          rpc("portal_save_artist_accounts", [
            "Forbidden",
            "",
            [],
            null,
            ["a@example.com"],
          ]),
        ),
        /Administrator/,
      );
      await assert.rejects(
        as(null, () =>
          rpc("portal_save_artist_accounts", ["Forbidden", "", [], null, []]),
        ),
        /permission denied/,
      );
      await assert.rejects(
        as(admin, () =>
          rpc("portal_save_artist_accounts", [
            "Must roll back",
            "",
            [],
            null,
            ["missing@example.com"],
          ]),
        ),
        /no longer exists/,
      );
      assert.equal(
        (await q("select * from portal_artists where name='Must roll back'"))
          .length,
        0,
      );
      await assert.rejects(
        as(admin, () =>
          rpc("portal_save_artist_accounts", [
            "Changed",
            "",
            [],
            created,
            [null],
          ]),
        ),
        /no longer exists/,
      );
      assert.equal(
        (await q("select name from portal_artists where id=$1", [created]))[0]
          .name,
        "Inline act",
      );
      await assert.rejects(
        as(admin, () =>
          rpc("portal_save_artist_accounts", [
            "Inline act",
            "",
            [],
            null,
            ["a@example.com"],
          ]),
        ),
        /duplicate key/,
      );
      assert.equal(
        (
          await q("select * from portal_artist_members where artist_id=$1", [
            created,
          ])
        ).length,
        1,
      );
    },
  );
  await t.test("only admins delete unused artists; releases and unrelated data are preserved", async () => {
    const category = (await q("insert into music_categories(name) values('Deletion test genre') returning id"))[0].id;
    const id = await as(admin, () => rpc("portal_save_artist_accounts", ["Delete me", "Kept label", [category], null, ["a@example.com"]]));
    const accountsBefore = await q("select * from portal_accounts order by email");
    const adminsBefore = await q("select * from music_admins order by email");
    const releasesBefore = await q("select * from portal_releases order by id");
    const musicBefore = await q("select * from music_tracks order by id");
    const otherMembers = await q("select * from portal_artist_members where artist_id<>$1 order by artist_id,account_email", [id]);
    await assert.rejects(as(a, () => rpc("portal_delete_artist", [id])), /Administrator/);
    await assert.rejects(as(null, () => rpc("portal_delete_artist", [id])), /permission denied/);
    await assert.rejects(as(a, () => q("delete from portal_artists where id=$1", [id])), /permission denied/);
    assert.equal((await q("select * from portal_artists where id=$1", [id])).length, 1);
    await as(admin, () => rpc("portal_delete_artist", [id]));
    for (const table of ["portal_artists", "portal_artist_members", "portal_artist_genres"])
      assert.equal((await q(`select * from ${table} where ${table === "portal_artists" ? "id" : "artist_id"}=$1`, [id])).length, 0);
    assert.deepEqual(await q("select * from portal_accounts order by email"), accountsBefore);
    assert.deepEqual(await q("select * from music_admins order by email"), adminsBefore);
    assert.deepEqual(await q("select * from portal_artist_members order by artist_id,account_email"), otherMembers);
    assert.equal((await q("select * from portal_labels where name='Kept label'")).length, 1);
    assert.equal((await q("select * from music_categories where id=$1", [category])).length, 1);
    await assert.rejects(as(admin, () => rpc("portal_delete_artist", [id])), /no longer exists/);
    const linked = releasesBefore.find((release) => release.artist_id)?.artist_id;
    assert.ok(linked);
    await assert.rejects(as(owner, () => rpc("portal_delete_artist", [linked])), /has releases/);
    assert.equal((await q("select * from portal_artists where id=$1", [linked])).length, 1);
    assert.deepEqual(await q("select * from portal_releases order by id"), releasesBefore);
    assert.deepEqual(await q("select * from music_tracks order by id"), musicBefore);
    const ownerArtist = await as(owner, () => rpc("portal_save_artist", ["Owner can delete", "", [], null]));
    await as(owner, () => rpc("portal_delete_artist", [ownerArtist]));
  });
  await db.close();
});
