# Public contact forms

Both homepage forms use the `contact-form` Supabase Edge Function. It sends plain-text email through the dedicated server-side `RESEND_API_KEY 2` to **hello@parasens.com** only, from `PARASENS <portal@mail.parasens.com>`. Reply-To is the validated visitor address. Music submissions include the artist, track, genre, link and description; links are not fetched by the server. This form does not create portal accounts or artist releases.

## Deployment

1. Apply only `202609300001_contact_forms.sql` and record its version in `supabase_migrations.schema_migrations`.
2. Deploy `contact-form` with gateway JWT verification disabled, as declared in `supabase/config.toml`. Public visitors do not need a portal account. Validation and private database limits are enforced by the handler.
3. Keep `RESEND_API_KEY 2` on the server. This exact name matches the dedicated website-forms key saved by the owner. Portal invitations and release notifications continue to use their existing `RESEND_API_KEY`; do not replace that shared secret or the separate Supabase Auth SMTP credential when configuring these forms. `CONTACT_FORM_ORIGIN` defaults to `https://development.parasens-ambient-soundscape.pages.dev`; set the exact canonical origin on a separate production backend at launch. Redirect the other public hostname to the canonical one. CORS is an additional browser restriction, not bot authentication.
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

Cloudflare development deployment `345359e0-b2d8-4bbe-ac76-4627d7ea2a12` successfully published commit `1f2b66f6bf9a907e459f3df2792ab5798b587ae4`. The function was deployed through Chrome as the handler plus adapter combined into one `index.ts`; gateway JWT verification was disabled for this new public endpoint. A hosted honeypot request returned 400 without email. The development form correctly showed pending/disabled controls and preserved the text after a provider failure.

## Separate sending key — 1 October 2026

The initial 30 September message test was rejected with HTTP 401 using the shared `RESEND_API_KEY`; Resend showed no sent email. That request (`e908665f-ac02-4340-a483-a23713e88fad`) failed twice and is now beyond the retry window. The owner created a dedicated **PARASENS website forms** sending key and saved it in Supabase under `RESEND_API_KEY 2`. Only `contact-form` was updated to use that separate secret. The existing portal functions, shared secret, SMTP settings and email templates are unchanged.

The dedicated-key function was deployed through Chrome on 1 October. Server type checking and all 10 contact-form tests passed. A fresh approved message test failed twice; the second attempt retained the same browser request ID. Safe provider diagnostics report HTTP 400, `validation_error`, field category `api key`. Resend shows the dedicated key with Sending access for mail.parasens.com but no activity and no sent test emails. The separate secret value needs correction by the owner; its editor is prepared in Chrome. Do not overwrite the original shared secret. Delivery is not yet verified, and the music test has not been sent. The browser retains the current message payload and request ID for retry. Only hello@parasens.com is approved for the two test emails.

References: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
