type Environment = (name: string) => string | undefined;

function defaultSecret(env: Environment): string | undefined {
  const raw = env("SUPABASE_SECRET_KEYS");
  if (!raw) return undefined;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid server key configuration");
  const key = (value as Record<string, unknown>).default;
  if (key === undefined) return undefined;
  if (typeof key !== "string" || !key.startsWith("sb_secret_"))
    throw new Error("Invalid default server key");
  return key;
}

async function matches(candidate: string | null, expected: string | undefined) {
  if (!candidate || !expected) return false;
  const digest = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [left, right] = await Promise.all([digest(candidate), digest(expected)]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

// Compare only with server-provisioned keys; never trust caller-supplied JWT claims.
export async function authorizeServer(request: Request, env: Environment): Promise<boolean> {
  if (await matches(request.headers.get("apikey"), defaultSecret(env))) return true;
  const bearer = request.headers.get("Authorization");
  return Boolean(bearer?.startsWith("Bearer ")) &&
    await matches(bearer!.slice(7), env("SUPABASE_SERVICE_ROLE_KEY"));
}

export function serverFunctionHeaders(env: Environment): Record<string, string> {
  const key = defaultSecret(env);
  if (key) return { apikey: key };
  const legacy = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Server key not configured");
  return { apikey: legacy, Authorization: `Bearer ${legacy}` };
}
