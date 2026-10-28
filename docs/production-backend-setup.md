# Production backend

Installed on 27 October 2026. This completes the database and server-function stage; the website is not yet connected to this backend.

## Project

- Supabase project: **PARASENS Production**, `nfpqlhkgesolnjyvvhga`.
- Region: Frankfurt (`eu-central-1`), PARASENS organisation.
- API origin: `https://nfpqlhkgesolnjyvvhga.supabase.co`.
- Website origin: `https://parasens.com` in both the `PORTAL_ORIGIN` function setting and `public.portal_runtime_settings`.
- Development remains `zsjcelwhipbwrwdzegdl`. The repository's Supabase config still identifies development; always explicitly select the production project for production deployments.

## Installed

The application schema has 23 public tables, all with row-level security enabled, and a private `portal-releases` storage bucket. Ten migration versions are recorded. The historical `202609200002_music_seed.sql` is intentionally recorded as **omitted for production**: no historical tracks or categories were imported. This prevents a later migration push from silently adding the old catalogue. Import the approved catalogue separately.

All five functions are deployed: `contact-form`, `portal-invitations`, `portal-admin`, `portal-files`, and `invite-music-admin`. They use their existing application-level session, role, token and request-validation checks; the legacy-secret-only gateway JWT check is off, matching `supabase/config.toml`.

Production email links now use the configured production origin. The existing development project retains its original fallback. An unknown project without an explicit origin fails closed.

## Reproducible preparation

Run `node scripts/prepare-production.mjs /tmp/parasens-production-deploy` to prepare reviewable SQL and single-file function bundles for the Supabase dashboard. The installer is for an empty database only and rejects a second installation. It records migration history and wraps the installation in a transaction. Do not rerun it on the installed project; apply subsequent migrations individually through the normal migration workflow.

The file function bundle pins ExcelJS to `npm:exceljs@4.4.0`. Local source keeps its existing dependency setup.

## Verification

- All 90 automated tests passed, including fresh database installation without automatic table grants, access restrictions, duplicate-install rejection, and production invitation/review links.
- Backend TypeScript checks passed. Scoped lint still reports the existing `no-unsafe-finally` finding in `portal-admin/index.ts`.
- Hosted read-only checks in `supabase/operations/verify-production.sql` confirmed row-level security, private configuration/storage, restricted invitation/contact RPCs, and required server privileges.
- Songs, submissions, uploaded-file records, invitations, contact-test records and Auth users were all zero after deployment checks.
- Unsigned empty POST requests returned: contact form `400 invalid_submission`; portal invitations `403 not_authorized`; portal administration `403`; release files `403 Sign in to access release files`; administrator invitation `401 Please sign in again`. These checks did not send email or create submissions.

## Still required before launch

Email/sign-in setup started on 27 October 2026: public signups were disabled
(save success confirmed), anonymous sign-in remains disabled, and email
confirmation remains enabled. The email provider showed a 3600-second link
expiry. Site URL `https://parasens.com` and the exact allowed redirect
`https://parasens.com/portal/auth/confirm` were saved successfully.

Production SMTP is saved with sender `PARASENS <portal@mail.parasens.com>`,
host `smtp.resend.com`, port `465`, and username `resend`. The owner created
the `PARASENS Production Auth` key and entered it themselves. A full page
reload confirmed SMTP enabled, a stored hidden password, and disabled Save.
Delivery has not yet been tested.

After the owner signed in, Resend confirmed `mail.parasens.com` is verified
and ready to send; tracking still offers setup rather than showing an active
tracking subdomain. The Auth key was prepared with **Sending access** restricted
to **mail.parasens.com**; its creation is confirmed in the key listing.

Both repository email templates are installed in production. Magic Link uses
subject `Your PARASENS sign-in link`; Invite User uses `Your PARASENS artist
portal invitation`. Preview confirmed the intended content and token-fragment
links. Magic Link was reopened to confirm persistence; Invite User showed a
successful-save notice. SMTP sign-in delivery has not yet been tested.

