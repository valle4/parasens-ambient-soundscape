import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/music/spotify-embed.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  const clearTimeout = (id) => timers.delete(id);
  const context = {
    exports: {},
    clearTimeout,
    window: {
      setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    },
    document: {
      createElement: () => ({ remove() { scripts.splice(scripts.indexOf(this), 1); } }),
      head: { appendChild: (script) => scripts.push(script) },
    },
  };
  vm.runInNewContext(compiled, context);
  return { ...context, scripts, timers, load: context.exports.loadSpotifyEmbedApi };
}

test("concurrent previews share one Spotify API load and clear its timeout when ready", async () => {
  const f = fixture();
  const first = f.load();
  const second = f.load();
  assert.equal(first, second);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, "https://open.spotify.com/embed/iframe-api/v1");
  const api = {};
  f.window.onSpotifyIframeApiReady(api);
  assert.equal(await first, api);
  assert.equal(await f.load(), api);
  assert.equal(f.timers.size, 0);
});

for (const failure of ["network", "timeout"]) {
  test(`a ${failure} failure can recover on the next track selection`, async () => {
    const f = fixture();
    const pending = f.load();
    if (failure === "network") f.scripts[0].onerror();
    else [...f.timers.values()][0]();
    await assert.rejects(pending, /could not load/);
    assert.equal(f.scripts.length, 0);
    assert.equal(f.timers.size, 0);
    const retried = f.load();
    const api = {};
    f.window.onSpotifyIframeApiReady(api);
    assert.equal(await retried, api);
    assert.equal(f.scripts.length, 1);
  });
}
