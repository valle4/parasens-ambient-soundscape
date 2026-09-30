# Public contact forms

Both homepage forms use the `contact-form` Supabase Edge Function. It sends plain-text email through the existing server-side `RESEND_API_KEY` to **hello@parasens.com** only, from `PARASENS <portal@mail.parasens.com>`. Reply-To is the validated visitor address. Music submissions include the artist, track, genre, link and description; links are not fetched by the server. This form does not create portal accounts or artist releases.

## Deployment

1. Apply only `202609300001_contact_forms.sql` and record its version in `supabase_migrations.schema_migrations`.
2. Deploy `contact-form` with gateway JWT verification disabled, as declared in `supabase/config.toml`. Public visitors do not need a portal account. Validation and private database limits are enforced by the handler.
3. Keep `RESEND_API_KEY` on the server. `CONTACT_FORM_ORIGIN` defaults to `https://development.parasens-ambient-soundscape.pages.dev`; set the exact canonical origin on a separate production backend at launch. Redirect the other public hostname to the canonical one. CORS is an additional browser restriction, not bot authentication.
4. Publish the frontend on `development`. It uses the existing Preview Supabase URL and publishable key; no private keys are added to the browser. Production remains unchanged.

## Spam, failures and retries

- Server validation bounds payload size and field lengths, rejects header control characters and invalid/non-HTTP music links, and checks the hidden honeypot.
- Database reservations serialize across function instances. Limits are 3 new submissions per email per rolling hour, 30 total per rolling hour, and 100 per rolling day. Failed attempts consume capacity. The global caps also bound abuse from rotating email addresses; this is baseline spam protection, not a CAPTCHA or proof of email ownership.
- A browser request ID is bound to a keyed digest of the normalized submission. Successful replay returns success without another send. Pending/failed requests retry after 60 seconds, with at most 5 attempts. Uncertain sends cannot be retried after 23 hours because the provider's idempotency keys expire at 24 hours. Email receipt IDs are retained for investigation; message bodies and raw visitor email addresses are not stored in this ledger. Do not purge retry metadata without a deliberate retention plan.
- The UI disables sending while a request is in progress and shows success only after provider acceptance and receipt recording. Failures preserve entered text. An unchanged retry in the current page retains the same request ID. Reloading the page or editing the payload creates a new submission; check the inbox if earlier delivery was uncertain.
- If the provider accepts a message but the database receipt save fails, the UI reports uncertainty. Retry uses the same Resend idempotency key, preventing a second email within the supported retry window. No automatic confirmation email is sent to visitors.

## Verification — 30 September 2026

All 88 automated checks passed. New tests exercise the actual SQL permissions, limits, claims, idempotency, expiry, invalid input, provider/database failures, fixed recipient and Reply-To. Frontend and server type checking, scoped lint and the build passed. Chrome local checks confirmed both success views, retained text on failure, and the same request ID on retry. The local mock sent no real emails.

The migration was installed on development project `zsjcelwhipbwrwdzegdl` through Chrome. A hosted SQL check confirmed row-level security and no anonymous execution permission on the private reservation function. Cloudflare was inspected in Chrome: Production is still branch `main` with no environment variables, and Preview alone points at this backend.

Hosted deployment and the two user-approved test emails are being verified. Only hello@parasens.com is approved for these tests.

References: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
