import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";
import { createFileHandler } from "./handler.ts";
import { dropboxClient, verifyDropboxFile } from "./dropbox.ts";
import { releaseWorkbook, type ExportData } from "../_shared/release-workbook.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origin = Deno.env.get("PORTAL_ORIGIN") || "https://development.parasens-ambient-soundscape.pages.dev";
const config = { appKey: Deno.env.get("DROPBOX_APP_KEY") || "", appSecret: Deno.env.get("DROPBOX_APP_SECRET") || "", refreshToken: Deno.env.get("DROPBOX_REFRESH_TOKEN") || "", expectedEmail: Deno.env.get("DROPBOX_ACCOUNT_EMAIL") || "" };
const configured = Object.values(config).every(Boolean);
const enabled = Deno.env.get("PORTAL_UPLOAD_PROVIDER") === "dropbox";
const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const userClient = (authorization: string) => createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
  global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
});
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function requireValue<T>(value: { data: T; error: { message: string } | null }): T {
  if (value.error) throw new Error(value.error.message);
  return value.data;
}

Deno.serve(async (request) => {
  // Request-scoped auth and Dropbox token; never reuse one user's session for another.
  let userId = "", worker = false;
  let client: ReturnType<typeof userClient>;
  const dropbox = dropboxClient(config);
  const assertRelease = async (id: unknown, edit = false) => {
    if (!uuid(id) || !requireValue(await client.rpc(edit ? "portal_can_edit" : "portal_can_read", { p_id: id }))) throw new Error("Release access required.");
  };
  async function syncRelease(releaseId: string) {
    const lease = crypto.randomUUID();
    const claimed = requireValue(await service.rpc("portal_claim_workbook", { p_release: releaseId, p_lease: lease }));
    if (!claimed?.length) return { pending: true };
    const job = claimed[0];
    try {
      const data = requireValue(await service.rpc("portal_export_data", { p_release: releaseId, p_private: false })) as ExportData;
      const r = data.releases[0];
      if (!r) throw new Error("Release no longer exists.");
      // A workbook accompanies each uploader's folder for shared submissions.
      let folders = requireValue(await service.from("portal_dropbox_folders").select("path").eq("release_id", releaseId));
      if (!folders.length) {
        const path = requireValue(await service.rpc("portal_dropbox_folder", { p_release: releaseId, p_user: r.created_by }));
        folders = [{ path }];
      }
      const bytes = await releaseWorkbook(data, false);
      for (const folder of folders) await dropbox.workbook(`${folder.path}/Release info.xlsx`, bytes);
      requireValue(await service.rpc("portal_finish_workbook", { p_release: releaseId, p_lease: lease, p_version: job.version }));
      return { synced: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workbook update failed. Please retry.";
      await service.rpc("portal_finish_workbook", { p_release: releaseId, p_lease: lease, p_version: job.version, p_error: message });
      throw new Error(message);
    }
  }
  return createFileHandler({
    origin,
    authorize: async (req) => {
      const header = req.headers.get("Authorization") || "";
      const workerSecret = Deno.env.get("PORTAL_WORKBOOK_SECRET");
      if (workerSecret && header === `Bearer ${workerSecret}`) { worker = true; return true; }
      if (!header.startsWith("Bearer ")) return false;
      client = userClient(header);
      const { data, error } = await client.auth.getUser(header.slice(7));
      if (error || !data.user?.email_confirmed_at) return false;
      userId = data.user.id;
      return true;
    },
    dispatch: async (body) => {
      if (worker && body.action !== "drain") throw new Error("Worker action not allowed.");
      if (body.action === "status") {
        const admin = Boolean(requireValue(await client.rpc("music_admin_role")));
        if (admin && configured) await dropbox.verify();
        return { configured, provider: enabled ? "dropbox" : "supabase", account: admin ? config.expectedEmail : undefined };
      }
      if (!configured) throw new Error("Dropbox is not connected yet. An administrator needs to complete the connection.");
      if (body.action === "drain") {
        if (!worker) throw new Error("Worker access required.");
        const jobs = requireValue(await service.rpc("portal_pending_workbooks"));
        let synced = 0, failed = 0;
        for (const releaseId of jobs) {
          try { await syncRelease(releaseId); synced++; } catch { failed++; }
        }
        return { synced, failed };
      }
      if (body.action === "prepare") {
        if (!enabled) throw new Error("Dropbox uploads are not enabled yet.");
        await assertRelease(body.releaseId, true);
        if (typeof body.name !== "string" || body.name.length > 255 || !Number.isInteger(body.size) || Number(body.size) <= 0 || Number(body.size) > 52428800 || !["stereo", "stems", "artwork"].includes(String(body.kind)) || (body.trackId !== null && !uuid(body.trackId))) throw new Error("Invalid file. The limit is 50 MB per file.");
        // Verify the destination before reserving a database row.
        await dropbox.verify();
        const file = requireValue(await client.rpc("portal_prepare_dropbox_file", { p_release: body.releaseId, p_track: body.trackId, p_kind: body.kind, p_name: body.name, p_size: body.size, p_mime: typeof body.mime === "string" ? body.mime : "application/octet-stream" }));
        try { return { file, ...(await dropbox.uploadLink(file.path)) }; }
        catch (error) { await client.rpc("portal_remove_file", { p_id: file.id }); throw error; }
      }
      if (body.action === "sync") { await assertRelease(body.releaseId); return syncRelease(String(body.releaseId)); }
      if (!uuid(body.fileId)) throw new Error("Invalid file reference.");
      const file = requireValue(await client.from("portal_files").select("*").eq("id", body.fileId).single());
      if (!file || file.provider !== "dropbox") throw new Error("File not found.");
      if (body.action === "finish") {
        await assertRelease(file.release_id, true);
        if (file.uploaded_by !== userId) throw new Error("Only the uploading account can finish this upload.");
        const metadata = await dropbox.metadata(file.path);
        verifyDropboxFile(file, metadata);
        requireValue(await service.rpc("portal_finish_dropbox_file", { p_id: file.id, p_user: userId, p_dropbox_id: metadata.id, p_size: metadata.size, p_web_root: Deno.env.get("DROPBOX_WEB_ROOT") || "" }));
        return { uploaded: true };
      }
      if (!file.uploaded || !file.dropbox_id) throw new Error("The upload is not complete.");
      await assertRelease(file.release_id);
      return dropbox.downloadLink(file.dropbox_id);
    },
  })(request);
});
