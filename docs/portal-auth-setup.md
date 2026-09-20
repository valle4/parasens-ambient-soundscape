# PARASENS portal login setup

The login integration is scoped to development only. Supabase SMTP,
invitation-only signup settings, development sign-in URLs, and both email
templates are configured. Email-link expiry (3600 seconds) and the Cloudflare
Preview build variables were verified on 2026-09-20. The user authorized
publishing the prepared login to development. Verify Cloudflare reports a
successful deployment of this login commit before sending any invitation;
an email recipient still needs the user's approval.

The Supabase MCP entry is configured in Codex, restricted to this project and
the docs, database, debugging, and development feature groups. The user
explicitly approved persistent database read/write access plus organization,
project, and diagnostic-log read access, then completed browser authorization.
The CLI confirmed successful authorization on 2026-09-07. After reloading,
the project URL and empty public schema were verified through MCP, and the
security advisor returned no notices. Do not request the same authorization again.
MCP's documented tools do not include updating Auth configuration or SMTP.

Initial setup checks on 2026-09-07 found public registration enabled and custom
SMTP disabled. SMTP has since been configured (see Email delivery below).
On 2026-09-17 the user switched public signups off and the setting was saved.
A read-only check of `/auth/v1/settings` confirmed `disable_signup: true`,
`external.anonymous_users: false`, and `mailer_autoconfirm: false`; email
authentication remains enabled. Public self-registration is therefore disabled
and email confirmation remains required. The Cloudflare project
initially had no preview build variables. A scoped API attempt returned error
10000 (Authentication error). The three Preview variables were subsequently saved
through Safari on 2026-09-20 and verified by a read-only API check. Production
variables remain empty, the production branch is still `main`, and its deployment
remains `8354e450-f100-446f-b237-c03bfef05c7a`. Production must remain unchanged.

## Supabase project

Project: `zsjcelwhipbwrwdzegdl`. Public API URL:
`https://zsjcelwhipbwrwdzegdl.supabase.co`.

- Completed: in Authentication > Sign In / Providers, **Allow new users to sign
  up** is disabled. Anonymous sign-ins remain disabled and email confirmation
  remains enabled. The UI
  passes `shouldCreateUser: false`, but only the server setting enforces this.
- Completed: Site URL is `https://development.parasens-ambient-soundscape.pages.dev`
  (without a trailing slash), replacing the localhost default.
- Completed: the only allowed redirect URL is
  `https://development.parasens-ambient-soundscape.pages.dev/portal/auth/confirm`.
- Verified on 2026-09-20: email link expiration is 3600 seconds. This setting applies to
  invitation links as well as repeat sign-in links.
- Completed: the Magic Link template uses `supabase/templates/magic-link.html`.
  Subject: `Your PARASENS sign-in link`.
- Completed: the Invite User template uses `supabase/templates/invite.html`.
  Subject: `Your PARASENS artist portal invitation`.

The user explicitly approved the development sign-in destination and both
template changes. They were saved through Safari on 2026-09-17. Reopening the
URL configuration after a full page reload confirmed the exact Site URL and
one redirect URL, without wildcards. Both templates were reloaded and checked
in Preview, including subjects, complete text, and token-hash links with types
`email` and `invite`. The three local authentication-link tests pass. No emails
were sent, and production and Cloudflare deployment settings were unchanged.

The templates deliberately use Site URL rather than a user-supplied redirect.
Links arrive at a confirmation page with the one-time token in the URL fragment,
which is not sent in HTTP requests. The app clears the fragment, retains the
token in memory and verifies it only after the person clicks Continue. This
helps prevent email link scanners from consuming it. Reopening the email link
is necessary after refreshing the confirmation page before verification.

## Email delivery

The user selected `mail.parasens.com` on 2026-09-17 for Resend sending.
Configured sender: `PARASENS <portal@mail.parasens.com>`.
Cloudflare's record list and public DNS checks on that date showed no records
at or below `mail.parasens.com`; public DNS returned NXDOMAIN.

