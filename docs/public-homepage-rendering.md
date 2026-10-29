# Public homepage rendering

The homepage is rendered by a Cloudflare Pages advanced-mode Function. It uses
`PublicApp` on both server and browser; React hydrates the delivered HTML instead
of discarding it. The HTML includes the homepage copy, categories, and every
published song. The portal remains a client-side application.

`npm run build` builds the browser assets and then `dist/_worker.js` plus
`dist/_routes.json`. Keep the Pages build command as `npm run build` (or the
package-manager equivalent), with `dist` as the output directory. Running only
`vite build` omits the server renderer. `npm run dev` and `npm run preview` are
client-only previews; use a Pages preview deployment to check server rendering.

Both builds use the existing VITE_SUPABASE_URL,
VITE_SUPABASE_PUBLISHABLE_KEY and VITE_MUSIC_LIBRARY_ENABLED variables. No server
secret or new database privilege is needed. The reader always uses anonymous
requests, explicit public columns, a published-status filter, stable 500-row
pagination, and a single eight-second request deadline. It never forwards visitor
cookies or portal sessions. Draft/archived tracks and their tags/order records
are also removed before serialization.

Only `/` and `/index.html` invoke the Function. `/index.html` redirects to `/`;
assets, portal routes, and authentication callbacks retain normal Pages routing.
Successful HTML is cached at the edge for 60 seconds, with a build-specific cache
key. Browsers revalidate the document, and the public player refreshes through
its existing 30-second query freshness policy. Publishing, unpublishing, genre
changes and song ordering need no new website deployment. A failed catalogue
read returns a non-cacheable 503 with Retry-After, homepage copy, and a browser
retry path, rather than letting crawlers index a successful empty catalogue.

Track/category text is escaped by React. Initial JSON additionally escapes
HTML-sensitive characters, preventing a title from closing the data script.
No-JavaScript styles expose the scroll-reveal content, while normal browsers
retain the player, genre filters, contact forms and existing appearance.

Validation: `npm test` covers pagination beyond 1,000 records, private-track
exclusion, script-breaking text, rendered homepage and 740 songs, portal/assets
bypass, failure handling, cache lifetime and HEAD requests. Run `npm run typecheck`
and `npm run build` as well. In Chrome, verify hydrated filtering, subgenres,
player opening and absence of hydration errors. Inspect the raw homepage response
for `X-Public-Render: server`, populated `.public-track` rows, and the
`public-page-data` element; browser-rendered content alone is not an SSR check.
