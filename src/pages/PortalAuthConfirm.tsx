import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { parsePortalEmailLink } from "@/lib/portal-auth-links";
import { usePortalAuth } from "@/contexts/portal-auth";

const PortalAuthConfirm = () => {
  const [emailLink] = useState(() => parsePortalEmailLink(window.location.hash));
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const inFlight = useRef(false);
  const { user, loading, error: sessionError } = usePortalAuth();

  useEffect(() => {
    // Keep the one-time token only in memory, out of browser history and logs.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  const confirm = async () => {
    if (!supabase || !emailLink || inFlight.current || complete) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setCanRetry(false);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: emailLink.tokenHash, type: emailLink.type });
      if (verifyError || !data.session) {
        const retryable = Boolean(verifyError && (verifyError.status === 0 || (verifyError.status ?? 0) >= 500));
        setCanRetry(retryable);
        setError(retryable
          ? "We couldn’t complete your sign-in. Please try again."
          : "This link has expired or has already been used. Please request a new one.");
      } else {
        setComplete(true);
      }
    } catch {
      setCanRetry(true);
      setError("We couldn’t connect. Please check your internet connection and try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  if (complete && user && !loading) return <Navigate to="/portal/dashboard" replace />;
  const problem = !supabase ? "Sign-in is being set up. Please try again soon."
    : !emailLink ? "This sign-in link is incomplete. Please reopen the link in your email or request a new one."
    : error || (complete && sessionError);

  return (
    <main className="relative min-h-screen bg-background px-6 py-6 text-foreground md:px-12 md:py-8 lg:px-24">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-display text-base font-semibold tracking-[0.18em] transition-opacity hover:opacity-60 md:text-lg">PARASENS</Link>
        <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:text-xs">Artist portal</span>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md flex-col justify-center py-16">
        <h1 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">{problem ? "Let’s get you signed in" : "Welcome to PARASENS"}</h1>
        <p className="mt-5 text-sm font-light leading-6 text-muted-foreground" role={problem ? "alert" : undefined}>
          {problem || "Confirm below to sign in securely to your artist portal."}
        </p>
        {(!problem || canRetry) && (
          <button type="button" onClick={confirm} disabled={pending || complete} className="group mt-10 flex w-full items-center justify-between border border-foreground px-6 py-4 text-left text-xs uppercase tracking-[0.2em] transition-all duration-500 hover:bg-foreground hover:text-background disabled:opacity-50">
            <span>{pending || complete ? "Signing in…" : canRetry ? "Try again" : "Continue to artist portal"}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        <Link to="/portal" className="mt-8 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">Request a new sign-in link</Link>
      </section>
    </main>
  );
};

export default PortalAuthConfirm;
