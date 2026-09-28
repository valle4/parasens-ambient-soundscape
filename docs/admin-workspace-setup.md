# Admin workspace rollout

## Development implementation — 27 September 2026

The approved [admin workspace plan](admin-workspace-plan.md) is implemented. Administrators land on Submissions, with permanent Artists, Accounts and Website music navigation. Artists retain their Catalogue. The upload form now saves real drafts and private files, rather than sample records.

Database migrations `20260920180000_portal_invitations.sql` and `202609270001_admin_workspace.sql` were applied to `zsjcelwhipbwrwdzegdl` and recorded in migration history. All 12 portal tables have row-level security; the `portal-releases` bucket is private. No sample submissions or review emails were added to the hosted database.

Both `portal-invitations` and `portal-admin` were deployed through the Supabase editor, using the reviewed handler and adapter combined into each function's `index.ts`. Local source retains separate modules for testing and CLI deployments. Gateway legacy JWT verification is off for these two functions: invitation redemption requires the single-use secret token, invitation issuance requires the service credential, and every admin action independently validates the user's confirmed session and database admin role. The existing `invite-music-admin` function was preserved.

Supabase calls its primary branch “main / Production”, but the Cloudflare project API was checked again: only Preview points to this Supabase project. Production has no environment variables, remains on branch `main`, and retains deployment `8354e450-f100-446f-b237-c03bfef05c7a`. The initial automated approval rejection of the function deployment was resolved using this fresh configuration evidence.

Cloudflare development deployment `daa14753-3a96-436a-9631-93e827f73dc9` succeeded for implementation commit `a763d1ef31a02578d095b45273993cdf4ab4a631`. The development alias serves the new build, and a live browser check of `/portal/admin/submissions` correctly redirects signed-out visitors to sign-in. The live authenticated workspace and real email receipt remain for user verification.

## Behaviour and access

- New → In Review → Accepted → manually Delivered. Declines require a reason. Request changes stays In Review with an awaiting-changes badge, cleared on resubmission.
- Private admin notes and artist-visible messages are separate tables. Review history is visible to the relevant artist accounts.
- Accounts can share acts and represent several acts. Membership changes apply to subsequent database/file requests. Already issued signed file URLs expire after five minutes.
- Admins can edit artist labels and existing website genre tags. Suggested names require admin approval, which links the submitting account to the approved act.
- Drafts are shared by accounts assigned to their act. Unassigned/suggested-act drafts are visible only to their creator and admins.
- All admins can manage accounts; removing owner access or demoting the current admin is rejected.
- Server saves use revision checks to prevent concurrent edits silently overwriting one another.
- Submissions are paginated; private file links and players load only when opened. Website music curation stays separate from submission acceptance.

## Email

`RESEND_API_KEY` is supplied privately in Supabase Secrets (confirmed by the user). Sender is `PARASENS <portal@mail.parasens.com>`.

Review email jobs are created only for declines and change requests. The server claims jobs, uses Resend idempotency keys and exposes failed/pending delivery in the review screen. Retries after an ambiguous attempt beyond 23 hours require provider inspection rather than risking duplicate mail. Dispatch handles five recipients per request; remaining recipients stay visibly pending and can be sent using Retry pending emails. Ordinary messages, acceptance and delivery do not send email.

Accounts uses the custom 72-hour invitation flow. Existing users retain normal sign-in instead of receiving a duplicate invitation. Uncertain invitation delivery must be checked in Resend before reissuing. Regular Supabase sign-in expiry remains unchanged at one hour.

No real emails were sent during this rollout. Hosted unauthenticated checks returned 403 for invitation issuance (with no recipient) and the read-only admin status endpoint. Real invitation receipt/redemption and real review-email receipt still need an explicitly approved recipient and user sign-in.

## Upload limit and operations

The Supabase Free plan's global limit was verified in Storage → Settings: **50 MB per file**. The form displays and validates that limit before uploading. The bucket/schema permit up to 500 MB for future configuration, but the global 50 MB cap takes precedence. Larger WAVs/stem archives require an authorized storage-plan/limit change and matching frontend validation adjustment. Uploads currently use whole-file retries, not resumable transfers.

Removing a file revokes its portal metadata/access; it does not purge the underlying object. Add an operator retention/cleanup policy for orphaned objects before production. Keep a separate production Supabase project, and verify real multi-account and email flows before opening production to artists.

## Verification

71 automated checks passed, covering SQL permissions and state transitions, shared acts and reassignment, optimistic edits, file reservations/access, private notes, notification claims, invitation expiry/replay/reissue, existing music-library curation and cursor/drag behaviour. Type checking, scoped lint and the development build passed.

An isolated browser preview using the real migrations with local test accounts verified: admin landing/navigation; private notes hidden from artist view; change request, actual WAV upload and resubmission; on-demand private file link; acceptance and manual delivery; editing artist genre tags. Test data stayed local.

## Direct artist/account assignment update — 27 September 2026

Migration `202609270002_artist_account_assignment.sql` applied and recorded in migration history on 27 September 2026 after Supabase reauthentication. Publishing the tested frontend to development; production has no Supabase connection and remains unchanged.

- Artists → Add/Edit artist includes searchable account checkboxes; Save artist saves profile and memberships together.
- Accounts → Edit access → Add artist includes name, label and genre fields. Create & assign artist immediately creates and links the artist, preserving other memberships and account roles. Other unsaved account edits remain pending until Save access.
- While inviting a new account, inline creation selects the new artist; Save & send invitation creates the account and applies its selected artists.
- Apply `202609270002_artist_account_assignment.sql` before publishing the frontend. Its admin-only function performs the profile save and membership changes in one transaction, validates accounts and never updates account roles or unrelated artists' memberships.
- Isolated browser checks passed for creation with an assigned account and inline creation/assignment with an existing artist preserved. Database tests cover rollback, shared assignments, duplicate names, access restrictions and preservation of roles. Type checking, scoped lint and development build passed.

## Artist deletion — 28 September 2026

- Applied and recorded `202609270004_delete_artist.sql` on the development database `zsjcelwhipbwrwdzegdl` before publishing the UI. No artists were deleted during installation.
- Artists → Edit artist → Delete artist opens a named confirmation. Cancel makes no changes; errors remain visible and allow retry.
- The admin-only RPC locks the artist, refuses deletion when any releases reference it, and removes unused artists with their genre/account links. Accounts, roles, labels, genre definitions and website music remain intact.
- Local database and browser tests cover permissions, linked-release protection, cascading assignments, preserved data, cancellation, errors, retry and list refresh. Type checking, scoped lint and the development build passed.
