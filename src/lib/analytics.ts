import { createAnalytics } from "./analytics/controller";

// Public measurement ID, not a credential. Only the production homepage runs it.
export const MEASUREMENT_ID = "G-D5WMC49KG3";
export const analytics = typeof window === "undefined" ? undefined : createAnalytics({
  id: MEASUREMENT_ID,
  win: window,
  doc: document,
});
export function trackSuccessfulSubmission(kind: string, requestId: string) {
  // Analytics must never prevent an accepted form from displaying success.
  try { analytics?.lead(kind, requestId); } catch { /* Optional measurement. */ }
}
