import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = (
  await readFile(
    new URL("../src/lib/music/spotify.ts", import.meta.url),
    "utf8",
  )
)
  .replace("import.meta.env.VITE_SPOTIFY_CLIENT_ID", '"test-public-client"')
  .replace(
    '"./catalogue"',
    JSON.stringify(
      new URL("../src/lib/music/catalogue.ts", import.meta.url).href,
    ),
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
let nonce = 0;
async function fixture() {
  const entries = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k) => entries.get(k) ?? null,
      setItem: (k, v) => entries.set(k, v),
      removeItem: (k) => entries.delete(k),
    },
  });
  globalThis.window = {
    location: {
      origin: "https://portal.example",
      pathname: "/portal/music/spotify/callback",
      search: "",
      assign: (url) => {
        window.assigned = url;
      },
    },
    history: {
      replaceState: () => {
        window.location.search = "";
      },
    },
  };
  const api = await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled + `\n// ${nonce++}`).toString("base64")
  );
  return { api, entries };
}
const response = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const savedFetch = globalThis.fetch;
test("Spotify connection and paginated import", async (t) => {
  try {
    await t.test(
      "PKCE connection is read-only and validates state before exchanging any code",
      async () => {
        const { api } = await fixture();
        await api.connectSpotify("owner");
        const url = new URL(window.assigned);
        assert.equal(
          url.searchParams.get("scope"),
          "playlist-read-private playlist-read-collaborative",
        );
        assert.equal(url.searchParams.get("code_challenge_method"), "S256");
        assert.equal(
          url.searchParams.get("redirect_uri"),
          "https://portal.example/portal/music/spotify/callback",
        );
        window.location.search = "?code=example&state=wrong";
        let calls = 0;
        globalThis.fetch = async () => {
          calls++;
          return response({});
        };
        await assert.rejects(api.finishSpotify("owner"), /expired/);
        assert.equal(calls, 0);
      },
    );
    await t.test(
      "callback exchanges once, binds token to the portal user and clears on disconnect",
      async () => {
        const { api } = await fixture();
        await api.connectSpotify("owner");
        const state = new URL(window.assigned).searchParams.get("state");
        window.location.search = `?code=example&state=${state}`;
        let calls = 0;
        globalThis.fetch = async (url, options) => {
          calls++;
          assert.equal(options.body.get("client_id"), "test-public-client");
          assert.equal(options.body.has("client_secret"), false);
          assert.ok(options.body.get("code_verifier"));
          return response({
            access_token: "token",
            refresh_token: "refresh",
            expires_in: 3600,
          });
        };
        await Promise.all([
          api.finishSpotify("owner"),
          api.finishSpotify("owner"),
        ]);
        assert.equal(calls, 1);
        assert.equal(api.spotifyConnected("owner"), true);
        assert.equal(api.spotifyConnected("other"), false);
        assert.equal(window.location.search, "");
        api.disconnectSpotify();
        assert.equal(api.spotifyConnected("owner"), false);
      },
    );
    await t.test(
      "reads every playlist page, reports skipped items and deduplicates songs",
      async () => {
        const { api, entries } = await fixture();
        entries.set(
          "parasens-spotify-token",
          JSON.stringify({
            userId: "owner",
            access_token: "test",
            refresh_token: "r",
            expires_at: Date.now() + 3600000,
          }),
        );
        const id = "a".repeat(22),
          track = {
            id,
            type: "track",
            name: "Song",
            artists: [{ name: "Artist" }],
          };
        const calls = [];
        globalThis.fetch = async (url) => {
          calls.push(String(url));
          if (String(url).endsWith("/playlists/" + id))
            return response({ name: "Mixed playlist" });
          if (String(url).includes("offset=50"))
            return response({
              items: [{ item: track }, { item: null }],
              next: null,
            });
          return response({
            items: [{ item: track }],
            next: `https://api.spotify.com/v1/playlists/${id}/items?offset=50`,
          });
        };
        const progress = [];
        const result = await api.readSpotifyPlaylist(id, "owner", (n) =>
          progress.push(n),
        );
        assert.equal(result.tracks.length, 1);
        assert.equal(result.skipped, 1);
        assert.equal(calls.length, 3);
        assert.deepEqual(progress, [1, 3]);
        await assert.rejects(
          api.spotifyGet("https://attacker.example/page", "owner"),
          /Invalid Spotify request/,
        );
        assert.equal(calls.length, 3);
      },
    );
    await t.test(
      "refreshes expired tokens and gives actionable errors without leaking access",
      async () => {
        const { api, entries } = await fixture();
        entries.set(
          "parasens-spotify-token",
          JSON.stringify({
            userId: "owner",
            access_token: "old",
            refresh_token: "r",
            expires_at: 0,
          }),
        );
        let count = 0;
        globalThis.fetch = async (url, options) => {
          count++;
          if (String(url).includes("/api/token"))
            return response({ access_token: "new", expires_in: 3600 });
          assert.equal(options.headers.Authorization, "Bearer new");
          return response({}, 429, { "Retry-After": "90" });
        };
        await assert.rejects(
          api.spotifyGet("me/playlists", "owner"),
          /90 seconds/,
        );
        assert.equal(count, 2);
        globalThis.fetch = async () => response({}, 403);
        await assert.rejects(
          api.spotifyGet("me/playlists", "owner"),
          /own or collaborate/,
        );
        globalThis.fetch = async () => response({}, 401);
        await assert.rejects(
          api.spotifyGet("me/playlists", "owner"),
          /reconnect/,
        );
        assert.equal(api.spotifyConnected("owner"), false);
      },
    );
  } finally {
    globalThis.fetch = savedFetch;
    delete globalThis.window;
    delete globalThis.sessionStorage;
  }
});
