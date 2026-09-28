export type FileService = {
  origin: string;
  authorize(request: Request): Promise<boolean>;
  dispatch(body: Record<string, unknown>): Promise<unknown>;
};
export function createFileHandler(service: FileService) {
  return async (request: Request) => {
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": service.origin, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (request.headers.get("Origin") && request.headers.get("Origin") !== service.origin) return reply(403, { error: "Portal origin not allowed." });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, { error: "POST required." });
    try {
      if (!await service.authorize(request)) return reply(403, { error: "Sign in to access release files." });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Request required." });
      let size = 0, text = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); return reply(413, { error: "Request too large." }); }
        text += decoder.decode(value, { stream: true });
      }
      let body: Record<string, unknown>;
      try { body = JSON.parse(text + decoder.decode()); } catch { return reply(400, { error: "Invalid request." }); }
      if (!body || typeof body !== "object" || Array.isArray(body) || !["status", "prepare", "finish", "download", "sync", "drain"].includes(String(body.action))) return reply(400, { error: "Invalid action." });
      return reply(200, await service.dispatch(body));
    } catch (error) {
      return reply(503, { error: error instanceof Error ? error.message : "File request failed. Please retry." });
    }
  };
}
