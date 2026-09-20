# Music Library

The Music Library lives at `/portal/music` inside the artist portal. The verified
`hello@parasens.com` account is the owner. Only the owner and explicitly invited
administrators can use it. Artist accounts keep their existing portal access.

## How it works

- Import one or several owned/collaborative Spotify playlists. Imports fetch all
  pages, validate songs, and save each complete playlist in one transaction.
- A Spotify track ID is the unique catalogue key. An import adds only missing
  IDs as drafts, including across overlapping playlists. Existing titles, tags,
  published states, archives and ordering are never overwritten by import.
- Local files, unavailable/null items and episodes are skipped and counted.
- Imports never delete songs removed from Spotify playlists. Playlist filters
  show the cumulative history of songs imported from that playlist.
- Tag multiple songs at once: add tags, replace all tags, or remove selected
  tags. A song can have several genres. A subgenre also places it in its parent
  genre. Published songs must have at least one tag.
- Archive rejected songs so repeat imports continue to skip them. Restore sends
  a song to drafts; publishing is an explicit separate action.
- Published songs have independent manual orders in All, each genre and each
  subgenre. Drag within a page, move to top, or enter an absolute position to
  move across pages. Clear search/source-playlist filters before ordering.
  Newly published (or republished) songs append to each view.
- Database reads page beyond the 1,000-row server limit; the administrator table
  shows 50 songs per page with select-page and select-all-matching controls.

## Development setup

Both music migrations were applied to `zsjcelwhipbwrwdzegdl` on 2026-09-20 through the Supabase SQL editor in one transaction. Verification returned 147 songs, 40 categories and the owner role for `hello@parasens.com`. Both migration versions are recorded in `supabase_migrations.schema_migrations`, with RLS enabled and no anon/authenticated access to that history table. All music tables have RLS enabled; anonymous callers cannot execute imports and artist accounts cannot insert administrator grants.

Supabase labels its primary branch `main / PRODUCTION`, but Cloudflare's project API confirmed that only Preview has a Supabase URL, pointing at this project; Production has no environment variables and retains deployment `8354e450-f100-446f-b237-c03bfef05c7a`. This establishes the documented development-only usage. An initial automatic review rejection was resolved by that fresh scope verification before running the migration.

The `invite-music-admin` Edge Function is deployed with gateway JWT verification disabled; it independently verifies the signed-in user and owner role. Live HTTP checks verified 147 published songs, 40 categories, no anonymous administrator role, a protected administrator list, and a 401 response to unsigned invitation requests. No invitation was sent during verification.

The `hello@parasens.com` portal account does not yet exist. Initial invitation and verified sign-in remain required. Keep production configuration unchanged.

1. Apply `supabase/migrations/202609200001_music_library.sql` followed by
   `supabase/migrations/202609200002_music_seed.sql` to development project
   `zsjcelwhipbwrwdzegdl`. The first adds tables, row-level security and checked
   write functions. The second migrates 147 existing songs and 40 categories,
   cleaning Spotify tracking parameters. Treat the seed as a one-time migration;
   do not rerun it after making curation changes.
2. Ensure the `hello@parasens.com` portal account has been invited and its email
   verified. The migration grants the role to that verified email; it does not
   create an account or send an email. Never change `user_metadata` to grant roles.
3. Deploy the `invite-music-admin` Supabase Edge Function. Its configuration uses
   `verify_jwt = false` because the function itself validates the bearer token
   with Auth `getUser` and checks the verified database owner role on every call.
   The function uses only server-side Supabase credentials supplied by the
   Edge Function environment. No service-role key belongs in the website.
4. The function defaults to allowing requests from
   `https://development.parasens-ambient-soundscape.pages.dev` only. If needed,
   set `MUSIC_PORTAL_ORIGINS` to an explicit comma-separated list of allowed
   portal origins. Existing invite email templates use the configured Site URL.
5. Set `VITE_MUSIC_LIBRARY_ENABLED=true` in development build variables after
   applying the migrations. Without this flag the public site keeps its existing
   bundled catalogue during rollout. The admin page still checks live access and
   displays a setup/error state if the migration is missing. When enabled, a
   database failure shows a retry message rather than resurrecting old archived
   songs from a fallback catalogue.

## Spotify setup

The owner provided Client ID `a42d9fd75778491faa2c109548e150b7`; it is saved in the ignored local environment file. The development redirect URI was saved and verified in the Spotify app settings. Live Spotify authorization still needs testing.

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   Select Web API and register this redirect URI exactly:
   `https://development.parasens-ambient-soundscape.pages.dev/portal/music/spotify/callback`.
2. Add the app's public Client ID as `VITE_SPOTIFY_CLIENT_ID` in development build
   variables. No Client Secret is needed: the browser uses Authorization Code
   with PKCE and validates a random state value bound to the portal user.
3. For a local connection, register `http://127.0.0.1:5173/portal/music/spotify/callback`
   as an additional Spotify redirect URI and use that exact local origin.
   Spotify does not accept `localhost` aliases for this flow.
4. Add any other importing administrators to the Spotify app's allowed users.
   The app owner needs Spotify Premium; current development-mode access only
   reads playlist contents owned by or collaborative with the connected user.
5. Sign in to the portal, open Music Library → Playlists and click Connect Spotify.
   Grant the requested read-only playlist permissions. Spotify tokens remain in
   that browser tab's session storage, are bound to the signed-in portal user,
   refresh as needed and are removed on portal sign-out. No token is sent to
   Supabase or stored in the music tables. Each administrator connects their own
   Spotify account, and can only import accessible playlists.

## Invitations

Only the owner sees Administrators. “Send administrator invitation” authorizes
one email to the entered address. New members receive the existing portal invite
email; already registered members gain admin access and use their normal portal
sign-in. Failed deliveries roll back the new access grant. If rollback itself
fails the UI explicitly reports it so the owner can remove the grant.
Removing an administrator immediately prevents subsequent database writes and
private database reads; it does not delete their artist account. The owner cannot
be removed from this screen.

## Validation

- `npm test`: PostgreSQL-compatible isolated tests cover migrations, ordinary
  artist/anonymous access, role escalation/revocation, 10-new-song reimports,
  overlapping playlists, sticky archives, bulk tagging/publishing, independent
  ordering and transaction rollback. Includes existing portal-link tests.
- `npm run typecheck`, `npm run build`.
- `npm run test:music-ui` (Google Chrome installed) starts a separate local preview on port 5174 with test-only configuration and temporary screenshots. Browser verification uses isolated test accounts and intercepted API responses
  backed by the migrations in PGlite, not live portal accounts. Check 1,500-row
  paging, selection, tagging, publishing, archiving/restoring, numeric ordering,
  genre creation, mobile layout, public ordering and denied artist access.
- After development setup: the user completes a real Spotify connection; import
  one playlist twice, then add songs and reimport. Confirm counts and preserved
  archived songs. Send invitations only to user-authorized recipients.

Sources: [Spotify PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow),
[Spotify development-mode changes](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Supabase invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).
