import { chromium } from "playwright";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("..", import.meta.url));
const screenshots = await mkdtemp(tmpdir() + "/parasens-music-ui-");
const base = "http://127.0.0.1:5174";
const server = spawn(
  process.execPath,
  [
    root + "/node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
    "--strictPort",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "https://music-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VITE_MUSIC_LIBRARY_ENABLED: "true",
      VITE_SPOTIFY_CLIENT_ID: "browser-test-client",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("Preview did not start.")),
    15000,
  );
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Local:")) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on("exit", (code) => {
    clearTimeout(timer);
    reject(new Error("Preview exited: " + code));
  });
});
process.on("exit", () => server.kill());
const owner = "00000000-0000-0000-0000-000000000001",
  artist = "00000000-0000-0000-0000-000000000002";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; insert into auth.users values('${owner}','hello@parasens.com',now()),('${artist}','artist@example.com',now());`,
);
for (const name of [
  "202609200001_music_library.sql",
  "202609200002_music_seed.sql",
])
  await db.exec(await readFile(`${root}/supabase/migrations/${name}`, "utf8"));
await db.exec(
  `insert into music_tracks(id,title,artist) select 'TestSong' || lpad(i::text,14,'0'), 'New song ' || lpad(i::text,4,'0'), 'Parasens artist ' || (i % 30)::text from generate_series(1,1500) i;`,
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
async function contextFor(userId = owner) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  context.setDefaultTimeout(15000);
  const user = {
    id: userId,
    email: userId === owner ? "hello@parasens.com" : "artist@example.com",
    email_confirmed_at: new Date().toISOString(),
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt =
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".fake";
  if (userId)
    await context.addInitScript(
      ({ user, jwt }) =>
        localStorage.setItem(
          "sb-music-test-auth-token",
          JSON.stringify({
            access_token: jwt,
            refresh_token: "test-only",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        ),
      { user, jwt },
    );
  await context.route("https://*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.startsWith("/auth/")) {
      await route.fulfill({ json: user });
      return;
    }
    try {
      const result = await db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          userId ?? "",
        ]);
        await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
        if (url.pathname.includes("/rpc/")) {
          const name = url.pathname.split("/").pop();
          if (!/^music_[a-z_]+$/.test(name)) throw Error("Unknown RPC");
          const body = request.postDataJSON() ?? {};
          const names = Object.keys(body);
          const values = Object.values(body).map((v, i) =>
            names[i] === "p_tracks" ? JSON.stringify(v) : v,
          );
          return (
            await tx.query(
              `select public.${name}(${names.map((n, i) => `${n} := $${i + 1}`).join(",")}) as value`,
              values,
            )
          ).rows[0].value;
        }
        const table = url.pathname.split("/").pop();
        if (!/^music_[a-z_]+$/.test(table)) throw Error("Unknown table");
        let sql = `select * from public.${table}`;
        const conditions = [],
          values = [];
        for (const [k, v] of url.searchParams)
          if (v.startsWith("eq.")) {
            if (!/^[a-z_]+$/.test(k)) throw Error("Bad field");
            values.push(v.slice(3));
            conditions.push(`${k}=$${values.length}`);
          }
        if (conditions.length) sql += " where " + conditions.join(" and ");
        const order = url.searchParams.get("order");
        if (order)
          sql +=
            " order by " +
            order
              .split(",")
              .map((o) => {
                const [column, dir] = o.split(".");
                if (!/^[a-z_]+$/.test(column)) throw Error("Bad order");
                return column + (dir === "desc" ? " desc" : " asc");
              })
              .join(",");
        sql += ` limit ${Number(url.searchParams.get("limit") ?? 1000)} offset ${Number(url.searchParams.get("offset") ?? 0)}`;
        return (await tx.query(sql, values)).rows;
      });
      await route.fulfill({
        json: result,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      console.error("Mock database request failed", url.pathname, e.message);
      await route.fulfill({ status: 400, json: { message: e.message } });
    }
  });
  // Third-party embeds aren't needed for local curation tests.
  await context.route("https://open.spotify.com/**", (route) =>
    route.fulfill({
      body: "<html>Spotify player placeholder for local tests</html>",
      contentType: "text/html",
    }),
  );
  return context;
}
try {
  const context = await contextFor();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/portal/music");
  await page
    .getByRole("heading", { name: "Music Library", exact: true })
    .waitFor();
  await page.getByText("1500 songs ·", { exact: false }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 50);
  await page.screenshot({
    path: screenshots + "/library-desktop.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 of 30").waitFor();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByLabel("Select New song 0001", { exact: true }).check();
  await page.getByRole("button", { name: "Tag songs", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Piano", { exact: true }).check();
  await page.getByRole("button", { name: "Apply tags", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByLabel("Select New song 0001", { exact: true }).check();
  await page
    .getByRole("button", { name: "Publish selected", exact: true })
    .click();
  await page
    .getByText("Selected songs are now published.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Published 148", exact: true })
    .click();
  await page.getByText("148 songs ·", { exact: false }).waitFor();
  await page.getByLabel("Search songs or artists").fill("New song 0001");
  await page.getByText("1 songs ·", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Choose position for New song 0001" })
      .count(),
    0,
  );
  await page.getByLabel("Search songs or artists").fill("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose position for New song 0001" })
    .click();
  await page.getByLabel("Position", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Save position", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  assert.ok(
    (await page.locator("tbody tr").first().innerText()).includes(
      "New song 0001",
    ),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshots + "/library-published.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Genres", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Dream Folk");
  await page
    .getByRole("button", { name: "Save category", exact: true })
    .click();
  await page.getByRole("button", { name: "Dream Folk", exact: true }).waitFor();
  await page.getByRole("button", { name: "Songs", exact: true }).click();
  await page.getByRole("button", { name: "Drafts 1499", exact: true }).click();
  await page.getByLabel("Select New song 0002", { exact: true }).check();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Archived 1", exact: true }).click();
  await page.getByLabel("Select New song 0002", { exact: true }).waitFor();
  await page.getByLabel("Select New song 0002", { exact: true }).check();
  await page
    .getByRole("button", { name: "Restore to drafts", exact: true })
    .click();
  await page.getByRole("button", { name: "Drafts 1499", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: screenshots + "/library-mobile.png",
    fullPage: false,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Playlists", exact: true }).click();
  await page.getByRole("heading", { name: "Import from Spotify" }).waitFor();
  await page.screenshot({
    path: screenshots + "/library-import.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .getByRole("button", { name: "Administrators", exact: true })
    .click();
  await page.getByText("hello@parasens.com", { exact: false }).waitFor();
  const publicContext = await contextFor(null),
    publicPage = await publicContext.newPage();
  await publicPage.goto(base + "/");
  await publicPage
    .getByRole("heading", { name: "Listen", exact: true })
    .waitFor();
  await publicPage.locator("#music .track-row").first().waitFor();
  assert.ok(
    (
      await publicPage.locator("#music .track-row").first().innerText()
    ).includes("New song 0001"),
  );
  assert.equal(await publicPage.locator("#music .track-row").count(), 148);
  const artistContext = await contextFor(artist),
    artistPage = await artistContext.newPage();
  await artistPage.goto(base + "/portal/music");
  await artistPage
    .getByText("This area is for invited administrators.")
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "UI checks passed: 1,500 drafts, 50-row paging, bulk tags, publish/archive/restore, saved positions, category creation, mobile fit, public ordering and artist denial.",
  );
  console.log("Screenshots: " + screenshots);
} finally {
  await browser.close();
  await db.close();
  server.kill();
}
