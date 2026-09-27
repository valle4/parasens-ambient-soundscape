import assert from 'node:assert/strict';
import test from 'node:test';

test('deployed adapter isolates server credentials and calls only the expected providers', async t => {
  // Inert test credentials and a completely mocked network. No email or Auth call
  // is sent, and no real project credentials are read by this test.
  const secret = 'TEST-SERVICE-KEY';
  const resend = 'TEST-RESEND-KEY';
  const project = 'https://test.supabase.co';
  const env = { SUPABASE_URL: project, SUPABASE_SERVICE_ROLE_KEY: secret, RESEND_API_KEY: resend };
  const oldDeno = globalThis.Deno;
  const oldFetch = globalThis.fetch;
  let handler;
  const calls = [];
  globalThis.Deno = { env: { get: key => env[key] }, serve: fn => { handler = fn; } };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const headers = options.headers;
    if (url === 'https://api.resend.com/emails') {
      assert.equal(headers.Authorization, `Bearer ${resend}`);
      assert.equal(headers['Idempotency-Key'], 'portal-invitation/11111111-1111-4111-8111-111111111111');
      assert.equal(JSON.stringify(options).includes(secret), false);
      return Response.json({ id: 'receipt' });
    }
    assert.ok(url.startsWith(project + '/'));
    assert.equal(headers.Authorization, `Bearer ${secret}`);
    assert.equal(headers.apikey, secret);
    if (url.endsWith('/rpc/issue_portal_invitation')) return Response.json([{ id: '11111111-1111-4111-8111-111111111111', expires_at: '2099-01-04T00:00:00Z' }]);
    if (url.includes('/portal_invitations?id=')) return new Response(null, { status: 204 });
    if (url.endsWith('/rpc/claim_portal_invitation')) return Response.json([{ id: '11111111-1111-4111-8111-111111111111', email: 'approved@example.com' }]);
    if (url.endsWith('/admin/generate_link')) {
      assert.deepEqual(JSON.parse(options.body), { type: 'magiclink', email: 'approved@example.com' });
      return Response.json({ hashed_token: 'f'.repeat(56), verification_type: 'signup', action_link: 'must-not-return', email_otp: 'must-not-return' });
    }
    if (url.endsWith('/rpc/consume_portal_invitation')) return Response.json(true);
    throw new Error('Unexpected network request');
  };
  t.after(() => { globalThis.Deno = oldDeno; globalThis.fetch = oldFetch; });
  await import('../supabase/functions/portal-invitations/index.ts');
  const request = (body, authorization = '') => new Request(project + '/functions/v1/portal-invitations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify(body),
  });
  for (const key of ['', 'Bearer sb_publishable_not-an-admin', 'Bearer artist-session', `Bearer ${secret}wrong`]) {
    assert.equal((await handler(request({ action: 'issue', email: 'approved@example.com' }, key))).status, 403);
  }
  assert.equal(calls.length, 0);
  const issued = await handler(request({ action: 'issue', email: 'approved@example.com' }, `Bearer ${secret}`));
  assert.equal(issued.status, 201);
  const mail = calls.find(call => call.url === 'https://api.resend.com/emails').body;
  assert.equal(mail.from, 'PARASENS <portal@mail.parasens.com>');
  assert.deepEqual(mail.to, ['approved@example.com']);
  assert.match(mail.text, /72 hours/);
  const token = mail.text.match(/#invitation_token=([A-Za-z0-9_-]{43})/)[1];
  assert.notEqual(calls[0].body.digest, token);
  assert.match(calls[0].body.digest, /^[a-f0-9]{64}$/);
  const emailCount = calls.filter(call => call.url === 'https://api.resend.com/emails').length;
  const redeemed = await handler(request({ action: 'redeem', token, email: 'attacker@example.com' }));
  assert.equal(redeemed.status, 200);
  assert.deepEqual(await redeemed.json(), { token_hash: 'f'.repeat(56), type: 'email' });
  assert.equal(calls.filter(call => call.url === 'https://api.resend.com/emails').length, emailCount);
});
