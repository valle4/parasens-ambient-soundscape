export type Submission = { kind: "message" | "music"; email: string; name?: string; message?: string; artistName?: string; trackTitle?: string; genre?: string; musicLink?: string; description?: string };
type Services = {
  origin: string;
  configured: boolean;
  digest: (value: string) => Promise<string>;
  claim: (id: string, emailHash: string, payloadHash: string, claim: string) => Promise<string>;
  send: (submission: Submission, id: string) => Promise<string>;
  finish: (id: string, claim: string, receipt: string | null) => Promise<void>;
};

export function parseSubmission(value: Record<string, unknown>): Submission {
  const field = (key: string, max: number, required = false, multiline = false) => {
    const raw = value[key] ?? "";
    // Reject control characters in headers and preserve only normal whitespace in message bodies.
    // eslint-disable-next-line no-control-regex
    if (typeof raw !== "string" || raw.length > max || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(raw)) throw new Error("invalid");
    const text = raw.trim();
    if (required && !text) throw new Error("invalid");
    return text;
  };
  const email = field("email", 254, true).toLowerCase();
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(email)) throw new Error("invalid");
  if (value.kind === "message") return { kind: "message", email, name: field("name", 120, true), message: field("message", 5000, true, true) };
  if (value.kind !== "music") throw new Error("invalid");
  const musicLink = field("musicLink", 2000, true);
  const url = new URL(musicLink);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("invalid");
  return { kind: "music", email, artistName: field("artistName", 120), trackTitle: field("trackTitle", 160), genre: field("genre", 120, true), musicLink, description: field("description", 5000, false, true) };
}

export function contactEmail(submission: Submission) {
  const s = submission;
  return {
    from: "PARASENS <portal@mail.parasens.com>",
    to: ["hello@parasens.com"],
    reply_to: s.email,
    subject: s.kind === "message" ? "PARASENS website — new message" : "PARASENS website — music submission",
    text: s.kind === "message"
      ? `Website contact message\n\nName: ${s.name}\nEmail: ${s.email}\n\n${s.message}`
      : `Website music submission\n\nArtist: ${s.artistName || "Not provided"}\nTrack: ${s.trackTitle || "Not provided"}\nGenre: ${s.genre}\nEmail: ${s.email}\nLink: ${s.musicLink}\n\n${s.description || "No description provided."}`,
  };
}

// Bounded streaming read: Content-Length is not trusted or required.
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24000) { await reader.cancel(); throw new Error("large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("invalid");
  return value as Record<string, unknown>;
}

export function createContactHandler(services: Services) {
  return async (request: Request) => {
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": services.origin, "Access-Control-Allow-Headers": "content-type, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
    const reply = (status: number, body: object, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
    if (request.headers.get("Origin") !== services.origin) return reply(403, { error: "origin_not_allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return reply(415, { error: "invalid_content_type" });
    let submission: Submission, id: string;
    try {
      const value = await readBody(request);
      // Honeypot submissions never reach the mail provider or consume sending capacity.
      if (typeof value.website !== "string" || value.website !== "") return reply(400, { error: "invalid_submission" });
      if (typeof value.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) throw new Error("invalid");
      id = value.requestId;
      submission = parseSubmission(value);
    } catch (error) { return reply(error instanceof Error && error.message === "large" ? 413 : 400, { error: "invalid_submission" }); }
    if (!services.configured) return reply(503, { error: "temporarily_unavailable" });
    const claim = crypto.randomUUID();
    let claimed = false;
    try {
      const result = await services.claim(id, await services.digest(submission.email), await services.digest(JSON.stringify(submission)), claim);
      if (result === "sent") return reply(200, { accepted: true });
      if (result === "limited" || result === "busy") return reply(429, { error: "limited" }, { "Retry-After": "60" });
      if (result === "expired") return reply(409, { error: "delivery_unconfirmed" });
      if (result !== "claimed") return reply(409, { error: "submission_changed" });
      claimed = true;
      const receipt = await services.send(submission, id);
      if (!receipt) throw new Error("missing_receipt");
      await services.finish(id, claim, receipt);
      return reply(200, { accepted: true });
    } catch {
      if (claimed) { try { await services.finish(id, claim, null); } catch { /* The lease expires; retries retain the provider idempotency key. */ } }
      return reply(503, { error: "temporarily_unavailable" });
    }
  };
}
