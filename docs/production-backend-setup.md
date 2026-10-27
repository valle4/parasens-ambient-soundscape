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

1. Configure production Auth URLs, signup policy and SMTP. Connect a dedicated `CONTACT_FORM_RESEND_API_KEY` for website forms and `RESEND_API_KEY` for portal notifications. The development fallback `RESEND_API_KEY 2` remains supported and untouched.
2. Connect Dropbox and configure workbook synchronisation using `docs/dropbox-and-excel-setup.md`.
3. Import the intended music catalogue, excluding test submissions and accounts.
4. Connect Cloudflare production variables to this project, then verify real sign-in, email, upload and catalogue flows before switching the public website.

No production Resend/Dropbox credentials, catalogue import, Cloudflare switch or public launch were performed in this stage.
