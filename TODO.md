# PARASENS artist portal to-do

- Verify SMTP delivery, real login, and sign-out with an authorized test recipient on the development site; configuration and templates are saved. See `docs/portal-auth-setup.md`.
- Keep authentication on development only until end-to-end testing is complete; production remains unchanged.
- Add database ownership policies and verify isolation between two artist accounts before storing real submissions or connecting Dropbox.

- Connect artist accounts to one or more approved artist names.
- Populate the New Release “Primary artist” dropdown from the names assigned to the signed-in account.
- Ensure an artist can never view or select names belonging to another account.
- Provide an admin tool for adding, removing, and reassigning artist names.
