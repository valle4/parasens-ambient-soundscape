import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only the public project URL and publishable key belong in the browser bundle.
export const supabase = projectUrl && publishableKey?.startsWith("sb_publishable_")
  ? createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export const portalCallbackUrl = () => `${window.location.origin}/portal/auth/confirm`;
