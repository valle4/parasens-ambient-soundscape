import test from 'node:test';
import assert from 'node:assert/strict';
import { portalOrigin, portalPreviewOrigin } from '../supabase/functions/_shared/portal-origin.ts';
import { createInvitationHandler } from '../supabase/functions/portal-invitations/handler.ts';
import { createAdminHandler } from '../supabase/functions/portal-admin/handler.ts';

const canonical = 'https://parasens.com';
const preview = 'https://codex-production-ready.parasens-ambient-soundscape.pages.dev';
const env = values => key => values[key];

test('preview origin is optional, exact, HTTPS-only and separate from canonical links', () => {
  assert.equal(portalPreviewOrigin(env({PORTAL_ORIGIN: canonical})), undefined);
  const configured = env({PORTAL_ORIGIN: canonical, PORTAL_PREVIEW_ORIGIN: preview});
  assert.equal(portalPreviewOrigin(configured), preview);
  assert.equal(portalOrigin(configured), canonical);
  for (const value of ['http://preview.test', 'https://*.pages.dev', 'https://user:pass@preview.test', `${preview}/path`, `${preview}?query=1`, `${preview}#fragment`])
    assert.throws(() => portalPreviewOrigin(env({PORTAL_PREVIEW_ORIGIN: value})));
});

test('canonical and exact preview requests retain issuer and administrator authorization', async () => {
  for (const previewOrigin of [undefined, preview]) {
    const handlers = [
      createInvitationHandler({siteUrl:canonical, previewOrigin, authorizeIssuer:async()=>false}),
      createAdminHandler({origin:canonical, previewOrigin, configured:true, authorize:async()=>false}),
    ];
    for (const handler of handlers) {
      for (const origin of [canonical, preview, `${preview}.evil.test`, 'https://other.pages.dev']) {
        const accepted = origin === canonical || origin === previewOrigin;
        const options = await handler(new Request('https://backend.test', {method:'OPTIONS',headers:{Origin:origin}}));
        assert.equal(options.status, accepted ? 204 : 403);
        assert.equal(options.headers.get('Access-Control-Allow-Origin'), accepted ? origin : canonical);
        const post = await handler(new Request('https://backend.test', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'issue',email:'owner@example.test'})}));
        assert.equal(post.status,403);
      }
    }
  }
});

test('issuing from the allowed preview still sends a canonical production invitation', async () => {
  let sentLink;
  const handler = createInvitationHandler({siteUrl:canonical,previewOrigin:preview,authorizeIssuer:async()=>true,
    issue:async()=>({id:'invitation',expires_at:'future'}),send:async(_email,link)=>{sentLink=link;return 'receipt';},markSent:async()=>{}});
  const response=await handler(new Request('https://backend.test',{method:'POST',headers:{Origin:preview,'Content-Type':'application/json'},body:JSON.stringify({action:'issue',email:'owner@example.test'})}));
  assert.equal(response.status,201);
  assert.ok(sentLink.startsWith(`${canonical}/portal/auth/confirm#invitation_token=`));
});
