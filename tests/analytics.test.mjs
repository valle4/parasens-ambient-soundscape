import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalytics, CONSENT_KEY } from '../src/lib/analytics/controller.ts';

function setup(url = 'https://parasens.com/?email=private@example.com#secret') {
  const values = new Map();
  const scripts = [], removed = [];
  let reloads = 0, currentTime = 1000;
  const win = {
    location: { ...Object.fromEntries(['hostname','pathname'].map(key=>[key,new URL(url)[key]])), reload: () => { reloads++; } },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) },
  };
  const doc = {
    referrer: 'https://www.google.com/search?q=private@example.com',
    createElement: () => ({}),
    head: { appendChild: script => scripts.push(script) },
    get cookie() { return '_ga=old; _ga_TEST=old; portal_session=private'; },
    set cookie(value) { removed.push(value); },
  };
  const controller = createAnalytics({ id:'G-TEST', win, doc, now: () => currentTime });
  const events = () => (win.dataLayer ?? []).map(args => Array.from(args));
  return { controller, win, values, scripts, removed, events, reloads:()=>reloads, advance:()=>{ currentTime += 181*86400000; } };
}

test('no tracking script or events before consent, including failed or malformed storage', () => {
  const app = setup(); app.controller.start(); app.controller.lead('music','id');
  assert.equal(app.scripts.length,0); assert.deepEqual(app.events(),[]);
  app.values.set(CONSENT_KEY,'invalid'); app.controller.start();
  assert.equal(app.scripts.length,0);
  app.win.localStorage.getItem = () => { throw Error('blocked'); };
  assert.doesNotThrow(()=>app.controller.start());
  assert.equal(app.scripts.length,0);
});

test('consent loads one tag and page view; removes URL query, fragment and referrer search data', () => {
  const app=setup(); app.controller.choose('granted'); app.controller.start();
  assert.equal(app.scripts.length,1);
  assert.equal(app.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-TEST');
  const config=app.events().find(event=>event[0]==='config')[2];
  assert.equal(config.page_location,'https://parasens.com/');
  assert.equal(config.page_referrer,'https://www.google.com/');
  assert.equal(config.send_page_view,false);
  assert.equal(config.allow_google_signals,false);
  assert.equal(config.allow_ad_personalization_signals,false);
  assert.equal(app.events().filter(event=>event[1]==='page_view').length,1);
  assert.ok(!JSON.stringify(app.events()).includes('private'));
});

test('only successful submission types are measured, without request IDs or duplicate leads', () => {
  const app=setup(); app.controller.choose('granted');
  app.controller.lead('music','private-id'); app.controller.lead('music','private-id');
  app.controller.lead('message','another-id'); app.controller.lead('email-address','bad-id');
  const leads=app.events().filter(event=>event[1]==='generate_lead');
  assert.equal(leads.length,2);
  assert.deepEqual(leads.map(event=>event[2]),[
    {send_to:'G-TEST',form_type:'music_submission'}, {send_to:'G-TEST',form_type:'enquiry'},
  ]);
  assert.ok(!JSON.stringify(app.events()).includes('private-id'));
});

test('declining or withdrawing consent prevents measurement and preserves portal cookies', () => {
  const app=setup(); app.controller.choose('denied'); app.controller.start();
  assert.equal(app.scripts.length,0);
  app.controller.choose('granted'); const before=app.events().length;
  app.controller.choose('denied'); app.controller.lead('music','id');
  assert.equal(app.events().length,before);
  assert.equal(app.win['ga-disable-G-TEST'],true);
  assert.equal(app.reloads(),1);
  assert.ok(app.removed.some(cookie=>cookie.startsWith('_ga=')));
  assert.ok(app.removed.every(cookie=>!cookie.includes('portal_session')));
});

test('portal, preview deployments and localhost never load Analytics', () => {
  for (const url of ['https://parasens.com/portal','https://parasens.com/portal/auth/confirm','https://development.parasens-ambient-soundscape.pages.dev/','http://localhost:8080/']) {
    const app=setup(url); app.controller.choose('granted'); app.controller.lead('music','id');
    assert.equal(app.scripts.length,0); assert.equal(app.events().length,0);
  }
});

test('expired or revoked consent in another tab stops collection; leaving the public page disables it', () => {
  const app=setup(); app.controller.choose('granted'); app.advance();
  assert.equal(app.controller.readConsent(),null);
  app.controller.lead('music','id');
  assert.equal(app.events().filter(event=>event[1]==='generate_lead').length,0);
  app.controller.syncConsent(); assert.equal(app.reloads(),1);
  app.controller.stop(); assert.equal(app.win['ga-disable-G-TEST'],true);
});
