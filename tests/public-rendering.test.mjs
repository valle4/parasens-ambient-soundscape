import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { fetchPublicCatalogue } from '../src/lib/music/public-catalogue.ts';
import { serializePageData, pageHtml } from '../src/server/public-page.ts';

const track = (id, status = 'published') => ({ id, title: `Song ${id}`, artist: 'Artist', status, created_at: '2026-10-29', published_at: '2026-10-29' });
const category = { id: 'genre', name: 'Piano', parent_id: null, position: 0 };
const database = (tracks) => ({
  music_tracks: tracks,
  music_categories: [category],
  music_track_categories: tracks.map(t => ({ track_id: t.id, category_id: category.id })),
  music_orders: tracks.map((t, position) => ({ track_id: t.id, scope: 'all', position })),
});
function reader(tables, requests = []) {
  return async (input, options) => {
    const url = new URL(input);
    requests.push({ url, options });
    const start = Number(url.searchParams.get('offset'));
    return Response.json(tables[url.pathname.split('/').at(-1)].slice(start, start + 500));
  };
}

test('anonymous public catalogue reads all pages, omits private tracks and associated metadata', async () => {
  const tables = database([...Array.from({ length: 1205 }, (_, i) => track(String(i))), track('draft', 'draft'), track('archived', 'archived')]);
  const requests = [];
  const data = await fetchPublicCatalogue('https://test.supabase.co', 'sb_publishable_test', reader(tables, requests));
  assert.equal(data.tracks.length, 1205);
  assert.equal(data.tags.length, 1205);
  assert.equal(data.orders.length, 1205);
  assert.ok(!JSON.stringify(data).includes('archived'));
  for (const { url, options } of requests) {
    assert.deepEqual(options.headers, { apikey: 'sb_publishable_test' });
    assert.equal(options.credentials, 'omit');
    assert.notEqual(url.searchParams.get('select'), '*');
    if (url.pathname.endsWith('music_tracks')) assert.equal(url.searchParams.get('status'), 'eq.published');
  }
  assert.ok(requests.some(r => r.url.searchParams.get('offset') === '1000'));
});

test('failed public reads reject instead of returning an empty catalogue', async () => {
  await assert.rejects(fetchPublicCatalogue('https://test.supabase.co', 'sb_publishable_test', async () => new Response('unavailable', { status: 503 })));
});

test('page data cannot break out of its script or trigger HTML replacement substitutions', () => {
  const data = { title: '</script><script>alert(1)</script> & \u2028 $&' };
  const serialized = serializePageData(data);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), data);
  const html = pageHtml('<div id="root"></div>', '<p>$&</p>', data);
  assert.ok(html.includes('<p>$&</p>'));
  assert.equal((html.match(/<script/g) ?? []).length, 1);
});

let worker, directory;
const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;
before(async () => {
  directory = await mkdtemp(`${tmpdir()}/parasens-public-render-`);
  await build({
    mode: 'production', logLevel: 'error',
    define: {
      __HTML_TEMPLATE__: JSON.stringify('<html><head><title>PARASENS</title></head><body><div id="root"></div></body></html>'),
      __RENDER_VERSION__: JSON.stringify('test-version'),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_test'),
      'import.meta.env.VITE_MUSIC_LIBRARY_ENABLED': JSON.stringify('true'),
    },
    ssr: { target: 'webworker', noExternal: true },
    build: { ssr: 'src/server/worker.tsx', outDir: directory, emptyOutDir: true, copyPublicDir: false, minify: true,
      rollupOptions: { output: { entryFileNames: 'worker.mjs', inlineDynamicImports: true } } },
  });
  worker = (await import(pathToFileURL(`${directory}/worker.mjs`))).default;
});
after(async () => {
  globalThis.fetch = originalFetch;
  globalThis.caches = originalCaches;
  if (directory) await rm(directory, { recursive: true, force: true });
});
const assetCalls = [];
const env = { ASSETS: { fetch: async request => { assetCalls.push(request); return new Response('static SPA'); } } };
const context = { waitUntil: promise => promise };

test('initial HTML includes homepage and all 740 published songs, safely escaped, without browser globals', async () => {
  const songs = Array.from({ length: 740 }, (_, i) => track(String(i)));
  songs[0].title = '</script><script>alert(1)</script>';
  globalThis.fetch = reader(database([...songs, track('PRIVATE', 'draft')]));
  globalThis.caches = undefined;
  const response = await worker.fetch(new Request('https://parasens.com/', { headers: { Cookie: 'portal-session=secret', Authorization: 'Bearer private' } }), env, context);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Public-Render'), 'server');
  assert.equal((html.match(/class="public-track /g) ?? []).length, 740);
  assert.ok(html.includes('simplify the path between artists and labels'));
  assert.ok(html.includes('Song 739'));
  assert.ok(html.includes('Submit Music'));
  assert.ok(!html.includes('PRIVATE'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  const data = JSON.parse(html.match(/id="public-page-data" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.equal(data.catalogue.tracks.length, 740);
  assert.equal(data.catalogue.tracks[0].title, songs[0].title);
});

test('portal, callback and assets bypass public rendering; index.html redirects and preserves query', async () => {
  globalThis.fetch = async () => { throw new Error('Public fetch must not run.'); };
  for (const path of ['/portal', '/portal/auth/confirm?token_hash=private', '/assets/main.js', '/favicon.ico']) {
    const response = await worker.fetch(new Request(`https://parasens.com${path}`), env, context);
    assert.equal(await response.text(), 'static SPA');
    assert.equal(assetCalls.at(-1).url, `https://parasens.com${path}`);
  }
  const response = await worker.fetch(new Request('https://parasens.com/index.html?utm_source=test'), env, context);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://parasens.com/?utm_source=test');
});

test('outage returns a retryable 503 with homepage content and no cached empty music list', async () => {
  globalThis.fetch = async () => new Response('offline', { status: 503 });
  let stored = false;
  globalThis.caches = { default: { match: async () => undefined, put: async () => { stored = true; } } };
  const response = await worker.fetch(new Request('https://parasens.com/'), env, context);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.ok((await response.text()).includes('simplify the path between artists and labels'));
  assert.equal(stored, false);
});

test('successful HTML cache expires in 60 seconds, isolates deployments and HEAD returns no body', async () => {
  globalThis.fetch = reader(database([track('one')]));
  let key, stored;
  globalThis.caches = { default: {
    match: async candidate => { if (key?.url === candidate.url) return stored.clone(); },
    put: async (candidate, response) => { key = candidate; stored = response; },
  } };
  const first = await worker.fetch(new Request('https://parasens.com/?utm_source=test'), env, context);
  assert.equal(first.status, 200);
  assert.equal(key.url, 'https://parasens.com/?public-html=test-version');
  assert.equal(stored.headers.get('Cache-Control'), 'public, max-age=60');
  globalThis.fetch = async () => { throw new Error('Should use cache'); };
  const second = await worker.fetch(new Request('https://parasens.com/', { method: 'HEAD' }), env, context);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get('Cache-Control'), 'no-cache');
  assert.equal(await second.text(), '');
});