Two additional key forms are prepared in Chrome, each restricted to sending
from `mail.parasens.com`: `PARASENS Production Portal` and
`PARASENS Production Forms`. Their matching production secret fields are
prepared as `RESEND_API_KEY` and `CONTACT_FORM_RESEND_API_KEY`, respectively.
Both keys are confirmed created in Resend with Sending access. Both secrets
were saved in Supabase at 15:18:26 UTC on 27 October. The owner suspected a
mix-up and explicitly requested testing. One labelled contact-form test to
`hello@parasens.com` returned HTTP 200 and was delivered:
[email receipt](https://resend.com/emails/01a17df1-fdaa-7476-ba21-dad4ee8e18a6).
Its [Resend log](https://resend.com/logs/1884ba1f-1b70-4572-bcd6-bc19b4f49b44)
identifies **PARASENS Production Portal**, confirming that
`CONTACT_FORM_RESEND_API_KEY` initially held the portal-labelled key. Both
have sending permissions, so the mix-up did not prevent this email.

The owner corrected both assignments at 15:22:54 UTC. The saved SHA-256
fingerprints swapped exactly, confirming the previously tested Portal key is
now in `RESEND_API_KEY`. A fresh authorised contact-form retest returned HTTP
200 and was delivered to `hello@parasens.com` using **PARASENS Production
Forms**, as verified in the [retest log](https://resend.com/logs/8b153888-882d-4a00-9eeb-87a0d6738f39).
The [retest receipt](https://resend.com/emails/01a17df5-cab5-73d4-9670-124905e4cf28)
confirms delivery at 16:23 Europe/Stockholm. Both function-key assignments are
now correct. Retest request ID: `cb87c5a3-20b5-4d2c-be31-e8333edacc87`.
The test request ID is `b8c11b2b-f1de-48e1-be09-470b04467013`; its existing
ledger entry must be retained for idempotency. Replaying that request would
not test a corrected key because it is already marked sent. No artist
submission or account was created. Existing development keys were untouched.

1. SMTP sign-in delivery and full invitation redemption still need verification once the production website is connected. Form and portal-invitation delivery are verified. The development fallback `RESEND_API_KEY 2` remains supported and untouched.
2. Connect Dropbox and configure workbook synchronisation using `docs/dropbox-and-excel-setup.md`.
3. Import the intended music catalogue, excluding test submissions and accounts.
4. Connect Cloudflare production variables to this project, then verify real sign-in, email, upload and catalogue flows before switching the public website.

Dropbox credentials, catalogue import, Cloudflare switch and public launch remain outstanding.

## Production invitation verification — 28 October 2026

The owner explicitly approved one invitation to `hello@parasens.com`.
The legacy-only issuer check rejected the production service-role credential
through both the dashboard and a direct endpoint call. Those requests returned
403 and sent no email. The exact cause of the legacy credential mismatch was
not established; the current secret-key path was implemented and verified.

`portal-invitations` now compares the `apikey` header with the provisioned
`SUPABASE_SECRET_KEYS.default` value. `portal-admin` uses that same key for
its internal invitation call. The existing legacy bearer comparison remains
available for development. No JWT claims supplied by a caller are trusted,
and public/ordinary user credentials cannot issue invitations. This follows
Supabase's [current service-to-service guidance](https://supabase.com/docs/guides/functions/auth#service-to-service-calls).
Only these two production functions were redeployed. Existing keys and user
authorization policies were not changed.

All 92 automated checks and backend TypeScript validation passed; scoped lint
for the new authorization helper and invitation adapter passed. Hosted checks
rejected unsigned issuance (403) and a forged API key (401). A request using
the default project secret returned 201, with invitation
`def3ff07-1094-4dc8-9f41-3a45345ef5cf`, status `sent`, and expiry
31 October 2026 at 10:03 Europe/Stockholm (72 hours).

Resend confirms [delivery](https://resend.com/emails/01a181bf-ddc8-764a-979c-7e01f8a34cac)
from `PARASENS <portal@mail.parasens.com>` with subject
`Your PARASENS artist portal invitation`. Its
[request log](https://resend.com/logs/ef510d57-31d8-4df0-85f5-c6b2e9a86380)
confirms the `PARASENS Production Portal` sending key. The link targets
`https://parasens.com/portal/auth/confirm` with the one-time token in its
fragment. The token was not redeemed or saved in repository files. No Auth
user or submission was created by this test. The public website is still
unchanged; full redemption is outstanding.
