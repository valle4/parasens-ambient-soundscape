import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
const root = fileURLToPath(new URL("..", import.meta.url));
const output = await mkdtemp(tmpdir() + "/parasens-export-ui-");
const base = "http://127.0.0.1:5176";
const server = spawn(process.execPath, [root + "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5176", "--strictPort"], { cwd: root, env: { ...process.env, VITE_SUPABASE_URL: "https://export-test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", VITE_PORTAL_DROPBOX_ENABLED: "true" }, stdio: ["ignore", "pipe", "pipe"] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Preview failed to start")), 15000);
    server.stdout.on("data", chunk => { if (String(chunk).includes("Local:")) { clearTimeout(timer); resolve(); } });
    server.on("exit", code => { clearTimeout(timer); reject(Error(`Preview exited ${code}`)); });
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const id = "00000000-0000-0000-0000-000000000001";
  const rid = "10000000-0000-0000-0000-000000000001";
  const user = { id, email: "hello@parasens.com", email_confirmed_at: new Date().toISOString(), aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const jwt = Buffer.from('{"alg":"none"}').toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url") + ".fake";
  await context.addInitScript(({user,jwt}) => localStorage.setItem("sb-export-test-auth-token", JSON.stringify({ access_token: jwt, refresh_token: "test", expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: "bearer", user })), { user, jwt });
  const release = { id: rid, title: "Northern light", artist_id: "artist", artist_name: "Test Artist", created_by: id, uploader_name: "Test Uploader", uploader_email: "uploader@example.com", suggested_artist: "", status: "in_review", awaiting_changes: false, created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:00:00Z", submitted_at: "2026-09-28T12:00:00Z", revision: 2, content: { releaseTitle: "Northern light", releaseType: "Single", genre: "Ambient", label: "Parasens", generalNotes: "A quiet piano recording for evening listening.", tracks: [{ id: "track-one", title: "Northern light", composers: "Test Composer", audioDelivery: "both", stereoStatus: "mixed", notes: "" }, { id: "track-two", title: "Second light", composers: "Test Composer", audioDelivery: "stereo", stereoStatus: "rough", notes: "" }] } };
  const folderPath = "/Apps/Parasens/Artist & label/Release #1";
  const files = [
    { id: "stereo-one", release_id: rid, track_id: "track-one", kind: "stereo", name: "Northern light.wav", size: 16044, mime: "audio/wav", uploaded: true, provider: "dropbox", path: "/private/stereo", dropbox_web_path: folderPath + "/Audio/Northern light.wav" },
    { id: "stems-one", release_id: rid, track_id: "track-one", kind: "stems", name: "Northern light stems.zip", size: 100, mime: "application/zip", uploaded: true, provider: "dropbox", path: "/private/stems", dropbox_web_path: folderPath + "/Stems/Northern light stems.zip" },
    { id: "stereo-two", release_id: rid, track_id: "track-two", kind: "stereo", name: "Second light.wav", size: 16044, mime: "audio/wav", uploaded: true, provider: "supabase", path: "legacy/second.wav" },
  ];
  const wav = Buffer.alloc(16044);
  wav.write("RIFF"); wav.writeUInt32LE(16036, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(16000, 40);
  const requests = [], fileRequests = [];
  let failFile = false;
  await context.route("https://files.example.test/**", route => route.fulfill({ body: route.request().url().endsWith("stems-one") ? Buffer.from("test stems archive") : wav, contentType: route.request().url().endsWith("stems-one") ? "application/zip" : "audio/wav", headers: { "access-control-allow-origin": "*" } }));
  let failExport = false, synced = false, isAdmin = true;
  await context.route("https://export-test.supabase.co/**", async route => {
    const request = route.request(), url = new URL(request.url());
    const name = url.pathname.split("/").pop();
    let data = [];
    if (url.pathname.startsWith("/storage/v1/object/sign/")) {
      if (request.method() === "GET") return route.fulfill({ body: wav, contentType: "audio/wav", headers: { "access-control-allow-origin": "*" } });
      fileRequests.push({ legacy: true });
      data = { signedURL: "/object/sign/portal-releases/legacy/second.wav?token=test" };
    }
    else if (url.pathname.startsWith("/auth/")) data = user;
    else if (name === "music_admin_role") data = isAdmin ? "owner" : null;
    else if (name === "portal_export_data") {
      requests.push(request.postDataJSON());
      if (failExport) return route.fulfill({ status: 503, json: { message: "Export unavailable. Please retry." } });
      data = { generated_at: new Date().toISOString(), releases: [release], files: [], messages: [], events: [], notes: [{ release_id: rid, body: "Admin only" }] };
    } else if (name === "portal_releases") data = url.searchParams.has("id") ? release : [release];
    else if (name === "portal_files") data = files;
    else if (name === "portal_artists") data = [{id:"artist", name:"Test Artist"}];
    else if (name === "portal_workbook_jobs") data = { version: 2, synced_version: synced ? 2 : 1, synced_at: synced ? new Date().toISOString() : null, error: synced ? null : "Dropbox temporarily unavailable" };
    else if (name === "portal-files") {
      const body = request.postDataJSON();
      if (body.action === "download") {
        fileRequests.push(body);
        if (failFile) return route.fulfill({ status: 503, json: { error: "Temporary file failure" } });
        data = { link: "https://files.example.test/" + body.fileId };
      } else { synced = true; data = { synced: true }; }
    }
    await route.fulfill({ json: data, headers: { "content-range": "0-0/1" } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/portal/admin/submissions");
  await page.getByText("Export submissions", { exact: true }).click();
  await page.getByRole("button", { name: "Export this view", exact: true }).waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export this view", exact: true }).click();
  const file = await download;
  await file.saveAs(output + "/filtered.xlsx");
  assert.equal(requests[0].p_status, "pending");
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(output + "/filtered.xlsx");
  assert.equal(book.getWorksheet("Releases").getCell("F2").value, "Northern light");
  assert.equal(book.getWorksheet("Private admin notes").getCell("E2").value, "Admin only");
  const allDownload = page.waitForEvent("download");
  await page.getByRole("button", {name:"Export all submissions",exact:true}).click();
  await allDownload;
  assert.equal(requests[1].p_status, "all");
  await page.getByText("Export submissions", { exact: true }).click();
  await page.getByRole("button", { name: /^Northern light/ }).click();
  await page.getByRole("button", { name: "Play Northern light.wav", exact: true }).waitFor();
  assert.equal(fileRequests.length, 0, "Audio and files load only when requested");
  assert.equal(await page.getByRole("link", { name: "Open release in Dropbox" }).getAttribute("href"), "https://www.dropbox.com/home/Apps/Parasens/Artist%20%26%20label/Release%20%231");
  assert.equal(await page.getByRole("link", { name: "Open Dropbox folder for Northern light stems.zip" }).getAttribute("href"), "https://www.dropbox.com/home/Apps/Parasens/Artist%20%26%20label/Release%20%231/Stems");
  assert.equal(await page.getByRole("textbox", { name: "Private admin note", exact: true }).isVisible(), false);
  failFile = true;
  await page.getByRole("button", { name: "Play Northern light.wav", exact: true }).click();
  await page.getByText("Could not load audio. Try Play again.", { exact: true }).waitFor();
  failFile = false;
  await page.getByRole("button", { name: "Play Northern light.wav", exact: true }).click();
  await page.locator('audio[aria-label="Listen to Northern light.wav"]').waitFor();
  await page.waitForFunction(() => document.querySelector("audio")?.readyState >= 2);
  const stereoDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Northern light.wav", exact: true }).click();
  const stereoFile = await stereoDownload;
  assert.equal(stereoFile.suggestedFilename(), "Northern light.wav");
  await stereoFile.saveAs(output + "/stereo.wav");
  assert.deepEqual(await readFile(output + "/stereo.wav"), wav);
  const stemsDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Northern light stems.zip", exact: true }).click();
  assert.equal((await stemsDownload).suggestedFilename(), "Northern light stems.zip");
  const legacyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Second light.wav", exact: true }).click();
  assert.equal((await legacyDownload).suggestedFilename(), "Second light.wav");
  assert.ok(fileRequests.some((request) => request.legacy), "Legacy Supabase files still use authorized signed URLs");
  await page.screenshot({ path: output + "/listening-desktop.png", fullPage: true });
  await page.getByText("Release details & export", { exact: true }).click();
  await page.getByText("Dropbox workbook needs attention.").waitFor();
  await page.getByRole("button", { name: "Retry workbook update" }).click();
  await page.getByText(/Dropbox workbook updated/).waitFor();
  await page.screenshot({ path: output + "/desktop.png", fullPage: true });
  failExport = true;
  await page.getByRole("button", {name:"Export release to Excel"}).click();
  await page.getByText("Export unavailable. Please retry.", {exact:true}).waitFor();
  assert.equal(requests[2].p_release, rid);
  assert.equal(await page.getByRole("button", {name:"Export release to Excel"}).isEnabled(), true);
  await page.getByText("Release details & export", { exact: true }).click();
  await page.getByText("Messages with the artist (0)", { exact: true }).click();
  await page.getByRole("textbox", { name: "Message to artist or administrator" }).waitFor();
  await page.getByText("Messages with the artist (0)", { exact: true }).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button", { name: "Choose another submission", exact: true }).click();
  await page.getByRole("button", { name: /^Northern light/ }).click();
  assert.equal(await page.locator("aside").isVisible(), false);
  await page.screenshot({ path: output + "/mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  isAdmin = false;
  await page.goto(base + "/portal/releases/" + rid);
  await page.getByRole("heading", { name: "Listen & download", exact: true }).waitFor();
  assert.equal(await page.getByText(/Private admin notes/).count(), 0);
  assert.equal(await page.getByRole("link", { name: /Dropbox/ }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Accept", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Play Northern light.wav", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Passed: audio playback, file failure recovery, stereo/stems/legacy downloads, encoded Dropbox links, collapsed details, artist permissions, Excel exports and mobile navigation/layout.");
  console.log("Screenshots: " + output);
} finally { await browser?.close(); server.kill(); }
