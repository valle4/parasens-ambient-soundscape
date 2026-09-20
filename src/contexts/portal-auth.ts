import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export type PortalAuthState = {
  user: User | null;
  loading: boolean;
  error: string;
};

export const PortalAuthContext = createContext<PortalAuthState>({ user: null, loading: true, error: "" });

export const usePortalAuth = () => useContext(PortalAuthContext);
