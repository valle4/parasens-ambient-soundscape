import { musicClient } from "@/lib/music/api";
import type { ExportData } from "../../../supabase/functions/_shared/release-workbook";

export async function exportSubmissions(status = "all", artist?: string, release?: string) {
  const { data, error } = await musicClient().rpc("portal_export_data", {
    p_status: status, p_artist: artist || null, p_release: release || null, p_private: true,
  });
  if (error) throw new Error(error.message);
  const { releaseWorkbook } = await import("../../../supabase/functions/_shared/release-workbook");
  const bytes = await releaseWorkbook(data as ExportData, true);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `Parasens-${release ? "release" : status === "all" ? "all-submissions" : status}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
