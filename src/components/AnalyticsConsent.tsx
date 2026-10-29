import { useEffect, useState } from "react";
import { analytics } from "@/lib/analytics";
import { CONSENT_KEY, type AnalyticsConsent } from "@/lib/analytics/controller";

export default function AnalyticsConsent() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<AnalyticsConsent | null>(null);
  useEffect(() => {
    if (!analytics?.allowed()) return;
    const current = analytics.readConsent();
    setSaved(current);
    setOpen(current === null);
    analytics.start();
    const show = () => { setSaved(analytics.readConsent()); setOpen(true); };
    const sync = (event: StorageEvent) => {
      if (event.key !== CONSENT_KEY && event.key !== null) return;
      analytics.syncConsent();
      setSaved(analytics.readConsent());
      setOpen(analytics.readConsent() === null);
    };
    window.addEventListener("parasens:analytics-settings", show);
    window.addEventListener("storage", sync);
    return () => {
      analytics.stop();
      window.removeEventListener("parasens:analytics-settings", show);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const choose = (value: AnalyticsConsent) => {
    analytics?.choose(value);
    setSaved(value);
    setOpen(false);
  };
  if (!open) return null;
  return (
    <section aria-labelledby="analytics-choice-title" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-md sm:p-6">
      <h2 id="analytics-choice-title" className="font-display text-lg font-semibold">Optional analytics</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        With your permission, we use Google Analytics to understand visits and count successful enquiries and music submissions. We don’t send your name, email or form contents to Analytics.
      </p>
      <details className="mt-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer text-foreground">How it works</summary>
        <p className="mt-2 leading-relaxed">
          Google receives page visits, basic device information, the referring website and submission type. Analytics cookies and your choice are saved for up to six months. Advertising features are disabled. You can change your choice using “Analytics settings” in the footer.
        </p>
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer" className="mt-2 inline-block underline">How Google uses data</a>
      </details>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("denied")} className="border border-border px-4 py-2 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2">No thanks</button>
        <button type="button" onClick={() => choose("granted")} className="border border-border px-4 py-2 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2">Allow analytics</button>
        {saved && <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm underline">Close</button>}
      </div>
    </section>
  );
}
