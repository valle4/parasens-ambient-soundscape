export async function submitContact(body: Record<string, string>) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const unavailable = "We couldn't confirm your message was sent. Your text is still here. Please wait a minute and retry, or email hello@parasens.com.";
  if (!url || !key) throw new Error("The form is temporarily unavailable. Please email hello@parasens.com.");
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/contact-form`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
  } catch { throw new Error(unavailable); }
  const result = await response.json().catch(() => null);
  if (response.ok && result?.accepted === true) return;
  if (response.status === 429) throw new Error("Too many attempts. Please wait before retrying, or email hello@parasens.com.");
  if (result?.error === "delivery_unconfirmed") throw new Error("Please email hello@parasens.com to check whether your earlier submission arrived before sending it again.");
  if (response.status === 400 || response.status === 413) throw new Error("Please check your email, required fields, and message length, then try again.");
  throw new Error(unavailable);
}
