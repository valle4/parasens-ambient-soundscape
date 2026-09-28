import { musicClient } from "@/lib/music/api";

export const dropboxUploadsEnabled = import.meta.env.VITE_PORTAL_DROPBOX_ENABLED === "true";
export async function portalFiles<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await musicClient().functions.invoke("portal-files", { body });
  if (error) {
    const payload = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    throw new Error(payload?.error || "The file service could not be reached. Please retry.");
  }
  return data as T;
}
export async function syncReleaseWorkbook(releaseId: string) {
  if (dropboxUploadsEnabled) await portalFiles({ action: "sync", releaseId });
}
