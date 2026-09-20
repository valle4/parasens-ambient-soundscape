import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const PortalSignOut = () => {
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    if (!supabase || pending) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      queryClient.clear();
      navigate("/portal", { replace: true });
    } catch {
      toast.error("We couldn’t sign you out. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={signOut} disabled={pending} className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-500 hover:text-foreground disabled:opacity-50">
      {pending ? "Signing out…" : "Sign out"}
      <LogOut aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  );
};

export default PortalSignOut;
