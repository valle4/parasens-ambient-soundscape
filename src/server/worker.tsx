import { renderToString } from "react-dom/server.browser";
import PublicApp, { type PublicPageData } from "../PublicApp";
import { loadPublicCatalogue } from "../lib/music/public-catalogue";
import { pageHtml } from "./public-page";

declare const __HTML_TEMPLATE__: string;
declare const __RENDER_VERSION__: string;
type Environment = { ASSETS: { fetch: typeof fetch } };
type Context = { waitUntil(promise: Promise<unknown>): void };

const liveLibrary = import.meta.env.VITE_MUSIC_LIBRARY_ENABLED === "true";

export default {
  async fetch(request: Request, env: Environment, context: Context): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/index.html") {
      url.pathname = "/";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname !== "/" || !["GET", "HEAD"].includes(request.method)) {
      return env.ASSETS.fetch(request);
    }

    // The cache is anonymous, scoped to this deployment and expires after one
    // minute. Never forward a visitor's cookies or Authorization to Supabase.
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    const key = new Request(`${url.origin}/?public-html=${__RENDER_VERSION__}`);
    const cached = await cache?.match(key).catch(() => undefined);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("Cache-Control", "no-cache");
      return new Response(request.method === "HEAD" ? null : cached.body, { headers });
    }

    let unavailable = false;
    const data: PublicPageData = { fetchedAt: Date.now() };
    try {
      if (liveLibrary) data.catalogue = await loadPublicCatalogue();
    } catch {
      unavailable = true;
      console.error("Public catalogue unavailable; returning retryable homepage.");
    }
    const html = pageHtml(__HTML_TEMPLATE__, renderToString(<PublicApp {...data} />), data);
    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": unavailable ? "no-store" : "no-cache",
      "X-Public-Render": unavailable ? "retry" : "server",
    });
    if (unavailable) headers.set("Retry-After", "60");
    const response = new Response(html, { status: unavailable ? 503 : 200, headers });
    if (cache && !unavailable) {
      const stored = new Response(html, { headers });
      stored.headers.set("Cache-Control", "public, max-age=60");
      context.waitUntil(cache.put(key, stored).catch(() => undefined));
    }
    return request.method === "HEAD" ? new Response(null, response) : response;
  },
};
