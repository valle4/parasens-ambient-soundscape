-- Run after portal-files is deployed and its Dropbox connection is verified.
-- Vault must contain portal_workbook_url (the /functions/v1/portal-files URL)
-- and portal_workbook_secret (same random secret as PORTAL_WORKBOOK_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.decrypted_secrets where name='portal_workbook_url') or not exists(select 1 from vault.decrypted_secrets where name='portal_workbook_secret') then
  raise exception 'Configure the workbook URL and worker secret in Vault first';
 end if;
end $$;
select cron.schedule('parasens-release-workbooks','* * * * *', $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='portal_workbook_url'),
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='portal_workbook_secret')),
  body := '{"action":"drain"}'::jsonb,
  timeout_milliseconds := 100000
 ) where exists(select 1 from public.portal_workbook_jobs where version>synced_version and (lease_until is null or lease_until<now()));
$job$);
