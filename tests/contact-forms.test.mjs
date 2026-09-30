import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { contactEmail, createContactHandler } from '../supabase/functions/contact-form/handler.ts';

const origin = 'https://development.parasens-ambient-soundscape.pages.dev';
const endpoint = 'https://example.supabase.co/functions/v1/contact-form';
const message = () => ({ kind: 'message', name: 'Test Visitor', email: 'visitor@example.com', message: '<b>Plain text</b>\nA message.', website: '', requestId: crypto.randomUUID() });
const music = () => ({ kind: 'music', artistName: 'Test Artist', trackTitle: 'Test Track', genre: 'Ambient', musicLink: 'https://example.com/music', email: 'music@example.com', description: 'A test track.', website: '', requestId: crypto.randomUUID() });
const request = body => new Request(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const digest = async value => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex');

test('contact forms: private SQL, delivery, validation, retries and sending budgets', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../supabase/migrations/202609300001_contact_forms.sql', import.meta.url), 'utf8'));
  const scalar = async (sql, args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
  const sent = [];
  const services = {
    origin, configured: true, digest,
    claim: (id,email,payload,claim) => scalar('select claim_contact_submission($1,$2,$3,$4)',[id,email,payload,claim]),
    send: async (submission,id) => { sent.push({ ...contactEmail(submission), id }); return 'provider-'+id; },
    finish: async (id,claim,receipt) => { assert.equal(await scalar('select finish_contact_submission($1,$2,$3)',[id,claim,receipt]),true); },
  };
  const handler = createContactHandler(services);
  const reset = () => db.exec('truncate contact_submissions');

  await t.test('neither anonymous visitors nor artists can read the ledger or bypass limits', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(db.query('select * from contact_submissions'), /permission denied/);
      await assert.rejects(services.claim(crypto.randomUUID(),'a'.repeat(64),'b'.repeat(64),crypto.randomUUID()),/permission denied/);
      await assert.rejects(services.finish(crypto.randomUUID(),crypto.randomUUID(),'fake'),/permission denied/);
      await db.exec('reset role');
    }
    assert.equal(await scalar("select relrowsecurity from pg_class where oid='contact_submissions'::regclass"),true);
    await db.exec('set role service_role');
    assert.equal(await services.claim(crypto.randomUUID(),'a'.repeat(64),'b'.repeat(64),crypto.randomUUID()),'claimed');
    await db.exec('reset role'); await reset();
  });
  await t.test('both forms deliver only to the fixed inbox with Reply-To and plain text', async () => {
    for (const body of [message(),music()]) {
      const response = await handler(request({ ...body, to:'attacker@example.com', from:'attacker@example.com' }));
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{ accepted:true });
      const mail = sent.at(-1);
      assert.deepEqual(mail.to,['hello@parasens.com']);
      assert.equal(mail.from,'PARASENS <portal@mail.parasens.com>');
      assert.equal(mail.reply_to,body.email);
      assert.equal(mail.html,undefined);
      assert.ok(mail.text.includes(body.message || body.musicLink));
    }
  });
  await t.test('rejects malformed requests and spam without emailing', async () => {
    const before = sent.length;
    for (const body of [null, [], { ...message(), website:'spam' }, { ...message(), email:'x@example.com\nBcc: spam@example.com' }, { ...message(), name:'   ' }, { ...message(), message:'a'.repeat(5001) }, { ...message(), requestId:'bad' }, { ...music(), musicLink:'javascript:alert(1)' }, { ...music(), musicLink:'https://user:password@example.com' }, { ...music(), genre:'' }, { ...music(), musicLink:'not a link' }]) {
      assert.equal((await handler(request(body))).status,400);
    }
    assert.equal((await handler(request({ ...message(), message:'a'.repeat(24001) }))).status,413);
    assert.equal((await handler(new Request(endpoint,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(message())}))).status,403);
    assert.equal((await handler(new Request(endpoint,{method:'POST',body:'{}',headers:{Origin:origin,'Content-Type':'text/plain'}}))).status,415);
    assert.equal((await handler(new Request(endpoint,{headers:{Origin:origin}}))).status,405);
    assert.equal((await handler(new Request(endpoint,{method:'OPTIONS',headers:{Origin:origin}}))).status,204);
    assert.equal(sent.length,before);
  });
  await t.test('replays return success without resending; changed content cannot reuse an ID', async () => {
    await reset();
    const body = message(), before = sent.length;
    assert.equal((await handler(request(body))).status,200);
    assert.equal((await handler(request(body))).status,200);
    assert.equal(sent.length,before+1);
    assert.equal((await handler(request({ ...body, message:'Changed' }))).status,409);
  });
  await t.test('uncertain delivery retries retain the same ID and expire before provider deduplication', async () => {
    await reset();
    const body = message();
    let calls = 0;
    const uncertain = createContactHandler({ ...services, send: async (_s,id) => { assert.equal(id,body.requestId); if (++calls===1) throw Error('private provider error'); return 'receipt'; } });
    const failed = await uncertain(request(body));
    assert.equal(failed.status,503);
    assert.deepEqual(await failed.json(),{ error:'temporarily_unavailable' });
    assert.equal((await uncertain(request(body))).status,429);
    await db.exec("update contact_submissions set attempted_at=now()-interval '61 seconds'");
    assert.equal((await uncertain(request(body))).status,200);
    assert.equal(calls,2);
    await db.exec("update contact_submissions set state='failed',created_at=now()-interval '24 hours',attempted_at=now()-interval '2 hours'");
    assert.equal((await uncertain(request(body))).status,409);
    assert.equal(calls,2);
  });
  await t.test('a lost receipt-save response cannot downgrade a successful delivery', async () => {
    await reset();
    const body=message(), before=sent.length;
    const lost = createContactHandler({ ...services, finish: async (...args) => { await services.finish(...args); throw Error('lost response'); } });
    assert.equal((await lost(request(body))).status,503);
    assert.equal((await handler(request(body))).status,200);
    assert.equal(sent.length,before+1);
  });
  await t.test('parallel reservations for the same request allow only one sender', async () => {
    await reset();
    const id=crypto.randomUUID();
    const results=await Promise.all([1,2].map(() => services.claim(id,'a'.repeat(64),'b'.repeat(64),crypto.randomUUID())));
    assert.deepEqual(results.sort(),['busy','claimed']);
  });
  await t.test('per-address, hourly and daily global budgets persist in the database', async () => {
    await reset();
    for (let i=0;i<3;i++) assert.equal((await handler(request(message()))).status,200);
    assert.equal((await handler(request(message()))).status,429);
    await reset();
    for (let i=0;i<30;i++) assert.equal(await services.claim(crypto.randomUUID(),await digest('email'+i),'b'.repeat(64),crypto.randomUUID()),'claimed');
    assert.equal(await services.claim(crypto.randomUUID(),'c'.repeat(64),'b'.repeat(64),crypto.randomUUID()),'limited');
    await db.exec("update contact_submissions set created_at=now()-interval '2 hours'");
    for (let i=0;i<70;i++) {
      assert.equal(await services.claim(crypto.randomUUID(),await digest('new'+i),'b'.repeat(64),crypto.randomUUID()),'claimed');
      await db.exec("update contact_submissions set created_at=now()-interval '2 hours'");
    }
    assert.equal(await services.claim(crypto.randomUUID(),'d'.repeat(64),'b'.repeat(64),crypto.randomUUID()),'limited');
  });
  await t.test('missing configuration and database failure fail closed', async () => {
    const before=sent.length;
    for (const config of [{ configured:false },{ claim:async()=>{throw Error('private database error');} }]) {
      assert.equal((await createContactHandler({ ...services,...config })(request(message()))).status,503);
    }
    assert.equal(sent.length,before);
  });
});
