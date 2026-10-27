-- Read-only verification for PARASENS Production (nfpqlhkgesolnjyvvhga).
with checks as (
select
 (select count(*) from pg_tables where schemaname='public') as application_tables,
 (select bool_and(rowsecurity) from pg_tables where schemaname='public') as all_tables_rls,
 (select count(*) from supabase_migrations.schema_migrations) as migration_records,
 (select count(*) from public.music_tracks) as songs,
 (select count(*) from public.portal_releases) as submissions,
 (select count(*) from public.portal_files) as uploaded_file_records,
 (select count(*) from public.portal_invitations) as invitations,
 (select count(*) from public.contact_submissions) as contact_tests,
 (select count(*) from auth.users) as users,
 (select not public from storage.buckets where id='portal-releases') as storage_private,
 public.portal_site_origin() as site_origin,
 has_table_privilege('service_role','public.portal_accounts','SELECT,INSERT,UPDATE') as server_account_access,
 has_table_privilege('service_role','public.portal_notifications','SELECT,UPDATE') as server_notification_access,
 not has_table_privilege('anon','public.portal_runtime_settings','SELECT') as configuration_private,
 not has_function_privilege('anon','public.issue_portal_invitation(text,text)','EXECUTE') as invitation_issuance_private,
 not has_function_privilege('anon','public.claim_contact_submission(uuid,text,text,uuid)','EXECUTE') as contact_claim_private
)
select result.key as check_name, result.value as result
from checks, lateral jsonb_each_text(to_jsonb(checks)) as result
order by result.key;
