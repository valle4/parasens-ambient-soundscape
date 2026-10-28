type Environment = (name: string) => string | undefined;
const developmentProject = "https://zsjcelwhipbwrwdzegdl.supabase.co";
const developmentOrigin = "https://development.parasens-ambient-soundscape.pages.dev";

// Only the known development project may use the legacy default.
// A new project must explicitly configure its canonical public website.
export function portalOrigin(env: Environment, override?: string): string {
  const value = (override && env(override)) || env("PORTAL_ORIGIN") ||
    (env("SUPABASE_URL") === developmentProject ? developmentOrigin : "");
  if (!value) throw new Error("PORTAL_ORIGIN must be configured for this project");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname.includes("*") || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("Portal origin must be an HTTPS origin without a path");
  }
  return parsed.origin;
}

// Optional, exact launch-preview origin. Canonical email links keep PORTAL_ORIGIN.
export function portalPreviewOrigin(env: Environment): string | undefined {
  return env("PORTAL_PREVIEW_ORIGIN") ? portalOrigin(env, "PORTAL_PREVIEW_ORIGIN") : undefined;
}
