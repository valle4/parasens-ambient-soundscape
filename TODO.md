# PARASENS artist portal to-do

- Admin workspace, persistent uploads, artist/account assignments and review flow implemented on 2026-09-27. See `docs/admin-workspace-setup.md`.
- Verify custom 72-hour invitation receipt/redemption and review-email delivery with an explicitly approved test recipient. No emails were sent during implementation. Normal sign-in links remain one hour.
- Verify sign-out, repeat sign-in, link reuse/expiry, and mobile behaviour against hosted authentication before production.
- Current Supabase Free plan allows 50 MB per uploaded file. Larger audio/stem files require a storage plan/limit decision; do not purchase an upgrade without authorization.
- Add orphan-file cleanup and production retention policies; consider resumable uploads for larger files.
- Keep development separate; use a separate Supabase project before production artists submit real material.
