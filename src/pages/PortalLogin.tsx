import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { supabase, portalCallbackUrl } from "@/lib/supabase";
import { isHiddenInvitationError } from "@/lib/portal-auth-links";
import { usePortalAuth } from "@/contexts/portal-auth";

const PortalLogin = () => {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);
  const { user, loading, error: sessionError } = usePortalAuth();

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const requestLink = async (address: string) => {
    if (inFlight.current || cooldown > 0) return;
    if (!supabase) {
      setError("Sign-in is being set up. Please try again soon.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false, emailRedirectTo: portalCallbackUrl() },
      });

      // Give invited and unknown addresses the same response. Public registration
      // must also be disabled in Supabase; a browser option alone cannot enforce it.
      if (requestError && !isHiddenInvitationError(requestError.code)) {
        if (requestError.status === 429) {
          setCooldown(60);
          setError("Please wait a minute before requesting another link.");
        } else {
          setError("We couldn’t request a sign-in link. Please try again shortly.");
        }
        return;
      }
      setSubmittedEmail(address);
      setIsSubmitted(true);
      setCooldown(60);
    } catch {
      setError("We couldn’t connect. Please check your internet connection and try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    void requestLink(normalizedEmail);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setEmail("");
    setSubmittedEmail("");
    setError("");
  };

  if (user && !loading) return <Navigate to="/portal/dashboard" replace />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-6 text-foreground md:px-12 md:py-8 lg:px-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--foreground)/0.035),transparent_34%)]" />

      <header className="relative z-10 flex items-center justify-between opacity-0 animate-fade-in">
        <Link
          to="/"
          aria-label="Return to the Parasens website"
          className="font-display text-base font-semibold tracking-[0.18em] transition-opacity duration-500 hover:opacity-60 md:text-lg"
        >
          PARASENS
        </Link>

        <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:text-xs">
          Artist portal
        </span>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center justify-center py-16">
        <div className="w-full max-w-md opacity-0 animate-fade-up animation-delay-200">
          {!isSubmitted ? (
            <div>
                <h1 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                  Sign in
                </h1>
                <p className="mt-5 max-w-sm text-sm font-light leading-6 text-muted-foreground">
                  Enter the email address connected to your invitation. We’ll send you a secure sign-in link.
                </p>

                <form onSubmit={handleSubmit} className="mt-12" aria-busy={pending}>
                  <label
                    htmlFor="portal-email"
                    className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                  >
                    Email address
                  </label>
                  <input
                    id="portal-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    disabled={pending}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="artist@example.com"
                    className="mt-3 w-full border-0 border-b border-border bg-transparent px-0 py-4 text-base text-foreground outline-none transition-colors duration-500 placeholder:text-muted-foreground/40 focus:border-foreground"
                  />

                  <button
                    type="submit"
                    disabled={pending || cooldown > 0 || loading || !supabase}
                    className="group mt-10 flex w-full items-center justify-between border border-foreground px-6 py-4 text-left text-xs uppercase tracking-[0.2em] transition-all duration-500 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{pending ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send secure link"}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </button>
                </form>

                {(error || sessionError || !supabase) && <p role="alert" className="mt-5 text-sm leading-6 text-muted-foreground">{error || sessionError || "Sign-in is being set up. Please try again soon."}</p>}

                <p className="mt-8 text-xs leading-5 text-muted-foreground/70">
                  Access is by invitation only. If you need help, contact your PARASENS representative.
                </p>
            </div>
          ) : (
            <div aria-live="polite" className="animate-fade-up">
                <div className="flex h-10 w-10 items-center justify-center border border-foreground/50">
                  <Check aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <p className="mt-10 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Link requested
                </p>
                <h1 className="mt-5 font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                  Check your inbox
                </h1>
                <p className="mt-5 text-sm font-light leading-6 text-muted-foreground">
                  If <span className="text-foreground">{submittedEmail}</span> has an invitation, a secure sign-in link will arrive shortly.
                </p>

                <button
                  type="button"
                  onClick={() => void requestLink(submittedEmail)}
                  disabled={pending || cooldown > 0}
                  className="group mt-10 flex w-full items-center justify-between border border-foreground px-6 py-4 text-xs uppercase tracking-[0.2em] transition-all duration-500 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{pending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend secure link"}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </button>

                {error && <p role="alert" className="mt-5 text-sm leading-6 text-muted-foreground">{error}</p>}

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={pending}
                  className="group mt-7 inline-flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
                >
                  <ArrowLeft
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1"
                    strokeWidth={1.5}
                  />
                  Use another email
                </button>

                <p className="mt-12 border-t border-border pt-6 text-[11px] leading-5 text-muted-foreground/60">
                  Check your spam folder too. Each link can only be used once.
                </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default PortalLogin;
