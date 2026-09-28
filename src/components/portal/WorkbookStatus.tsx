import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { musicClient } from "@/lib/music/api";
import { dropboxUploadsEnabled, syncReleaseWorkbook } from "@/lib/portal/files";
import { Button } from "@/components/ui/button";

export default function WorkbookStatus({ releaseId }: { releaseId: string }) {
  const [busy, setBusy] = useState(false);
  const job = useQuery({
    queryKey: ["portal-workbook", releaseId], enabled: dropboxUploadsEnabled,
    queryFn: async () => {
      const { data, error } = await musicClient().from("portal_workbook_jobs").select("version,synced_version,synced_at,error").eq("release_id", releaseId).maybeSingle();
      if (error) throw error;
      return data;
    }, refetchInterval: 15000,
  });
  if (!dropboxUploadsEnabled) return null;
  const pending = job.data && job.data.version > job.data.synced_version;
  return <div className="space-y-2 border border-border p-4 text-xs" aria-live="polite">
    <p>{job.isPending ? "Checking Dropbox workbook…" : job.isError ? "Could not check the Dropbox workbook." : job.data?.error ? "Dropbox workbook needs attention." : pending ? "Dropbox workbook update pending." : job.data?.synced_at ? `Dropbox workbook updated ${new Date(job.data.synced_at).toLocaleString()}` : "Dropbox workbook not created yet."}</p>
    {job.data?.error && <p className="text-muted-foreground">{job.data.error}</p>}
    {(pending || job.isError || !job.data?.synced_at) && <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await syncReleaseWorkbook(releaseId); await job.refetch(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Could not update the workbook."); }
      finally { setBusy(false); }
    }}>{busy ? "Updating…" : "Retry workbook update"}</Button>}
  </div>;
}