After the desktop app restart, Safari access was restored and the correct Resend
account (`hello@parasens.com`, workspace `parasens`) was verified. The domain was
created in Resend in Ireland (`eu-west-1`), ID
`178e817f-25e2-4426-8028-49cf7a1a6db1`. Sending is enabled and receiving remains
disabled. The Cloudflare connector rejected the create-record request with
error 10000 (Authentication error), so the user signed into Cloudflare in Safari.
After explicit confirmation, the three records below were saved through the
dashboard on 2026-09-17. A read-only API comparison confirmed all 11 original
records were unchanged and exactly three matching records were added (14 total).
Public DNS also returned the correct TXT and both DNS-only CNAME records.
Resend's verification completed on 2026-09-17 at 16:42 Europe/Stockholm. The
domain and all three records now show Verified, with the domain ready to send
emails. The user subsequently created the private Resend key and entered and
saved it in Supabase themselves. Reopening Supabase's SMTP page confirmed
custom SMTP enabled with sender `PARASENS <portal@mail.parasens.com>`, host
`smtp.resend.com`, port `465`, username `resend`, and a 60-second per-user
interval. Save changes was disabled after loading the persisted settings; the
saved password was not revealed. SMTP delivery is not yet tested. No emails
were sent and no website deployment was performed.
Do not perform login or accept terms on the user's behalf.

Resend's actual generated records for this domain (all TTL Auto, CNAMEs DNS-only):

| Type | Name within parasens.com | Content |
| --- | --- | --- |
| TXT | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDYc1uSgHh4Pae9l0o06ILAGLCisWcU/0syTZm9vrG4fRHJ2arUiAHvmqCGrb8jUM4UWFuuLsI5xDjc6WA5RWVd4dODr5LqZL3ni2DLlKZqhtg/pDJ+dH+GB8GZoJ5wHVIk1+4ReMTunJbpUxc5N5YjrXmjFE6opBW8CS2Mz+jz8QIDAQAB` |
| CNAME | `rsend.mail` | `rsend-euw1.forge.rmta.net` |
| CNAME | `send.mail` | `send.forge.rmta.net` |

These are intentionally different from the old notify-domain records. Do not
substitute older Amazon SES MX/SPF instructions or the notify domain's DKIM key.
The Resend Configuration page shows “Enable tracking metrics” with a Configure
link leading to a new tracking-subdomain form. No tracking subdomain was added;
do not enable tracking for authentication emails. Recheck the effective tracking
state after verification and when configuring SMTP.

Preserve the existing `notify.parasens.com` delegation to `ns3.lovable.cloud`
and `ns4.lovable.cloud`. The 2026-09-07 check found Mailgun SPF and MX records
served by those nameservers. The earlier unverified Resend entry for
`notify.parasens.com` is not the chosen sending domain. Do not remove its live
DNS delegation or buy an upgrade to add the selected domain without approval.

Resend custom SMTP is now configured; verify delivery with an approved test
recipient after the remaining Auth settings and email templates are configured.
Preserve existing mailbox MX records. Disable link tracking. Store SMTP secrets
in the Supabase dashboard only, never in website source or VITE variables.
Supabase's default sender only reaches authorized project-team addresses and
has restrictive limits; it is not suitable for artist invitations.

Do not send any invitation or test email without authorization for its recipient.
The user performs real sign-in and service authorization themselves.

## Website configuration and deployment

Local connection values are in the ignored `.env.local`. The same
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are saved as Cloudflare Pages
**Preview** build variables, along with `NODE_VERSION=22`. These are public identifiers, not administrative
credentials. Never use a secret or service-role key here. Supabase JS requires
Node 22 or newer for the build environment.

Publish only the `development` branch after configuration and verification.
Do not change the production branch or production environment settings. Use a
separate Supabase project for production before artists submit real material.

## Verification before launch

- An invited test account receives a link; user verifies it and reaches dashboard.
- A second use of that link and an expired link show a recoverable error.
- An uninvited address gets the same neutral screen without an account created.
- Direct public signup is disabled at Supabase, not just hidden in the UI.
- Opening `/portal/dashboard` or `/portal/releases/new` without a valid session
  redirects to sign-in; a forged stored user object does not grant access.
- Signing out clears this browser's session and cached data; back and refresh
  cannot reopen protected screens. Auth events in another tab are handled too.
- Verify invitation and sign-in emails on mobile and desktop.

## Remaining portal work

The catalogue is explicitly labeled sample data, and the release form does not
save or upload anything yet. Browser route guards protect navigation only; when
real data is added, enforce ownership and admin roles using database RLS and
server-side authorization, including Dropbox downloads. Do not place private
files or data in this static site's bundle. Account-to-artist mapping stays in
`TODO.md`. Do not regard login alone as completion of data isolation.

Sources: [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[email templates and scanners](https://supabase.com/docs/guides/auth/auth-email-templates),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[registration settings](https://supabase.com/docs/guides/auth/general-configuration).
