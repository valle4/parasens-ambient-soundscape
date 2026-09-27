import { createInvitationHandler, tokenDigest, type Invitation, type Claim } from './handler.ts';

const siteUrl = 'https://development.parasens-ambient-soundscape.pages.dev';
const projectUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendKey = Deno.env.get('RESEND_API_KEY');

async function adminRequest(path: string, body: unknown, method = 'POST') {
  const response = await fetch(`${projectUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Supabase operation failed');
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

Deno.serve(createInvitationHandler({
  siteUrl,
  // Only a trusted operator/server may issue invitations. A publishable key,
  // artist session, or editable user_metadata never grants issuer privileges.
  authorizeIssuer: async request => {
    const value = request.headers.get('Authorization') || '';
    if (!serviceKey || !value.startsWith('Bearer ')) return false;
    return await tokenDigest(value.slice(7)) === await tokenDigest(serviceKey);
  },
  issue: async (email, digest) => {
    if (!resendKey) throw new Error('Invitation sender not configured');
    const rows = await adminRequest('/rest/v1/rpc/issue_portal_invitation', { recipient: email, digest });
    if (!rows?.[0]) throw new Error('Invitation not created');
    return rows[0] as Invitation;
  },
  send: async (email, link, id) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `portal-invitation/${id}` },
      body: JSON.stringify({
        from: 'PARASENS <portal@mail.parasens.com>',
        to: [email],
        subject: 'Your PARASENS artist portal invitation',
        html: `<!doctype html><html lang="en"><body style="margin:0;padding:40px 24px;background:#0b0b0b;color:#eee;font-family:Arial,sans-serif;line-height:1.7"><div style="max-width:440px;margin:auto"><p style="font-size:14px;letter-spacing:4px">PARASENS</p><h1 style="margin-top:48px;font-size:28px;font-weight:400">Your artist portal invitation</h1><p style="color:#aaa">You’ve been invited to the PARASENS artist portal. Your invitation is valid for 72 hours and can be used once.</p><p style="margin:32px 0"><a href="${link}" style="display:inline-block;border:1px solid #eee;padding:14px 24px;color:#eee;text-decoration:none;font-size:12px;letter-spacing:2px">OPEN ARTIST PORTAL</a></p><p style="color:#aaa;font-size:12px">If your invitation has expired, ask your PARASENS representative for a new one. Already joined? Request a fresh sign-in link from the portal.</p></div></body></html>`,
        text: `You’ve been invited to the PARASENS artist portal. This invitation is valid for 72 hours and can be used once.\n\n${link}\n\nIf it has expired, ask your PARASENS representative for a new invitation.`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Email delivery failed');
    const data = await response.json();
    if (typeof data.id !== 'string') throw new Error('Missing email receipt');
    return data.id;
  },
  markSent: async (id, emailId) => {
    await adminRequest(`/rest/v1/portal_invitations?id=eq.${id}`, { delivery_status: 'sent', email_id: emailId }, 'PATCH');
  },
  claim: async (digest, claimId) => {
    const rows = await adminRequest('/rest/v1/rpc/claim_portal_invitation', { digest, claim_id: claimId });
    return rows?.[0] as Claim || null;
  },
  generateLogin: async email => {
    const data = await adminRequest('/auth/v1/admin/generate_link', { type: 'magiclink', email });
    return data.hashed_token;
  },
  consume: async (id, claimId) =>
    await adminRequest('/rest/v1/rpc/consume_portal_invitation', { invitation_id: id, claim_id: claimId }) === true,
  release: async (id, claimId) => {
    await adminRequest('/rest/v1/rpc/release_portal_invitation', { invitation_id: id, claim_id: claimId });
  },
}));
