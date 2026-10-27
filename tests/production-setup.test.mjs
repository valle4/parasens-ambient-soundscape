import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { installationSql } from '../scripts/prepare-production.mjs';
import { portalOrigin } from '../supabase/functions/_shared/portal-origin.ts';

test('new projects fail closed without an explicit website; development keeps its existing origin', () => {
 const env = values => key => values[key];
 assert.equal(portalOrigin(env({SUPABASE_URL:'https://zsjcelwhipbwrwdzegdl.supabase.co'})), 'https://development.parasens-ambient-soundscape.pages.dev');
 assert.throws(() => portalOrigin(env({SUPABASE_URL:'https://nfpqlhkgesolnjyvvhga.supabase.co'})), /must be configured/);
 assert.equal(portalOrigin(env({PORTAL_ORIGIN:'https://parasens.com/'})), 'https://parasens.com');
 for (const value of ['http://parasens.com','https://user:pass@parasens.com','https://parasens.com/path','https://parasens.com?redirect=evil','https://parasens.com/#hash']) assert.throws(() => portalOrigin(env({PORTAL_ORIGIN:value})));
});

test('production installation creates an empty isolated schema with working server grants and private browser access', async t => {
 const db = new PGlite(); t.after(() => db.close());
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
 await db.exec(await installationSql());
 const scalar = async q => Object.values((await db.query(q)).rows[0])[0];
 for (const table of ['music_tracks','music_categories','portal_releases','portal_files','portal_invitations','contact_submissions','portal_notifications','portal_workbook_jobs']) assert.equal(await scalar('select count(*)::int from '+table),0);
 assert.equal(await scalar('select site_origin from portal_runtime_settings'),'https://parasens.com');
 assert.equal(await scalar("select public from storage.buckets where id='portal-releases'"),false);
 assert.equal(await scalar("select count(*)::int from pg_tables t join pg_class c on c.oid=(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))::regclass where t.schemaname='public' and not c.relrowsecurity"),0);
 for (const role of ['anon','authenticated']) {
  await db.exec('set role '+role);
  for (const table of ['portal_runtime_settings','portal_invitations','contact_submissions']) await assert.rejects(db.query('select * from '+table),/permission denied/);
  await assert.rejects(db.query("update portal_runtime_settings set site_origin='https://evil.example'"),/permission denied/);
  assert.equal(await scalar('select count(*)::int from music_tracks'),0);
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 for (const table of ['portal_accounts','portal_notifications','portal_invitations','portal_files','portal_dropbox_folders']) assert.equal(await scalar('select count(*)::int from '+table),0);
 assert.equal(await scalar('select portal_site_origin()'),'https://parasens.com');
 await db.exec('reset role');
 await assert.rejects(db.exec(await installationSql()),/requires an empty/);
});
