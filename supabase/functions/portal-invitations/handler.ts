// Web-standard handler: secrets and elevated Supabase calls stay on the server.
export type Invitation = { id: string; expires_at: string };
export type Claim = { id: string; email: string };
export type InvitationServices = {
  siteUrl: string;
  authorizeIssuer: (request: Request) => Promise<boolean>;
  issue: (email: string, digest: string) => Promise<Invitation>;
  send: (email: string, link: string, id: string) => Promise<string>;
  markSent: (id: string, emailId: string) => Promise<void>;
  claim: (digest: string, claimId: string) => Promise<Claim | null>;
  generateLogin: (email: string) => Promise<string>;
  consume: (id: string, claimId: string) => Promise<boolean>;
  release: (id: string, claimId: string) => Promise<void>;
};

export async function tokenDigest(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}

export function newInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function createInvitationHandler(services: InvitationServices) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const allowedOrigin = new URL(services.siteUrl).origin;
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    const reply = (status: number, value: Record<string, unknown>) =>
      new Response(JSON.stringify(value), { status, headers });

    if (origin && origin !== allowedOrigin) return reply(403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return reply(415, { error: 'json_required' });
    }
    // Bound both declared and streamed request sizes; never log tokens or bodies.
    if (Number(request.headers.get('Content-Length') || 0) > 2048) return reply(413, { error: 'body_too_large' });
    let payload: Record<string, unknown>;
    try {
      const reader = request.body?.getReader();
      let size = 0;
      const decoder = new TextDecoder();
      let text = '';
      if (!reader) return reply(400, { error: 'invalid_request' });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); return reply(413, { error: 'body_too_large' }); }
        text += decoder.decode(value, { stream: true });
      }
      const parsed = JSON.parse(text + decoder.decode());
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return reply(400, { error: 'invalid_request' });
      payload = parsed;
    } catch { return reply(400, { error: 'invalid_request' }); }

    if (payload.action === 'issue') {
      try {
        if (!await services.authorizeIssuer(request)) return reply(403, { error: 'not_authorized' });
        if (typeof payload.email !== 'string') return reply(400, { error: 'invalid_email' });
        const email = payload.email.trim().toLowerCase();
        if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) {
          return reply(400, { error: 'invalid_email' });
        }
        const token = newInvitationToken();
        const invitation = await services.issue(email, await tokenDigest(token));
        const link = `${services.siteUrl}/portal/auth/confirm#invitation_token=${token}`;
        const emailId = await services.send(email, link, invitation.id);
        await services.markSent(invitation.id, emailId);
        return reply(201, { id: invitation.id, expires_at: invitation.expires_at, status: 'sent' });
      } catch {
        // Pending invitations cannot be redeemed. Do not blindly resend after an
        // uncertain mail response; check provider delivery before issuing again.
        return reply(503, { error: 'invitation_delivery_unconfirmed' });
      }
    }

    if (payload.action !== 'redeem' || typeof payload.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(payload.token)) {
      return reply(400, { error: 'invalid_invitation' });
    }
    const claimId = crypto.randomUUID();
    let claim: Claim | null = null;
    try {
      claim = await services.claim(await tokenDigest(payload.token), claimId);
      if (!claim) return reply(400, { error: 'invalid_invitation' });
      const tokenHash = await services.generateLogin(claim.email);
      if (!/^[A-Za-z0-9_-]{20,512}$/.test(tokenHash)) throw new Error('Invalid provider token');
      if (!await services.consume(claim.id, claimId)) return reply(400, { error: 'invalid_invitation' });
      // No session or administrator credentials are returned. The browser
      // completes the existing Supabase verifyOtp flow after an explicit click.
      return reply(200, { token_hash: tokenHash, type: 'email' });
    } catch {
      if (claim) {
        try { await services.release(claim.id, claimId); } catch { /* Lease expires automatically. */ }
      }
      return reply(503, { error: 'temporarily_unavailable' });
    }
  };
}
