import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";
import { createAdminHandler, type MailJob } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = Deno.env.get("RESEND_API_KEY");
const service = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
Deno.serve(
  createAdminHandler({
    origin: "https://development.parasens-ambient-soundscape.pages.dev",
    configured: Boolean(resend),
    authorize: async (request) => {
      const token = request.headers.get("Authorization");
      if (!token?.startsWith("Bearer ")) return false;
      const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: token } },
        auth: { persistSession: false },
      });
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token.slice(7));
      if (error || !user?.email_confirmed_at) return false;
      const { data: role, error: roleError } =
        await client.rpc("music_admin_role");
      return !roleError && (role === "owner" || role === "admin");
    },
    invite: async (email) => {
      const { data: account, error } = await service
        .from("portal_accounts")
        .select("user_id,invitation_status,invited_at")
        .eq("email", email)
        .single();
      if (error || !account)
        throw new Error("Save the account and its access before inviting.");
      if (account.user_id)
        return "Account access saved. This person can use their existing portal sign-in.";
      if (account.invitation_status === "uncertain")
        throw new Error(
          "The previous invitation delivery is unconfirmed. Check the email provider before issuing another invitation.",
        );
      const cutoff = new Date(Date.now() - 60000).toISOString();
      const { data: claimed, error: claimError } = await service
        .from("portal_accounts")
        .update({
          invited_at: new Date().toISOString(),
          invitation_status: "pending",
        })
        .eq("email", email)
        .or(`invited_at.is.null,invited_at.lt.${cutoff}`)
        .select("email");
      if (claimError || !claimed?.length)
        throw new Error(
          "An invitation was just requested. Please wait a minute before trying again.",
        );
      let confirmed = false;
      try {
        const response = await fetch(`${url}/functions/v1/portal-invitations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "issue", email }),
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok)
          throw new Error(
            "Invitation delivery could not be confirmed. Account access is saved; check the email provider before retrying.",
          );
        confirmed = true;
      } finally {
        const { error: saveError } = await service
          .from("portal_accounts")
          .update({ invitation_status: confirmed ? "sent" : "uncertain" })
          .eq("email", email);
        if (saveError)
          throw new Error(
            "Account access is saved, but invitation delivery needs checking before another send.",
          );
      }
      return "Invitation sent. The link is valid for 72 hours.";
    },
    claim: async (releaseId, claim) => {
      const { data, error } = await service.rpc("portal_claim_notifications", {
        p_release: releaseId,
        p_claim: claim,
      });
      if (error) throw new Error("Could not load pending emails.");
      return data as MailJob[];
    },
    send: async (job) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resend}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `portal-review/${job.id}`,
        },
        body: JSON.stringify({
          from: "PARASENS <portal@mail.parasens.com>",
          to: [job.recipient],
          subject: job.subject,
          text: job.body,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error("Email provider did not confirm delivery.");
      const result = await response.json();
      if (typeof result.id !== "string")
        throw new Error("No delivery receipt.");
      return result.id;
    },
    finish: async (job, claim, receipt) => {
      const { error } = await service
        .from("portal_notifications")
        .update(
          receipt
            ? {
                state: "sent",
                sent_at: new Date().toISOString(),
                provider_id: receipt,
                error: null,
              }
            : {
                state: "failed",
                error:
                  "Delivery not confirmed. Retry within 23 hours; later attempts require a provider check.",
              },
        )
        .eq("id", job.id)
        .eq("claim_id", claim);
      if (error) throw new Error("Could not record delivery confirmation.");
    },
  }),
);
