export type PortalEmailLink = { tokenHash: string; type: "email" | "invite" };

export const parsePortalEmailLink = (hash: string): PortalEmailLink | null => {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  if (params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1) return null;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash || !/^[a-zA-Z0-9_-]{20,512}$/.test(tokenHash) || (type !== "email" && type !== "invite")) return null;
  return { tokenHash, type };
};

export const isHiddenInvitationError = (code?: string) =>
  code === "otp_disabled" || code === "user_not_found" || code === "signup_disabled";
