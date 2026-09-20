import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (
    Deno.env.get("MUSIC_PORTAL_ORIGINS") ??
    "https://development.parasens-ambient-soundscape.pages.dev"
  )
    .split(",")
    .map((s) => s.trim());
  const headers = {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
  const reply = (status: number, value: unknown) =>
    new Response(JSON.stringify(value), { status, headers });
  if (!allowed.includes(origin))
    return reply(403, { error: "This portal address is not allowed." });
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST")
    return reply(405, { error: "Method not allowed." });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return reply(401, { error: "Please sign in again." });
  const url = Deno.env.get("SUPABASE_URL")!;
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(authorization.slice(7));
  if (authError || !user?.email_confirmed_at)
    return reply(401, { error: "Please sign in again." });
  const { data: role, error: roleError } = await client.rpc("music_admin_role");
  if (roleError || role !== "owner")
    return reply(403, { error: "Only the owner can invite administrators." });
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return reply(400, { error: "Enter a valid email address." });
  const { data: existing, error: lookupError } = await client
    .from("music_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (lookupError)
    return reply(500, { error: "Could not check administrator access." });
  if (existing)
    return reply(409, {
      error: "This address already has administrator access.",
    });
  const { data: granted, error: grantError } = await client.rpc(
    "music_manage_admin",
    { p_email: email },
  );
  if (grantError)
    return reply(400, { error: "Could not grant administrator access." });
  if (!granted)
    return reply(409, {
      error: "This address already has administrator access.",
    });
  const service = createClient(
    url,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { error: inviteError } =
    await service.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    if (
      ["email_exists", "user_already_exists"].includes(inviteError.code ?? "")
    )
      return reply(200, {
        message:
          "Administrator access granted. They can use their existing portal sign-in.",
      });
    const { error: rollbackError } = await client.rpc("music_manage_admin", {
      p_email: email,
      p_remove: true,
    });
    return reply(502, {
      error: rollbackError
        ? "The invitation failed, but access was granted. Remove the address below before retrying."
        : "The invitation could not be delivered. No administrator access was kept. Please retry.",
    });
  }
  return reply(200, { message: "Administrator invitation sent." });
});
