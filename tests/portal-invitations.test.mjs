import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createInvitationHandler, newInvitationToken, tokenDigest } from '../supabase/functions/portal-invitations/handler.ts';

const siteUrl = 'https://development.parasens-ambient-soundscape.pages.dev';
const endpoint = 'https://example.supabase.co/functions/v1/portal-invitations';
const providerToken = 'f'.repeat(56);
const request = (body, headers = {}) => new Request(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: siteUrl, ...headers }, body: JSON.stringify(body),
});

test('invitation tokens have 256 bits of randomness and are stored only as SHA-256 digests', async () => {
  const tokens = Array.from({ length: 100 }, newInvitationToken);
  assert.equal(new Set(tokens).size, 100);
  for (const token of tokens) {
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(token, 'base64url').length, 32);
    assert.match(await tokenDigest(token), /^[a-f0-9]{64}$/);
  }
});

test('72-hour invitations: real SQL permissions, lifecycle, and HTTP handler', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../supabase/migrations/20260920180000_portal_invitations.sql', import.meta.url), 'utf8'));
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const mails = [];
  const generatedFor = [];
  const services = {
    siteUrl,
    authorizeIssuer: async req => req.headers.get('Authorization') === 'Bearer TEST-OPERATOR-ONLY',
    issue: async (email, digest) => (await rows('select * from issue_portal_invitation($1,$2)', [email, digest]))[0],
    send: async (email, link, id) => { mails.push({ email, link, id }); return `mail-${id}`; },
    markSent: async (id, emailId) => { await rows("update portal_invitations set delivery_status='sent',email_id=$2 where id=$1", [id, emailId]); },
    claim: async (digest, claimId) => (await rows('select * from claim_portal_invitation($1,$2)', [digest, claimId]))[0] || null,
    generateLogin: async email => { generatedFor.push(email); return providerToken; },
    consume: async (id, claimId) => (await rows('select consume_portal_invitation($1,$2) as ok', [id, claimId]))[0].ok,
    release: async (id, claimId) => { await rows('select release_portal_invitation($1,$2)', [id, claimId]); },
  };
  const handler = createInvitationHandler(services);
  let n = 0;
  async function issue(email = `artist${++n}@example.com`, useHandler = handler) {
    const response = await useHandler(request({ action: 'issue', email }, { Authorization: 'Bearer TEST-OPERATOR-ONLY' }));
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ['expires_at', 'id', 'status']);
    const mail = mails.find(mail => mail.id === data.id);
    assert.ok(mail.link.startsWith(`${siteUrl}/portal/auth/confirm#invitation_token=`));
    const token = new URLSearchParams(new URL(mail.link).hash.slice(1)).get('invitation_token');
    assert.equal(new URL(mail.link).search, '');
    return { ...data, token };
  }
  const redeem = (token, extra = {}, useHandler = handler) => useHandler(request({ action: 'redeem', token, ...extra }));

  await t.test('anonymous visitors and artists cannot read records or invoke private SQL functions', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(rows('select * from portal_invitations'), /permission denied/);
      await assert.rejects(rows('select * from issue_portal_invitation($1,$2)', ['artist@example.com', 'a'.repeat(64)]), /permission denied/);
      await assert.rejects(rows('select * from claim_portal_invitation($1,$2)', ['a'.repeat(64), crypto.randomUUID()]), /permission denied/);
      await assert.rejects(rows('select consume_portal_invitation($1,$2)', [crypto.randomUUID(), crypto.randomUUID()]), /permission denied/);
      await assert.rejects(rows('select release_portal_invitation($1,$2)', [crypto.randomUUID(), crypto.randomUUID()]), /permission denied/);
      await db.exec('reset role');
    }
    assert.equal((await rows("select relrowsecurity from pg_class where oid='public.portal_invitations'::regclass"))[0].relrowsecurity, true);
    await db.exec('set role service_role');
    assert.deepEqual(await rows('select * from portal_invitations'), []);
    await db.exec('reset role');
  });

  await t.test('issuing requires trusted authorization; malformed requests never send email', async () => {
    for (const authorization of ['', 'Bearer sb_publishable_test', 'Bearer artist-session']) {
      assert.equal((await handler(request({ action: 'issue', email: 'artist@example.com' }, { Authorization: authorization }))).status, 403);
    }
    for (const email of ['', 'no-address', 'two@@example.com', '<artist>@example.com', 'a'.repeat(255) + '@example.com']) {
      assert.equal((await handler(request({ action: 'issue', email }, { Authorization: 'Bearer TEST-OPERATOR-ONLY' }))).status, 400);
    }
    assert.equal(mails.length, 0);
    assert.equal((await handler(request({ action: 'redeem', token: 'a'.repeat(43) }, { Origin: 'https://attacker.example' }))).status, 403);
    assert.equal((await handler(new Request(endpoint))).status, 405);
    assert.equal((await handler(new Request(endpoint, { method: 'OPTIONS', headers: { Origin: siteUrl } }))).status, 204);
    assert.equal((await handler(request({ data: 'a'.repeat(2049) }))).status, 413);
    assert.equal((await handler(new Request(endpoint, { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } }))).status, 415);
    for (const body of ['[]', 'null', '{']) {
      assert.equal((await handler(new Request(endpoint, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }))).status, 400);
    }
  });

  await t.test('stores only the digest; database sets exactly 72 hours; redemption uses the recorded email once', async () => {
    const invite = await issue(' Artist@Example.com ');
    const row = (await rows('select * from portal_invitations where id=$1', [invite.id]))[0];
    assert.equal(row.email, 'artist@example.com');
    assert.equal(row.token_hash, await tokenDigest(invite.token));
    assert.equal(new Date(row.expires_at) - new Date(row.created_at), 72 * 60 * 60 * 1000);
    assert.equal(row.consumed_at, null); // Issuing/GET/email scanning doesn't redeem.
    const response = await redeem(invite.token, { email: 'attacker@example.com' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { token_hash: providerToken, type: 'email' });
    assert.equal(generatedFor.at(-1), 'artist@example.com');
    assert.equal((await redeem(invite.token)).status, 400);
  });

  await t.test('accepts before the deadline and rejects at or after the exact deadline', async () => {
    const before = await issue();
    await rows("update portal_invitations set expires_at=now()+interval '1 minute' where id=$1", [before.id]);
    assert.equal((await redeem(before.token)).status, 200);
    const boundary = await issue();
    await db.exec('begin');
    await rows('update portal_invitations set expires_at=now() where id=$1', [boundary.id]);
    assert.deepEqual(await rows('select * from claim_portal_invitation($1,$2)', [await tokenDigest(boundary.token), crypto.randomUUID()]), []);
    await db.exec('commit');
    assert.equal((await redeem(boundary.token)).status, 400);
    const expiredDuringExchange = await issue();
    const claimId = crypto.randomUUID();
    assert.ok(await services.claim(await tokenDigest(expiredDuringExchange.token), claimId));
    await rows("update portal_invitations set expires_at=now()-interval '1 second' where id=$1", [expiredDuringExchange.id]);
    assert.equal(await services.consume(expiredDuringExchange.id, claimId), false);
  });

  await t.test('reissue revokes the older invitation, including a claimed invitation', async () => {
    const old = await issue('reissue@example.com');
    const claimId = crypto.randomUUID();
    assert.ok(await services.claim(await tokenDigest(old.token), claimId));
    const replacement = await issue('reissue@example.com');
    assert.equal(await services.consume(old.id, claimId), false);
    assert.equal((await redeem(old.token)).status, 400);
    assert.equal((await redeem(replacement.token)).status, 200);
  });

  await t.test('simultaneous redemption allows only one exchange', async () => {
    const invite = await issue();
    const before = generatedFor.length;
    const responses = await Promise.all([redeem(invite.token), redeem(invite.token)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    assert.equal(generatedFor.length, before + 1);
  });

  await t.test('provider failures release the claim; consumed or leased invitations cannot be stolen', async () => {
    const invite = await issue();
    const failing = createInvitationHandler({ ...services, generateLogin: async () => { throw new Error('private provider details'); } });
    const response = await redeem(invite.token, {}, failing);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'temporarily_unavailable' });
    const claimId = crypto.randomUUID();
    assert.ok(await services.claim(await tokenDigest(invite.token), claimId));
    assert.equal(await services.consume(invite.id, crypto.randomUUID()), false);
    await services.release(invite.id, crypto.randomUUID());
    assert.equal((await redeem(invite.token)).status, 400);
    await rows("update portal_invitations set claim_until=now()-interval '1 second' where id=$1", [invite.id]);
    assert.equal((await redeem(invite.token)).status, 200);
  });

  await t.test('uncertain email delivery remains pending and unusable', async () => {
    const failing = createInvitationHandler({ ...services, markSent: async () => { throw new Error('private database details'); } });
    const response = await failing(request({ action: 'issue', email: 'delivery@example.com' }, { Authorization: 'Bearer TEST-OPERATOR-ONLY' }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'invitation_delivery_unconfirmed' });
    const mail = mails.at(-1);
    const token = new URLSearchParams(new URL(mail.link).hash.slice(1)).get('invitation_token');
    assert.equal((await redeem(token)).status, 400);
    assert.equal((await rows('select delivery_status from portal_invitations where id=$1', [mail.id]))[0].delivery_status, 'pending');
  });
});
