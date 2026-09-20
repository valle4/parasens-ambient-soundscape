import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PortalAuthContext, type PortalAuthState } from "@/contexts/portal-auth";
import { supabase } from "@/lib/supabase";

import { disconnectSpotify } from "@/lib/music/spotify";

const PortalAuthProvider = () => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PortalAuthState>({ user: null, loading: Boolean(supabase), error: "" });

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let disposed = false;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const currentRevision = ++revision;
      clearTimeout(timer);
      if (!session) {
        if (event === "SIGNED_OUT") { queryClient.clear(); disconnectSpotify(); }
        setState({ user: null, loading: false, error: "" });
        return;
      }

      setState((previous) => previous.user?.id === session.user.id
        ? previous
        : { user: null, loading: true, error: "" });
      // Defer SDK calls until the auth event releases its lock. Verify with the
      // auth server rather than trusting a user object from browser storage.
      timer = setTimeout(async () => {
        try {
          const { data, error } = await client.auth.getUser();
          if (disposed || currentRevision !== revision) return;
          setState({
            user: error || !data.user?.email_confirmed_at ? null : data.user,
            loading: false,
            error: error ? "We couldn’t check your sign-in. Please try again." : "",
          });
        } catch {
          if (!disposed && currentRevision === revision) {
            setState({ user: null, loading: false, error: "We couldn’t check your sign-in. Please try again." });
          }
        }
      }, 0);
    });

    return () => {
      disposed = true;
      revision++;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return <PortalAuthContext.Provider value={state}><Outlet /></PortalAuthContext.Provider>;
};

export default PortalAuthProvider;
