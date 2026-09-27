# Independent 72-hour artist invitations

Status: integrated with the admin workspace and deployed to the development backend on 2026-09-27. No new emails sent; real receipt/redemption remains unverified. See [admin workspace setup](admin-workspace-setup.md).
Supabase email OTP expiry must stay at 3600 seconds. Production is unchanged.

## How it works

A trusted operator issues an invitation through the `portal-invitations` Edge
Function. The database stores the email, a SHA-256 token digest and a 72-hour
deadline. It never stores the raw 256-bit invitation token. Reissuing for the same
address revokes the prior unused invitation. Pending/uncertain email delivery
cannot be redeemed.

The email opens the existing development confirmation screen. The token is in
the URL fragment, cleared from browser history and kept only in memory. No GET
request or page load accepts an invitation; the artist must click Continue.
The server claims the invitation, checks expiry/revocation, generates a fresh
Supabase login token for the email in the database, and marks the invitation used
before returning that login token. Supabase then verifies it through the existing
browser flow. For a new address, admin generateLink creates the account; public
signup remains disabled. Nothing grants the account administrator privileges.

The brief claim lease prevents simultaneous exchanges and can recover after a
provider failure. An invitation consumed just before a lost response cannot be
exchanged twice; ask for a new sign-in link or a new invitation. Refreshing the
confirmation screen also loses its in-memory token; reopen the email.

## Activate on development only

1. The user adds `RESEND_API_KEY` in Supabase → Edge Functions → Secrets. Use a
   sending-only Resend key scoped to `mail.parasens.com`. Do not paste it into
   chat, source, Cloudflare VITE variables or any public client. The existing
   SMTP password is separate configuration and must not be extracted.
2. Apply **only** `supabase/migrations/20260920180000_portal_invitations.sql`.
   Do not run every pending migration: unrelated music-library changes may be
   present. The migration is additive, transactional and grants no artist access
   to invitation records or management functions.
3. Deploy only `supabase/functions/portal-invitations` to project
   `zsjcelwhipbwrwdzegdl`. Both `index.ts` and `handler.ts` are required. The
   root `supabase/config.toml` sets `verify_jwt = false` for this function only:
   invitees are not signed in yet. Redemption instead requires the strong
   invitation token; issuing independently requires the server service-role key.
   Preserve all other functions and their settings. Supabase supplies its URL
   and service-role key to the server automatically.
4. Deploy the reviewed frontend changes on Cloudflare's `development` branch
   only. Do not accidentally include concurrent changes to other site features.
5. Before sending, verify that anonymous/user calls to `action: issue` fail, an
   invalid invitation returns a neutral error and database access is denied to
   anonymous and ordinary authenticated users. Confirm shared OTP expiry is
   still 3600 and signup is still disabled.
6. Ask the user to authorize a fresh test recipient/email. The user—not browser
   automation—opens the invitation and completes sign-in. Confirm new-account
   acceptance, replay rejection, sign-out and ordinary one-hour login. Do not
   declare the feature live until the hosted test succeeds.

## Sending invitations

Supabase's standard Authentication → Send invitation button still sends a
**one-hour native invitation**. It is not the new 72-hour issuer.

The new issuer accepts `POST /functions/v1/portal-invitations` with JSON
`{"action":"issue","email":"artist@example.com"}`. This must be called from a
trusted server/operator context using the service-role credential, never from
the website or an artist account. The response contains only the invitation ID,
expiry and delivery status. Administrators use Accounts in the admin workspace. The authenticated `portal-admin` function invokes this issuer server-side; the service credential never reaches the browser.

If delivery returns `invitation_delivery_unconfirmed`, check Resend before
retrying: the email may have been accepted even if the database update failed.
Do not blindly repeat an uncertain send. Issuing a replacement revokes the old
invitation. Keep authentication email tracking disabled.

## Local verification

Run with Node 22+ supporting TypeScript stripping:

```sh
node --experimental-strip-types --test tests/portal-auth-links.test.mjs tests/portal-invitations.test.mjs tests/portal-invitations-adapter.test.mjs
```

Tests use an in-memory PostgreSQL-compatible PGlite instance and stubbed email /
Auth providers. They do not contact live services, create hosted accounts or
send emails. Hosted provider and multi-connection behaviour still require
verification. TypeScript checking, scoped lint and the website build also passed
locally. Add endpoint abuse monitoring/rate limiting and retention policies before
production use, and use a separate production Supabase project as planned.

Sources: [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink),
[Auth implementation](https://github.com/supabase/auth/blob/master/internal/api/mail.go),
[verification](https://github.com/supabase/auth/blob/master/internal/api/verify.go),
[server secrets](https://supabase.com/docs/guides/functions/secrets).
