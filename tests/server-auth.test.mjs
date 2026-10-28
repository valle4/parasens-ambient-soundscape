import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeServer, serverFunctionHeaders } from '../supabase/functions/_shared/server-auth.ts';

const values = { SUPABASE_SECRET_KEYS: JSON.stringify({default:'sb_secret_default_test', other:'sb_secret_other_test'}), SUPABASE_SERVICE_ROLE_KEY:'legacy-test' };
const env = key => values[key];
const request = headers => new Request('https://example.test', {headers});

test('internal invitation calls accept only configured server keys, never public keys or claimed roles', async () => {
  assert.equal(await authorizeServer(request(serverFunctionHeaders(env)),env),true);
  assert.deepEqual(serverFunctionHeaders(env),{apikey:'sb_secret_default_test'});
  assert.equal(await authorizeServer(request({Authorization:'Bearer legacy-test'}),env),true);
  for (const headers of [{}, {apikey:'sb_publishable_test'}, {apikey:'sb_secret_other_test'}, {apikey:'sb_secret_default_testwrong'}, {Authorization:'Bearer artist-session'}, {Authorization:'Bearer sb_secret_default_test'}, {apikey:'legacy-test'}, {Authorization:'Bearer forged-service-role', 'x-role':'service_role'}])
    assert.equal(await authorizeServer(request(headers),env),false);
});

test('legacy development remains supported and missing or malformed configuration fails closed', async () => {
  const legacy = key => ({SUPABASE_SERVICE_ROLE_KEY:'old-server'})[key];
  assert.deepEqual(serverFunctionHeaders(legacy),{apikey:'old-server',Authorization:'Bearer old-server'});
  assert.equal(await authorizeServer(request(serverFunctionHeaders(legacy)),legacy),true);
  assert.equal(await authorizeServer(request({apikey:'sb_secret_default_test'}),()=>undefined),false);
  assert.throws(()=>serverFunctionHeaders(()=>undefined),/not configured/);
  for (const raw of ['bad json','[]','null','{"default":"sb_publishable_test"}','{"default":42}']) {
    const invalid = key => key==='SUPABASE_SECRET_KEYS'?raw:undefined;
    await assert.rejects(authorizeServer(request({apikey:'sb_secret_default_test'}),invalid));
    assert.throws(()=>serverFunctionHeaders(invalid));
  }
});
