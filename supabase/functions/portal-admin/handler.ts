export type MailJob = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
};
export type AdminServices = {
  origin: string;
  configured: boolean;
  authorize: (request: Request) => Promise<boolean>;
  invite: (email: string) => Promise<string>;
  claim: (releaseId: string, claim: string) => Promise<MailJob[]>;
  send: (job: MailJob) => Promise<string>;
  finish: (
    job: MailJob,
    claim: string,
    receipt: string | null,
  ) => Promise<void>;
};
export function createAdminHandler(service: AdminServices) {
  return async (request: Request) => {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": service.origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    if (
      request.headers.get("Origin") &&
      request.headers.get("Origin") !== service.origin
    )
      return reply(403, { error: "Portal origin not allowed." });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return reply(405, { error: "POST required." });
    try {
      if (!(await service.authorize(request)))
        return reply(403, {
          error:
            "Administrator access required. Sign in again if your session expired.",
        });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Request required." });
      let size = 0,
        text = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return reply(413, { error: "Request too large." });
        }
        text += decoder.decode(value, { stream: true });
      }
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(text + decoder.decode());
      } catch {
        return reply(400, { error: "Invalid request." });
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return reply(400, { error: "Invalid request." });
      if (body.action === "status")
        return reply(200, { configured: service.configured });
      if (!service.configured)
        return reply(503, {
          error:
            "Email sending is not configured. The review or account is saved; ask an administrator to configure the sender.",
        });
      if (body.action === "invite") {
        if (
          typeof body.email !== "string" ||
          body.email.length > 254 ||
          !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(body.email.trim())
        )
          return reply(400, { error: "Enter a valid email." });
        return reply(200, {
          message: await service.invite(body.email.trim().toLowerCase()),
        });
      }
      if (
        body.action !== "notify" ||
        typeof body.releaseId !== "string" ||
        !/^[a-f0-9-]{36}$/.test(body.releaseId)
      )
        return reply(400, { error: "Invalid action or release." });
      const claim = crypto.randomUUID();
      const jobs = await service.claim(body.releaseId, claim);
      let failed = 0,
        sent = 0;
      for (const job of jobs) {
        let receipt: string | null = null;
        try {
          receipt = await service.send(job);
          await service.finish(job, claim, receipt);
          sent++;
        } catch {
          failed++;
          if (!receipt)
            await service.finish(job, claim, null).catch(() => undefined);
        }
      }
      return reply(200, {
        sent,
        failed,
        message: failed
          ? "Some emails could not be confirmed. Retry from the release."
          : sent
            ? "Review emails sent."
            : "No pending emails to send.",
      });
    } catch (error) {
      return reply(503, {
        error:
          error instanceof Error
            ? error.message
            : "Server action failed. Please retry.",
      });
    }
  };
}
