import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
export const productionProject = 'nfpqlhkgesolnjyvvhga';
export const productionOrigin = 'https://parasens.com';
export const functions = ['contact-form', 'portal-invitations', 'portal-admin', 'portal-files', 'invite-music-admin'];
export async function installationSql() {
  const names = (await readdir(resolve(root, 'supabase/migrations'))).filter(n => n.endsWith('.sql')).sort();
  const chunks = [`-- ONLY for the empty PARASENS Production project ${productionProject}.
-- Schema only. The historical seed is deliberately skipped; catalogue import is separate.
begin;
do $$ begin
 if to_regclass('public.music_tracks') is not null or to_regclass('public.portal_releases') is not null then
  raise exception 'Installation requires an empty application database; do not rerun';
 end if;
end $$;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
alter table supabase_migrations.schema_migrations enable row level security;
revoke all on supabase_migrations.schema_migrations from public, anon, authenticated;
`];
  for (const name of names) {
    const [version, ...parts] = name.replace(/\.sql$/, '').split('_');
    if (name === '202609200002_music_seed.sql') {
      chunks.push(`-- Intentional production baseline: no historical songs or categories imported.
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('${version}','music_seed_omitted_for_production',ARRAY['Historical seed intentionally omitted; curated catalogue imported separately.']);`);
      continue;
    }
    const source = await readFile(resolve(root, 'supabase/migrations', name), 'utf8');
    chunks.push(source.replace(/^\s*(begin|commit);\s*$/gim, ''));
    chunks.push(`insert into supabase_migrations.schema_migrations(version,name) values ('${version}','${parts.join('_')}');`);
  }
  chunks.push(`update public.portal_runtime_settings set site_origin='${productionOrigin}' where singleton;
commit;
select 'production_schema_installed' as result,
 (select count(*) from public.music_tracks) as songs,
 (select count(*) from public.portal_releases) as submissions,
 (select count(*) from auth.users) as users,
 (select site_origin from public.portal_runtime_settings) as site_origin;`);
  return chunks.join('\n\n');
}

export async function prepare(output) {
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'install.sql'), await installationSql());
  for (const name of functions) {
    const result = await build({ entryPoints: [resolve(root, 'supabase/functions', name, 'index.ts')], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', external: ['https://*', 'npm:*', 'exceljs'], write: false });
    // Supabase's dashboard deploys a single file; pin the workbook dependency there too.
    await writeFile(resolve(output, name + '.ts'), result.outputFiles[0].text.replace('from "exceljs"', 'from "npm:exceljs@4.4.0"'));
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ project: productionProject, origin: productionOrigin, functions, historicalSeed: 'intentionally omitted', verifyJwt: false }, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  if (!output) throw new Error('Provide an output directory for reviewable deployment files');
  await prepare(resolve(output));
  console.log('Prepared schema-only SQL and five function bundles for ' + productionProject);
}
