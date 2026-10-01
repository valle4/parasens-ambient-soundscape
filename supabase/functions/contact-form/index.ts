import { contactEmail, createContactHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Dedicated website-forms secret; portal notifications keep their existing RESEND_API_KEY.
const resendKey = Deno.env.get("RESEND_API_KEY 2");
const origin = Deno.env.get("CONTACT_FORM_ORIGIN") || "https://development.parasens-ambient-soundscape.pages.dev";

async function rpc(name: string, body: object) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Database unavailable");
  return response.json();
}

Deno.serve(createContactHandler({
  origin, configured: Boolean(url && serviceKey && resendKey),
  digest: async value => {
    // Keyed hashes avoid retaining visitor email addresses or message bodies in the rate-limit ledger.
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(serviceKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
  },
  claim: (id, emailHash, payloadHash, claim) => rpc("claim_contact_submission", { p_id: id, p_email_hash: emailHash, p_payload_hash: payloadHash, p_claim: claim }),
  send: async (submission, id) => {
    let response: Response;
    try { response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `contact-form/${id}` },
      body: JSON.stringify(contactEmail(submission)), signal: AbortSignal.timeout(15000),
    }); } catch (error) {
      console.error("contact-form: provider connection failed", error instanceof Error ? error.name : "unknown");
      throw new Error("Email connection failed");
    }
    if (!response.ok) {
      // Operational diagnostics only: never log credentials, recipients or message content.
      const failure = await response.json().catch(() => null);
      const knownCodes = ["validation_error", "invalid_idempotency_key", "missing_api_key", "restricted_api_key", "invalid_permission", "suspended_api_key", "invalid_parameter", "missing_required_field", "rate_limit_exceeded"];
      const code = knownCodes.includes(failure?.name) ? failure.name : "unknown";
      const message = typeof failure?.message === "string" ? failure.message.toLowerCase() : "";
      const field = ["api key", "authorization", "idempotency", "from", "reply_to", "subject", "text", "html", "recipient", "domain"].find(value => message.includes(value)) || "unknown";
      console.error("contact-form: provider rejected request", response.status, code, field);
      throw new Error("Email not accepted");
    }
    const result = await response.json();
    if (typeof result.id !== "string") throw new Error("Missing receipt");
    return result.id;
  },
  finish: async (id, claim, receipt) => {
    if (await rpc("finish_contact_submission", { p_id: id, p_claim: claim, p_receipt: receipt }) !== true) throw new Error("Receipt not saved");
  },
}));
