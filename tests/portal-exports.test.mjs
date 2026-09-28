import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import ExcelJS from "exceljs";
import { releaseWorkbook } from "../supabase/functions/_shared/release-workbook.ts";
import { createFileHandler } from "../supabase/functions/portal-files/handler.ts";
import { dropboxClient, verifyDropboxFile } from "../supabase/functions/portal-files/dropbox.ts";

const owner = "00000000-0000-0000-0000-000000000001", a = "00000000-0000-0000-0000-000000000002", b = "00000000-0000-0000-0000-000000000003";
const rid = "10000000-0000-0000-0000-000000000001", tid = "20000000-0000-0000-0000-000000000001";
test("Dropbox attribution, export permissions, complete filtering, and durable sync", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint); create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb); alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated; insert into auth.users values('${owner}','hello@parasens.com',now()),('${a}','a@example.com',now()),('${b}','b@example.com',now());`);
    for (const file of ["202609200001_music_library.sql", "202609270001_admin_workspace.sql", "202609280001_dropbox_exports.sql"]) await db.exec(await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8"));
    const q = async (s, v = []) => (await db.query(s, v)).rows;
    const rpc = async (name, values = []) => (await q(`select public.${name}(${values.map((_, i) => "$" + (i + 1)).join(",")}) result`, values))[0].result;
    const as = async (id, fn) => {
      await q("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await q("select set_config('request.jwt.claim.role','authenticated',false)");
      await db.exec("set role authenticated");
      try { return await fn(); } finally { await db.exec("reset role"); }
    };
    const act = await as(owner, () => rpc("portal_save_artist", ["Shared / Artist", "", [], null]));
    for (const [email, name] of [["a@example.com", "Account A"], ["b@example.com", "Account B"]]) await as(owner, () => rpc("portal_save_account", [email, name, [act], false]));
    const content = { releaseTitle: "=A dangerous formula", releaseType: "Single", parasensChoosesTitle: false, parasensChoosesArtist: false, label: "Label", genre: "Ambient", playlistBrief: "Brief", generalNotes: "Notes", artworkInspiration: "Art", tracks: [{ id: tid, title: "Track", composers: "Writer", audioDelivery: "stereo", stereoStatus: "mixed", notes: "Track notes" }] };
    await as(a, () => rpc("portal_save_release", [rid, 0, act, "", content]));
    const file = await as(b, () => rpc("portal_prepare_dropbox_file", [rid, tid, "stereo", "track.wav", 4, "audio/wav"]));
    assert.equal(file.uploader_email, "b@example.com");
    assert.equal(file.uploaded_by, b);
    assert.match(file.path, /Account B — b@example.com/);
    assert.match(file.path, /Shared _ Artist/);
    assert.match(file.path, /\/Audio\//);
    await assert.rejects(as(b, () => rpc("portal_finish_file", [file.id])), /incomplete/);
    await assert.rejects(as(b, () => rpc("portal_finish_dropbox_file", [file.id, b, "id:file", 4])), /permission denied/);
    await rpc("portal_finish_dropbox_file", [file.id, b, "id:file", 4]);
    await assert.rejects(as(a, () => rpc("portal_export_data")), /Administrator/);
    await as(owner, () => rpc("portal_add_message", [rid, "PRIVATE ADMIN NOTE", true]));
    await as(b, () => rpc("portal_add_message", [rid, "Artist message", false]));
    const exported = await as(owner, () => rpc("portal_export_data", ["all", act, rid, true]));
    assert.equal(exported.releases[0].uploader_email, "a@example.com");
    assert.equal(exported.notes[0].body, "PRIVATE ADMIN NOTE");
    assert.equal(exported.files[0].uploader_email, "b@example.com");
    const publicCopy = await as(owner, () => rpc("portal_export_data", ["all", act, rid, false]));
    assert.deepEqual(publicCopy.notes, []);
    await as(owner, () => rpc("portal_save_account", ["a@example.com", "Renamed account", [], false]));
    await as(b, () => rpc("portal_save_release", [rid, 1, act, "", { ...content, releaseTitle: "Renamed release" }]));
    assert.equal((await q("select uploader_name from portal_releases where id=$1", [rid]))[0].uploader_name, "Account A");
    assert.equal(await rpc("portal_dropbox_folder", [rid, b]), file.path.split("/Audio/")[0]);
    await assert.rejects(as(a, () => rpc("portal_prepare_dropbox_file", [rid, tid, "stereo", "track.wav", 4, "audio/wav"])), /editable/);
    const lease = crypto.randomUUID();
    const claim = (await q("select * from portal_claim_workbook($1,$2)", [rid, lease]))[0];
    assert.ok(claim.version > 1);
    assert.equal((await q("select * from portal_claim_workbook($1,$2)", [rid, crypto.randomUUID()])).length, 0);
    await as(b, () => rpc("portal_add_message", [rid, "Newer than export", false]));
    await rpc("portal_finish_workbook", [rid, crypto.randomUUID(), claim.version, null]);
    assert.equal((await q("select synced_version from portal_workbook_jobs where release_id=$1", [rid]))[0].synced_version, 0);
    await rpc("portal_finish_workbook", [rid, lease, claim.version, null]);
    const job = (await q("select * from portal_workbook_jobs where release_id=$1", [rid]))[0];
    assert.ok(job.version > job.synced_version, "changes made during export remain pending");
    await db.exec(`insert into portal_releases(id,created_by,title,content,status) select gen_random_uuid(),'${b}','Extra '||i,'{}'::jsonb,'accepted' from generate_series(1,1001) i;`);
    assert.equal((await as(owner, () => rpc("portal_export_data", ["all", null, null, true]))).releases.length, 1002);
    assert.equal((await as(owner, () => rpc("portal_export_data", ["accepted", null, null, true]))).releases.length, 1001);
    assert.equal((await as(owner, () => rpc("portal_export_data", ["draft", act, null, true]))).releases.length, 1);
    await q("select set_config('request.jwt.claim.role','service_role',false)");
    await db.exec("set role service_role");
    assert.equal((await rpc("portal_export_data", ["all", null, rid, false])).releases.length, 1);
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("Excel round trip preserves typed values, every field, and formula-like text", async () => {
  const data = { generated_at: "2026-09-28T12:00:00Z", releases: [{ id: rid, uploader_name: "Uploader", uploader_email: "a@example.com", artist_name: "Artist", suggested_artist: "Original suggestion", title: "=HYPERLINK(\"bad\")", status: "in_review", awaiting_changes: true, revision: 3, created_at: "2026-09-28T11:00:00Z", submitted_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:00:00Z", content: { releaseType: "Single", parasensChoosesTitle: true, parasensChoosesArtist: false, label: "Label", genre: "Ambient", playlistBrief: "Brief", generalNotes: "x".repeat(40000), artworkInspiration: "Artwork", tracks: [{ id: tid, title: "Track", composers: "Writer", notes: "Track notes", audioDelivery: "both", stereoStatus: "mixed" }] } }], files: [{ id: "file", release_id: rid, track_id: tid, name: "å track.wav", kind: "stereo", size: 456, uploaded: true, provider: "dropbox", path: "/Parasens/å track.wav", uploader_email: "b@example.com" }], events: [{ release_id: rid, action: "request_changes", message: "More bass", created_at: "2026-09-28T12:00:00Z" }], messages: [{ release_id: rid, body: "Message" }], notes: [{ release_id: rid, body: "PRIVATE" }] };
  for (const includePrivate of [false, true]) {
    const bytes = await releaseWorkbook(data, includePrivate);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes);
    const releases = book.getWorksheet("Releases");
    assert.equal(releases.getCell("F2").value, data.releases[0].title);
    assert.equal(releases.getCell("F2").type, ExcelJS.ValueType.String);
    assert.equal(releases.getCell("H2").value, true);
    assert.equal(releases.getCell("O2").value, "In Review");
    assert.equal(releases.getCell("Q2").value.toISOString(), data.releases[0].created_at.replace("Z", ".000Z"));
    assert.equal(book.getWorksheet("Files").getCell("H2").value, 456);
    assert.equal(book.getWorksheet("Tracks").getCell("F2").value, "Writer");
    assert.equal(Boolean(book.getWorksheet("Private admin notes")), includePrivate);
    assert.equal(book.getWorksheet("Full text").getCell("E2").value + book.getWorksheet("Full text").getCell("E3").value, data.releases[0].content.generalNotes);
    assert.equal(releases.views[0].ySplit, 1);
    assert.ok(releases.autoFilter);
  }
});

test("file endpoint rejects unauthenticated, cross-origin and oversized requests", async () => {
  const origin = "https://portal.example";
  let calls = 0;
  const handler = (authorize) => createFileHandler({ origin, authorize: async () => authorize, dispatch: async () => { calls++; return {}; } });
  const req = (body, source = origin) => new Request(origin, { method: "POST", headers: { Origin: source }, body });
  assert.equal((await handler(false)(req('{"action":"download"}'))).status, 403);
  assert.equal((await handler(true)(req('{"action":"download"}', "https://other.example"))).status, 403);
  assert.equal((await handler(true)(req("x".repeat(9000)))).status, 413);
  assert.equal((await handler(true)(req("null"))).status, 400);
  assert.equal(calls, 0);
});

test("Dropbox verifies account and uploaded file before trusting a client", async () => {
  const config = { appKey: "key", appSecret: "secret", refreshToken: "refresh", expectedEmail: "destination@example.com" };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("oauth2/token")) return Response.json({ access_token: "server-only-token" });
    if (url.includes("get_current_account")) return Response.json({ email: "destination@example.com" });
    return Response.json({ link: "https://content.dropboxapi.com/temporary" });
  };
  const client = dropboxClient(config, fetcher);
  await client.uploadLink("/Parasens/path.wav");
  const commit = JSON.parse(calls[2].options.body).commit_info;
  assert.equal(commit.autorename, false);
  assert.equal(commit.strict_conflict, true);
  assert.equal(commit.mode, "add");
  await assert.rejects(dropboxClient(config, async url => Response.json(url.includes("oauth2/token") ? { access_token: "token" } : { email: "wrong@example.com" })).verify(), /does not match/);
  const file = { path: "/Parasens/path.wav", size: 4 };
  const metadata = { ".tag": "file", id: "id:valid", path_lower: "/parasens/path.wav", size: 4, rev: "1" };
  verifyDropboxFile(file, metadata);
  assert.throws(() => verifyDropboxFile(file, { ...metadata, size: 5 }), /verified/);
  assert.throws(() => verifyDropboxFile(file, { ...metadata, path_lower: "/other.wav" }), /verified/);
});
