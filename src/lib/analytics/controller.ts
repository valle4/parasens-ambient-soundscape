export type AnalyticsConsent = "granted" | "denied";
export const CONSENT_KEY = "parasens.analytics-consent.v1";
const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};
type Options = { id: string; win: AnalyticsWindow; doc: Document; now?: () => number };

// Only fixed event names and submission type enter Analytics, never form values.
export function createAnalytics({ id, win, doc, now = Date.now }: Options) {
  let loaded = false;
  let consent: AnalyticsConsent | null = null;
  const recorded = new Set<string>();
  const allowed = () => /^G-[A-Z0-9]+$/.test(id) &&
    ["parasens.com", "www.parasens.com"].includes(win.location.hostname) && win.location.pathname === "/";
  const disable = (value: boolean) => {
    (win as unknown as Record<string, unknown>)[`ga-disable-${id}`] = value;
  };
  const readConsent = (): AnalyticsConsent | null => {
    try {
      const saved = JSON.parse(win.localStorage.getItem(CONSENT_KEY) ?? "null");
      if (saved?.expiresAt > now() && ["granted", "denied"].includes(saved.value)) return saved.value;
    } catch { /* Storage is optional; analytics stays off without a choice. */ }
    return null;
  };
  const clearCookies = () => {
    for (const cookie of doc.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ["", `; domain=${win.location.hostname}`, "; domain=.parasens.com"]) {
        doc.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
      }
    }
  };
  const safeReferrer = () => {
    try { return doc.referrer ? new URL(doc.referrer).origin + "/" : ""; }
    catch { return ""; }
  };
  const start = () => {
    consent = readConsent();
    if (!allowed() || consent !== "granted") { disable(true); return; }
    if (loaded) { disable(false); return; }
    loaded = true;
    disable(false);
    win.dataLayer = win.dataLayer || [];
    win.gtag = function () { win.dataLayer!.push(arguments); };
    win.gtag("consent", "default", {
      analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    });
    win.gtag("js", new Date(now()));
    win.gtag("set", "ads_data_redaction", true);
    win.gtag("config", id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: "none",
      cookie_expires: 60 * 60 * 24 * 180,
      page_location: "https://parasens.com/",
      page_referrer: safeReferrer(),
      page_title: "PARASENS | Mood Music Management",
    });
    win.gtag("event", "page_view", { send_to: id });
    const script = doc.createElement("script");
    script.id = "parasens-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    doc.head.appendChild(script);
  };
  const choose = (value: AnalyticsConsent) => {
    consent = value;
    try { win.localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, expiresAt: now() + CONSENT_LIFETIME })); }
    catch { return; } // A blocked consent store must not accidentally enable tracking.
    if (value === "granted") start();
    else {
      disable(true);
      clearCookies();
      // Unload the tag, including any timers, after withdrawing consent.
      if (loaded) win.location.reload();
    }
  };
  const syncConsent = () => {
    const next = readConsent();
    if (loaded && next !== "granted") {
      disable(true);
      clearCookies();
      win.location.reload();
    } else if (next === "granted") start();
    consent = next;
  };
  const lead = (kind: string, requestId: string) => {
    if (!allowed() || !loaded || consent !== "granted" || readConsent() !== "granted") return;
    if (!["music", "message"].includes(kind) || recorded.has(requestId)) return;
    recorded.add(requestId);
    // The local request ID only deduplicates; it is not sent to Google.
    win.gtag?.("event", "generate_lead", {
      send_to: id,
      form_type: kind === "music" ? "music_submission" : "enquiry",
    });
  };
  const stop = () => { disable(true); };
  return { start, stop, choose, readConsent, syncConsent, lead, allowed };
}
