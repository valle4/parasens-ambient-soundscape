# Dropbox storage and submission workbooks

## Implementation status

Deployed to development on 2026-09-28 (application commit `2620787`, successful Cloudflare deployment `0fa85241-42a0-44cc-9c84-3b01299edcec`). Migration `202609280001` and `portal-files` are deployed to `zsjcelwhipbwrwdzegdl`. Cloudflare Preview uses this project and has `VITE_PORTAL_DROPBOX_ENABLED=true`; Production has no Supabase variables. The four Dropbox scopes below were explicitly approved, the destination account was verified, and credentials were saved in Edge Function secrets. Vault and the once-per-minute workbook job are configured; the first cron run succeeded. The deployed function rejects unsigned requests (403), and the authenticated worker returns 200. Hosted upload and export acceptance checks await an authenticated portal session.

Local verification: all 78 automated checks passed, including the existing workspace lifecycle against the new migration. Frontend and server TypeScript checks, scoped lint and the development build passed. `tests/portal-export-ui.mjs` verified actual downloaded Excel files, filtered/all/single export requests, error recovery, workbook retries and desktop/mobile layout. Existing uploaded files were not moved.

Destination account requested by the owner: `manne.skafvenstedt@gmail.com`.

## Behaviour

- Admin Submissions has **Export this view** and **Export all submissions**. Individual releases have **Export release to Excel**. Exports include all matching submissions, independent of the 25-row UI page and Supabase's row limit, from one transactional snapshot.
- Workbooks have Releases, Tracks, Files, Review history, Messages and About sheets. Admin downloads also include Private admin notes. Long text is retained in numbered parts in Full text. Submitted strings are written as literal Excel strings, not executable formulas. Dates are UTC, with numeric and boolean cells kept typed.
- Every new release captures its creator's name and email. Each new file captures the actual uploading account, including when several accounts share an artist. Existing files have unknown uploaders, not a guessed creator.
- Paths are `/Parasens/Account name — email [account UUID]/Artist/Release [release UUID]/Audio|Stems|Artwork/file UUID — filename`. Identifiers prevent duplicate names and sanitization collisions. Each uploader has their own folder for a shared release. Folders remain stable after creation; current titles and artist names appear in the workbook.
- `Release info.xlsx` is maintained in each uploader's release folder. Private admin notes never enter these copies. Workbook updates do not create shared links or grant Dropbox access to artists. If a release has no files, its workbook goes under its creator's account.
- Existing Supabase files continue using private Supabase URLs. New Dropbox files require current release access before the server issues a temporary download link. Dropbox links remain usable for up to four hours once issued; Supabase links expire in five minutes.
- Browser uploads use a one-use Dropbox URL for a reserved path. The server verifies Dropbox's actual path, object type and byte count before completion. Interrupted confirmation retains the reservation, with **Retry confirmation** in the upload form.
- Upload limit remains 50 MB. A larger-file/resumable workflow is a separate change.
- File removal revokes portal access by removing its record. As with the prior implementation, underlying objects are retained; no automatic destructive migration or purging is performed.

## Deployment order

1. Apply `supabase/migrations/202609280001_dropbox_exports.sql` to the development Supabase project and record migration version `202609280001` in its migration history. The migration does not move or delete uploaded files.
2. Create a scoped Dropbox app. **App folder** restricts access to the integration folder; the visible path is `Apps/<app name>/Parasens/...`. To place `Parasens` directly at the Dropbox root requires **Full Dropbox** access and explicit owner approval of that broader scope. The prepared app name is **Parasens Artist Portal**.
3. Enable only `account_info.read`, `files.metadata.read`, `files.content.read`, and `files.content.write`. Authorize the requested destination account using authorization-code OAuth with `token_access_type=offline`. Store the resulting refresh token in server secrets, never in frontend variables, source, chat or logs.
4. Set Supabase Edge Function secrets:
   - `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`
   - `DROPBOX_ACCOUNT_EMAIL=manne.skafvenstedt@gmail.com` (checked against Dropbox before uploads)
   - `DROPBOX_WEB_ROOT=/Apps/Parasens Artist Portal` for the prepared App folder app; empty for Full Dropbox. Use the exact folder Dropbox creates. This is used for account-authenticated links in Excel.
   - `PORTAL_ORIGIN=https://development.parasens-ambient-soundscape.pages.dev`
   - `PORTAL_WORKBOOK_SECRET`: a randomly generated secret used only by the workbook worker
   - `PORTAL_UPLOAD_PROVIDER=dropbox` only once the connection is ready.
5. Deploy `portal-files`, including its `deno.json` and `../_shared/release-workbook.ts`. The gateway's legacy JWT check is off, but every user request validates `Auth.getUser`, a confirmed email and current database permissions. The dedicated worker secret permits only `drain`, never upload, download or user actions.
6. Store `portal_workbook_url` and `portal_workbook_secret` in Supabase Vault. The URL is `https://zsjcelwhipbwrwdzegdl.supabase.co/functions/v1/portal-files`. The secret must match `PORTAL_WORKBOOK_SECRET`. Run `supabase/operations/schedule-workbooks.sql` to schedule a durable retry every minute. Check its cron run history and the file function's response; scheduling is part of activation, not optional.
7. Call the authenticated `status` action as an administrator. It must verify the expected Dropbox account. Then set Cloudflare **Preview** `VITE_PORTAL_DROPBOX_ENABLED=true` and deploy the frontend to `development`. Production has its own setup and must not be switched implicitly.
8. Test an authorized small audio upload, download, submission, admin status change, per-release workbook update, filtered and complete admin exports, and an interrupted confirmation retry. Inspect Dropbox to verify folder placement and the real Excel files. Check that an unrelated artist cannot read the file and that private notes appear only in admin downloads.

Database triggers enqueue workbook updates on releases, files, review events and artist-visible messages. Browser actions request an immediate attempt; cron handles a closed browser or failure. Per-release leases prevent concurrent writers, and versioned completion leaves newer edits pending. Dropbox requests time out within 90 seconds, before the ten-minute lease expires. Failed jobs move to the end of the queue so they do not block other releases. The portal displays pending/failed workbooks and provides retry.

## Rollback and existing files

Set Preview `VITE_PORTAL_DROPBOX_ENABLED=false` and redeploy to resume Supabase uploads. Keep `portal-files` and the Dropbox credentials available so already-uploaded Dropbox files remain downloadable. Do not delete either storage backend or the migration. Moving existing Supabase uploads is a separate, auditable copy-and-verify operation; original file uploaders are unknown where the old system did not record them.

## References

- https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/get-temporary-upload-link
- https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/get-temporary-link
- https://dropbox.tech/developers/using-oauth-2-0-with-offline-access
- https://supabase.com/docs/guides/functions/schedule-functions
