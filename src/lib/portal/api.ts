import { musicClient, musicRpc } from "@/lib/music/api";
import type { Category } from "@/lib/music/catalogue";
import { dropboxUploadsEnabled, portalFiles, syncReleaseWorkbook } from "./files";
export type ReleaseStatus =
  | "draft"
  | "new"
  | "in_review"
  | "accepted"
  | "declined"
  | "delivered";
export const statusLabels: Record<ReleaseStatus, string> = {
  draft: "Draft",
  new: "New",
  in_review: "In Review",
  accepted: "Accepted",
  declined: "Declined",
  delivered: "Delivered",
};
export type TrackDraft = {
  id: string;
  title: string;
  composers: string;
  notes: string;
  audioDelivery: "" | "stereo" | "stems" | "both";
  stereoStatus: "" | "rough" | "mixed" | "mastered";
};
export type ReleaseContent = {
  releaseTitle: string;
  releaseType: "Single" | "EP" | "Album";
  parasensChoosesTitle: boolean;
  parasensChoosesArtist: boolean;
  label: string;
  genre: string;
  playlistBrief: string;
  generalNotes: string;
  artworkInspiration: string;
  tracks: TrackDraft[];
};
export type Release = {
  id: string;
  artist_id: string | null;
  suggested_artist: string;
  created_by: string;
  title: string;
  status: ReleaseStatus;
  awaiting_changes: boolean;
  content: ReleaseContent;
  revision: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  uploader_name?: string;
  uploader_email?: string;
};
export type Artist = { id: string; name: string; label_id: string | null };
export type Account = {
  email: string;
  display_name: string;
  user_id: string | null;
  invited_at: string | null;
  invitation_status: string;
};
export type PortalFile = {
  id: string;
  release_id: string;
  track_id: string | null;
  kind: "stereo" | "stems" | "artwork";
  name: string;
  path: string;
  size: number;
  mime: string;
  uploaded: boolean;
  provider?: "supabase" | "dropbox";
  uploader_email?: string;
  uploader_name?: string;
};
export type Message = {
  id: string;
  body: string;
  author_role?: string;
  created_at: string;
};
export type ReviewEvent = {
  id: string;
  action: string;
  message: string;
  created_at: string;
};
export type Notification = {
  id: string;
  state: string;
  error: string | null;
  recipient: string;
};
export async function portalRpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
  const result = await musicRpc<T>(name, args);
  const mutations = ["portal_save_release", "portal_submit_release", "portal_review", "portal_approve_artist", "portal_add_message"];
  const releaseId = args?.p_release || (["portal_save_release", "portal_submit_release", "portal_review"].includes(name) ? args?.p_id : undefined);
  if (mutations.includes(name) && typeof releaseId === "string") {
    // Durable database jobs survive a closed browser or failed immediate attempt.
    void syncReleaseWorkbook(releaseId).catch(() => undefined);
  }
  return result;
}
export async function rows<T>(table: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = musicClient()
      .from(table)
      .select("*")
      .order(
        table === "portal_accounts"
          ? "email"
          : table === "portal_artist_members"
            ? "account_email"
            : table === "portal_artist_genres"
              ? "artist_id"
              : "id",
      );
    if (table === "portal_artist_members") query = query.order("artist_id");
    if (table === "portal_artist_genres") query = query.order("category_id");
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    result.push(...(data as T[]));
    if (data.length < 500) return result;
  }
}
export async function artistDirectory() {
  const [artists, labels, genres, links] = await Promise.all([
    rows<Artist>("portal_artists"),
    rows<{ id: string; name: string }>("portal_labels"),
    rows<Category>("music_categories"),
    rows<{ artist_id: string; category_id: string }>("portal_artist_genres"),
  ]);
  return {
    artists: artists.sort((a, b) => a.name.localeCompare(b.name)),
    labels,
    genres,
    links,
  };
}
export async function releaseList(
  status: string,
  page: number,
  artist?: string,
) {
  let query = musicClient()
    .from("portal_releases")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (status === "pending") query = query.in("status", ["new", "in_review"]);
  else if (status === "changes") query = query.eq("awaiting_changes", true);
  else if (status !== "all") query = query.eq("status", status);
  if (artist) query = query.eq("artist_id", artist);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data as Release[], count: count ?? 0 };
}
export async function releaseById(id: string) {
  const { data, error } = await musicClient()
    .from("portal_releases")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Release;
}
export async function releaseFiles(id: string) {
  const { data, error } = await musicClient()
    .from("portal_files")
    .select("*")
    .eq("release_id", id)
    .order("created_at");
  if (error) throw error;
  return data as PortalFile[];
}
export async function releaseDiscussion(id: string, admin: boolean) {
  const query = async <T>(table: string) => {
    const { data, error } = await musicClient()
      .from(table)
      .select("*")
      .eq("release_id", id)
      .order(table === "portal_notifications" ? "id" : "created_at")
      .limit(500);
    if (error) throw error;
    return data as T[];
  };
  const [messages, events, notes, notifications] = await Promise.all([
    query<Message>("portal_messages"),
    query<ReviewEvent>("portal_events"),
    admin ? query<Message>("portal_admin_notes") : Promise.resolve([]),
    admin ? query<Notification>("portal_notifications") : Promise.resolve([]),
  ]);
  return { messages, events, notes, notifications };
}
export async function portalAdmin(body: Record<string, unknown>) {
  const { data, error } = await musicClient().functions.invoke("portal-admin", {
    body,
  });
  if (error) {
    const payload =
      error.context instanceof Response
        ? await error.context.json().catch(() => null)
        : null;
    throw new Error(
      payload?.error ??
        "The server action could not be completed. Please retry.",
    );
  }
  return data as {
    message: string;
    failed?: number;
    sent?: number;
    configured?: boolean;
  };
}
export async function uploadReleaseFile(
  releaseId: string,
  trackId: string | null,
  kind: PortalFile["kind"],
  file: File,
) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(`${file.name}: the current upload limit is 50 MB per file.`);
  }
  if (dropboxUploadsEnabled) {
    const reservation = await portalFiles<{ file: PortalFile; link: string }>({ action: "prepare", releaseId, trackId, kind, name: file.name, size: file.size, mime: file.type });
    // An interrupted response may follow a successful upload; preserve its reservation.
    try {
      const response = await fetch(reservation.link, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error("Dropbox did not confirm the upload.");
      await portalFiles({ action: "finish", fileId: reservation.file.id });
    } catch {
      throw new Error(`${file.name}: upload confirmation is incomplete. Use Retry confirmation below; if the file did not arrive, remove the entry and upload again.`);
    }
    void syncReleaseWorkbook(releaseId).catch(() => undefined);
    return reservation.file;
  }
  const reservation = await portalRpc<PortalFile>("portal_prepare_file", {
    p_release: releaseId,
    p_track: trackId,
    p_kind: kind,
    p_name: file.name,
    p_size: file.size,
    p_mime: file.type || "application/octet-stream",
  });
  const { error } = await musicClient()
    .storage.from("portal-releases")
    .upload(reservation.path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    await portalRpc("portal_remove_file", { p_id: reservation.id }).catch(
      () => undefined,
    );
    throw new Error(
      `${file.name}: ${error.message}. The file was not saved; try uploading it again.`,
    );
  }
  await portalRpc("portal_finish_file", { p_id: reservation.id });
  return reservation;
}
