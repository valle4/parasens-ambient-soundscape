# Genre deletion — prepared 29 October 2026

Backend installed on development and production on 29 October 2026. Both SQL
results confirmed `music_delete_category(uuid)` exists, anonymous execute is
denied, and authenticated execute is granted. Migration `202610290001` was
recorded in the same transaction. No existing catalogue rows were deleted.
Frontend publication and browser verification are in progress.

Website Music → Genres now offers deletion when a selected genre or subgenre
has no songs or children. The confirmation uses its saved name. Song usage
includes drafts and archived songs. The database repeats these checks under
the existing administrator transaction lock and removes only the deleted
category's saved ordering. No existing catalogue data was changed during development.

Validation passed: focused database deletion/access/preservation tests, existing
genre-edit tests, fresh production setup tests (4 tests total), application
TypeScript, scoped lint, and production build. Browser verification is pending.

Deployment procedure:

1. Apply `supabase/migrations/202610290001_music_delete_category.sql` individually
   to development (`zsjcelwhipbwrwdzegdl`) and production (`nfpqlhkgesolnjyvvhga`).
   Record migration version `202610290001` with name `music_delete_category` in
   the same transaction. Do not rerun the full production installer.
2. Verify the function exists, anonymous execute is denied, and authenticated
   execute is granted (the function checks the existing music administrator role).
3. Publish the frontend only after both backends have the function installed.
4. Verify the disabled state for a used genre and open/cancel the confirmation
   for an empty genre. Do not delete a real genre as a test.

A transaction-wrapped dashboard script is prepared locally at
`/private/tmp/parasens-install-genre-deletion.sql`; it installs the function and
records migration history without changing existing catalogue data.
